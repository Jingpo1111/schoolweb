# School Course Portal

This project is now a Node.js app with:

- user registration
- secure login with hashed passwords
- server-side sessions
- a database-backed user store
- a protected dashboard that is not exposed before login

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

Open `http://localhost:3000`.

## Database

- Local development uses SQLite automatically and creates `data/schoolweb.sqlite`.
- Public hosting can use an online PostgreSQL database by setting `DATABASE_URL`.
- If your PostgreSQL provider requires SSL, also set `DB_SSL=true`.

## Environment variables

```env
PORT=3000
SESSION_SECRET=change-this-to-a-long-random-secret
DATABASE_URL=
DB_SSL=false
```

## Public deployment

Deploy this app to any Node.js host that supports environment variables.

Required in production:

- `SESSION_SECRET`
- `DATABASE_URL` for your managed PostgreSQL database

The frontend and backend are served by the same Node server, so no extra API configuration is needed after deployment.
