document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tabs button");
    const tabContents = document.querySelectorAll(".tab-content");
    const suggestRouteForm = document.getElementById("suggestRouteForm");
    const routesContainer = document.getElementById("routesContainer");
    const adminLoginForm = document.getElementById("adminLoginForm");
    const adminPanel = document.getElementById("adminPanel");
    const adminRoutesTable = document.getElementById("adminRoutesTable");
    const adminPanelButton = document.getElementById("adminPanelButton");

    let lastSuggestedRoute = null;
    let isAdminLoggedIn = false;

    // Alternar abas
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Submissão do formulário de sugestão de rota
    suggestRouteForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("name").value;
        const origin = document.getElementById("origin").value;
        const destination = document.getElementById("destination").value;

        const newRoute = { name, origin, destination };

        try {
            const response = await fetch("/suggest-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRoute),
            });

            const data = await response.json();
            if (response.ok) {
                lastSuggestedRoute = newRoute;
                saveRouteToLocalStorage(newRoute);
                fetchRoutes();
                suggestRouteForm.reset();
            } else {
                console.error(data.error);
            }
        } catch (error) {
            console.error("Erro ao sugerir rota:", error);
        }
    });

    // Salvar rota no LocalStorage
    function saveRouteToLocalStorage(route) {
        const storedRoutes = JSON.parse(localStorage.getItem("routes")) || [];
        storedRoutes.push(route);
        localStorage.setItem("routes", JSON.stringify(storedRoutes));
    }

    // Buscar rotas
    async function fetchRoutes() {
        try {
            const response = await fetch("/routes");
            const routes = await response.json();
            localStorage.setItem("routes", JSON.stringify(routes));
            displayRoutes(routes);
            if (isAdminLoggedIn) {
                displayAdminRoutes(routes);
            }
        } catch (error) {
            console.error("Erro ao buscar rotas:", error);
        }
    }

    // Exibir rotas no container
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

        document.querySelectorAll(".dispatch-btn").forEach(button => {
            button.addEventListener("click", () => {
                const origin = button.dataset.origin;
                const destination = button.dataset.destination;
                dispatchToSimbrief(origin, destination);
            });
        });
    }

    // Exibir rotas no painel de administração
    function displayAdminRoutes(routes) {
        adminRoutesTable.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Ações</th>
            </tr>
            ${routes.map(route => `
                <tr>
                    <td>${route.id}</td>
                    <td>${route.name}</td>
                    <td>${route.origin}</td>
                    <td>${route.destination}</td>
                    <td>
                        <button class="delete-btn" data-id="${route.id}">Deletar</button>
                    </td>
                </tr>
            `).join("")}
        `;

        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const routeId = button.dataset.id;
                await deleteRoute(routeId);
                fetchRoutes();
            });
        });
    }

    // Deletar rota
    async function deleteRoute(routeId) {
        try {
            const response = await fetch(`/delete-route/${routeId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                console.error("Erro ao deletar rota.");
            }
        } catch (error) {
            console.error("Erro ao deletar rota:", error);
        }
    }

    // Verificar última rota sugerida
    function isLastSuggestedRoute(route) {
        return lastSuggestedRoute &&
               route.name === lastSuggestedRoute.name &&
               route.origin === lastSuggestedRoute.origin &&
               route.destination === lastSuggestedRoute.destination;
    }

    // Alternar para o painel de administração
    adminLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("adminUsername").value;
        const password = document.getElementById("adminPassword").value;

        if (username === "MeiaAviaoAdminUser" && password === "XbdvCcpdJvVVPRUlHadw") {
            isAdminLoggedIn = true;
            document.getElementById("adminLogin").classList.remove("active");
            adminPanel.classList.add("active");
            fetchRoutes();
        } else {
            alert("Credenciais inválidas.");
        }
    });

    // Redirect to admin panel
    adminPanelButton.addEventListener("click", () => {
        window.location.href = "/admin-panel";
    });

    // Dispatch para Simbrief
    function dispatchToSimbrief(origin, destination) {
        const simbriefUrl = `https://www.simbrief.com/system/dispatch.php?orig=${origin}&dest=${destination}`;
        window.open(simbriefUrl, "_blank");
    }

    fetchRoutes();
});
