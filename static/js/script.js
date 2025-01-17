document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tabs button");
    const tabContents = document.querySelectorAll(".tab-content");
    const suggestRouteForm = document.getElementById("suggestRouteForm");
    const routesContainer = document.getElementById("routesContainer");

    let lastSuggestedRoute = null; // Para armazenar a última rota sugerida

    // Tab Switching Logic
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Suggest Route Form Submission
    suggestRouteForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("name").value;
        const origin = document.getElementById("origin").value;
        const destination = document.getElementById("destination").value;

        const newRoute = { name, origin, destination };

        try {
            // Save to SQLite via backend
            const response = await fetch("/suggest-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRoute),
            });

            const data = await response.json();
            if (response.ok) {
                // Store the last suggested route for highlighting
                lastSuggestedRoute = newRoute;

                // Save to LocalStorage
                saveRouteToLocalStorage(newRoute);

                // Refresh Routes and Switch to Suggested Routes Tab
                fetchRoutes();
                switchToTab("suggestedRoutesTab");
                suggestRouteForm.reset();
            } else {
                console.error(data.error);
            }
        } catch (error) {
            console.error("Erro ao sugerir rota:", error);
        }
    });

    // Save Route to LocalStorage
    function saveRouteToLocalStorage(route) {
        const storedRoutes = JSON.parse(localStorage.getItem("routes")) || [];
        storedRoutes.push(route);
        localStorage.setItem("routes", JSON.stringify(storedRoutes));
    }

    // Fetch Suggested Routes
    async function fetchRoutes() {
        try {
            const response = await fetch("/routes");
            const routes = await response.json();

            // Save routes to LocalStorage for instant client-side updates
            localStorage.setItem("routes", JSON.stringify(routes));

            displayRoutes(routes);
        } catch (error) {
            console.error("Erro ao buscar rotas:", error);
        }
    }

    // Display Routes in UI
    function displayRoutes(routes) {
        routesContainer.innerHTML = routes.map(route => `
            <div class="route ${isLastSuggestedRoute(route) ? 'highlight' : ''}">
                <p><strong>${route.name}</strong></p>
                <p>${route.origin} → ${route.destination}</p>
                <button class="dispatch-btn" data-origin="${route.origin}" data-destination="${route.destination}">
                    Dispatch para Simbrief
                </button>
            </div>
        `).join("");

        // Add Event Listeners to Dispatch Buttons
        document.querySelectorAll(".dispatch-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const origin = button.dataset.origin;
                const destination = button.dataset.destination;
                dispatchToSimbrief(origin, destination);
            });
        });
    }

    // Check if the route is the last suggested route
    function isLastSuggestedRoute(route) {
        return lastSuggestedRoute &&
               route.name === lastSuggestedRoute.name &&
               route.origin === lastSuggestedRoute.origin &&
               route.destination === lastSuggestedRoute.destination;
    }

    // Switch to a specific tab
    function switchToTab(tabId) {
        tabs.forEach(btn => btn.classList.remove("active"));
        tabContents.forEach(content => content.classList.remove("active"));

        document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");
        document.getElementById(tabId).classList.add("active");
    }

    // Dispatch to Simbrief
    function dispatchToSimbrief(origin, destination) {
        const simbriefUrl = `https://www.simbrief.com/system/dispatch.php?orig=${origin}&dest=${destination}`;
        window.open(simbriefUrl, "_blank");
    }

    // Initialize
    fetchRoutes();
});
