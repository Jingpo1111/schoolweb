const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Sequelize, DataTypes } = require("sequelize");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
require("dotenv").config();

const app = express();
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const usePostgres = Boolean(process.env.DATABASE_URL);
const port = Number(process.env.PORT || 3000);
const allowedAssets = new Set(["itc.png", "logo dormitory.png", "logo school.png"]);

fs.mkdirSync(dataDir, { recursive: true });

const sequelize = usePostgres
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions:
        process.env.DB_SSL === "true"
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: false
              }
            }
          : undefined
    })
  : new Sequelize({
      dialect: "sqlite",
      storage: path.join(dataDir, "schoolweb.sqlite"),
      logging: false
    });

const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    tableName: "users"
  }
);

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: "sessions",
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 7 * 24 * 60 * 60 * 1000
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "schoolweb-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production"
    }
  })
);

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username
  };
}

async function getCurrentUser(req) {
  if (!req.session.userId) {
    return null;
  }

  return User.findByPk(req.session.userId);
}

async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);

  if (!user) {
    res.status(401).send("Unauthorized");
    return;
  }

  req.user = user;
  next();
}

app.get("/styles.css", (req, res) => {
  res.sendFile(path.join(rootDir, "styles.css"));
});

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(rootDir, "script.js"));
});

app.get("/assets/:file", (req, res) => {
  const requestedFile = req.params.file;

  if (!allowedAssets.has(requestedFile)) {
    res.status(404).end();
    return;
  }

  res.sendFile(path.join(rootDir, requestedFile));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, database: usePostgres ? "postgres" : "sqlite" });
});

app.get("/api/session", async (req, res) => {
  const user = await getCurrentUser(req);

  if (!user) {
    res.status(401).json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true, user: sanitizeUser(user) });
});

app.post("/api/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || "");

  if (name.length < 2) {
    res.status(400).json({ message: "Name must be at least 2 characters." });
    return;
  }

  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    res.status(400).json({
      message: "Username must be 3-24 characters and use only letters, numbers, dot, dash, or underscore."
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters." });
    return;
  }

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    res.status(409).json({ message: "That username is already taken." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, username, passwordHash });

  req.session.userId = user.id;
  res.status(201).json({
    message: "Registration successful.",
    user: sanitizeUser(user)
  });
});

app.post("/api/login", async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || "");

  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required." });
    return;
  }

  const user = await User.findOne({ where: { username } });
  if (!user) {
    res.status(401).json({ message: "Invalid username or password." });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({ message: "Invalid username or password." });
    return;
  }

  req.session.userId = user.id;
  res.json({
    message: "Login successful.",
    user: sanitizeUser(user)
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.status(204).end();
  });
});

app.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  const fileName = user ? "index.html" : "login.html";
  res.sendFile(path.join(rootDir, fileName));
});

app.get("/login", async (req, res) => {
  const user = await getCurrentUser(req);
  res.redirect(user ? "/" : "/");
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  await sessionStore.sync();

  app.listen(port, () => {
    console.log(`Schoolweb server running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
