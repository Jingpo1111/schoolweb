async function sendJson(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response
        .json()
        .catch(() => ({ message: "Unexpected server response." }));

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

function setAuthMessage(message, type = "info") {
    const messageNode = document.getElementById("auth-message");
    if (!messageNode) {
        return;
    }

    messageNode.textContent = message;
    messageNode.dataset.state = type;
}

async function loadSessionUser() {
    const sessionUser = document.getElementById("session-user");
    if (!sessionUser) {
        return;
    }

    try {
        const response = await fetch("/api/session");
        if (!response.ok) {
            window.location.href = "/";
            return;
        }

        const data = await response.json();
        sessionUser.textContent = data.user.name;
    } catch (error) {
        window.location.href = "/";
    }
}

function wireSearch() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) {
        return;
    }

    const searchResultsContainer = document.getElementById("searchResults");
    const mainCategories = document.querySelector(".categories");
    const logoCenter = document.querySelector(".logo-center");
    const products = Array.from(document.querySelectorAll(".product-card"));

    function searchProducts() {
        const input = searchInput.value.toLowerCase().trim();
        searchResultsContainer.innerHTML = "";

        if (input.length === 0) {
            if (mainCategories) {
                mainCategories.style.display = "block";
            }

            if (logoCenter) {
                logoCenter.style.display = "block";
            }

            searchResultsContainer.style.display = "none";
            return;
        }

        if (mainCategories) {
            mainCategories.style.display = "none";
        }

        if (logoCenter) {
            logoCenter.style.display = "none";
        }

        searchResultsContainer.style.display = "grid";

        let matchCount = 0;

        products.forEach((product) => {
            const name = (product.getAttribute("data-name") || "").toLowerCase();

            if (name.includes(input)) {
                const clone = product.cloneNode(true);
                clone.style.display = "block";
                searchResultsContainer.appendChild(clone);
                matchCount += 1;
            }
        });

        if (matchCount === 0) {
            searchResultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No materials found for "<strong>${input}</strong>".</p>
                    <p>Try a subject name, "assignment", "slide", or "exam".</p>
                </div>
            `;
        }
    }

    searchInput.addEventListener("input", searchProducts);
}

function wireLogout() {
    const logoutButton = document.getElementById("logout");
    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", async () => {
        try {
            await fetch("/api/logout", { method: "POST" });
        } finally {
            window.location.href = "/";
        }
    });
}

function wireLogin() {
    const loginForm = document.getElementById("login-form");
    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;

        try {
            setAuthMessage("Checking your account...", "info");
            await sendJson("/api/login", { username, password });
            window.location.href = "/";
        } catch (error) {
            setAuthMessage(error.message, "error");
        }
    });
}

function wireRegister() {
    const registerForm = document.getElementById("register-form");
    if (!registerForm) {
        return;
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("register-name").value.trim();
        const username = document.getElementById("register-username").value.trim();
        const password = document.getElementById("register-password").value;
        const confirmPassword = document.getElementById("register-confirm-password").value;

        if (password !== confirmPassword) {
            setAuthMessage("Passwords do not match.", "error");
            return;
        }

        try {
            setAuthMessage("Creating your account...", "info");
            await sendJson("/api/register", { name, username, password });
            window.location.href = "/";
        } catch (error) {
            setAuthMessage(error.message, "error");
        }
    });
}

window.addEventListener("DOMContentLoaded", () => {
    wireLogin();
    wireRegister();
    wireLogout();
    wireSearch();
    loadSessionUser();
});
