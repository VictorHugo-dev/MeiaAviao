document.addEventListener("DOMContentLoaded", () => {
    const Config = {
        DOM: {
            tabs: document.querySelectorAll(".tabs button"),
            tabContents: document.querySelectorAll(".tab-content"),
            forms: {
                suggestRoute: document.getElementById("suggestRouteForm")
            },
            containers: {
                routes: document.getElementById("routesContainer")
            },
            icaoInputs: document.querySelectorAll('input[pattern="^[A-Z]{4}$"]')
        },
        Selectors: {
            dispatchButton: ".dispatch-btn"
        },
        StorageKeys: {
            routes: "routes"
        }
    };

    const Tabs = {
        init: function() {
            Config.DOM.tabs.forEach(tab => {
                tab.addEventListener("click", () => this.switchTab(tab));
            });
        },

        switchTab: function(activeTab) {
            Config.DOM.tabs.forEach(btn => btn.classList.remove("active"));
            Config.DOM.tabContents.forEach(content => content.classList.remove("active"));
            
            activeTab.classList.add("active");
            document.getElementById(activeTab.dataset.tab).classList.add("active");
        }
    };

    const ICAOHandler = {
        init: function() {
            Config.DOM.icaoInputs.forEach(input => {
                input.addEventListener("input", function(event) {
                    const originalValue = event.target.value;
                    const cursorPosition = event.target.selectionStart;
                    
                    const newValue = originalValue
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .substring(0, 4);

                    event.target.value = newValue;
                    event.target.setSelectionRange(cursorPosition, cursorPosition);
                });

                input.addEventListener("blur", function(event) {
                    if (!this.checkValidity()) {
                        this.reportValidity();
                    }
                });
            });
        },

        validate: function(code) {
            return /^[A-Z]{4}$/.test(code);
        }
    };

    const APIService = {
        getCSRFToken: function() {
            return document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_token='))
                ?.split('=')[1] || '';
        },

        get: async function(endpoint) {
            const response = await fetch(endpoint, {
                credentials: "include"
            });
            return response.ok ? response.json() : Promise.reject(response);
        },

        post: async function(endpoint, data) {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-CSRFToken": this.getCSRFToken()
                },
                body: JSON.stringify(data),
                credentials: "include"
            });
            return response.ok ? response.json() : Promise.reject(response);
        }
    };

    const RouteManager = {
        lastSuggestedRoute: null,

        submitRoute: async function(formData) {
            try {
                const response = await APIService.post("/suggest-route", formData);
                this.lastSuggestedRoute = formData;
                this.persistRoute(formData);
                await this.refreshRoutes();
                return true;
            } catch (error) {
                console.error("Erro ao enviar rota:", error);
                alert("Erro ao enviar sugestão. Verifique os dados e tente novamente.");
                return false;
            }
        },

        persistRoute: function(route) {
            const storedRoutes = this.getStoredRoutes();
            storedRoutes.push(route);
            localStorage.setItem(Config.StorageKeys.routes, JSON.stringify(storedRoutes));
        },

        getStoredRoutes: function() {
            return JSON.parse(localStorage.getItem(Config.StorageKeys.routes)) || [];
        },

        refreshRoutes: async function() {
            try {
                const routes = await APIService.get("/routes");
                localStorage.setItem(Config.StorageKeys.routes, JSON.stringify(routes));
                RouteRenderer.renderUserRoutes(routes);
            } catch (error) {
                console.error("Erro ao atualizar rotas:", error);
            }
        }
    };

    const RouteRenderer = {
        renderUserRoutes: function(routes) {
            Config.DOM.containers.routes.innerHTML = routes
                .map(route => this.createRouteCard(route))
                .join("");
            this.bindDispatchEvents();
        },

        createRouteCard: function(route) {
            const isRecent = RouteManager.lastSuggestedRoute?.name === route.name;
            return `
                <div class="route ${isRecent ? "highlight" : ""}">
                    <p><strong>${route.name}</strong></p>
                    <p>${route.origin} → ${route.destination}</p>
                    <button class="dispatch-btn" 
                            data-origin="${route.origin}" 
                            data-destination="${route.destination}">
                        Dispatch para Simbrief
                    </button>
                </div>
            `;
        },

        bindDispatchEvents: function() {
            document.querySelectorAll(Config.Selectors.dispatchButton).forEach(button => {
                button.addEventListener("click", () => {
                    const origin = button.dataset.origin;
                    const destination = button.dataset.destination;
                    this.handleDispatch(origin, destination);
                });
            });
        },

        handleDispatch: function(origin, destination) {
            const simbriefURL = `https://www.simbrief.com/system/dispatch.php?airline=&fltnum=3061&orig=${origin}&dest=${destination}`;
            window.open(simbriefURL, '_blank');
        }
    };

    const EventHandlers = {
        init: function() {
            Config.DOM.forms.suggestRoute.addEventListener("submit", (e) => this.handleRouteSubmission(e));
            ICAOHandler.init();
        },

        handleRouteSubmission: async function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById("name");
            const originInput = document.getElementById("origin");
            const destinationInput = document.getElementById("destination");

            if (!this.validateForm(nameInput, originInput, destinationInput)) return;

            const formData = {
                name: nameInput.value.trim(),
                origin: originInput.value,
                destination: destinationInput.value
            };
            
            if (await RouteManager.submitRoute(formData)) {
                e.target.reset();
            }
        },

        validateForm: function(nameInput, originInput, destinationInput) {
            let isValid = true;

            if (nameInput.value.trim().length < 3) {
                alert("Nome deve ter pelo menos 3 caracteres");
                nameInput.focus();
                isValid = false;
            }

            if (!ICAOHandler.validate(originInput.value)) {
                originInput.focus();
                alert("Código ICAO de origem inválido!\nDeve conter exatamente 4 letras");
                isValid = false;
            }

            if (!ICAOHandler.validate(destinationInput.value)) {
                destinationInput.focus();
                alert("Código ICAO de destino inválido!\nDeve conter exatamente 4 letras");
                isValid = false;
            }

            return isValid;
        }
    };

    const Changelog = {
        init: function() {
            if (!localStorage.getItem('hideChangelog')) {
                this.showChangelog();
            }
            this.bindEvents();
        },

        showChangelog: function() {
            document.getElementById('changelogOverlay').style.display = 'flex';
        },

        hideChangelog: function() {
            document.getElementById('changelogOverlay').style.display = 'none';
        },

        bindEvents: function() {
            document.getElementById('closeChangelog').addEventListener('click', () => this.hideChangelog());
            
            document.getElementById('dontShowAgain').addEventListener('click', () => {
                localStorage.setItem('hideChangelog', 'true');
                this.hideChangelog();
            });
        }
    };

    const App = {
        init: function() {
            Tabs.init();
            EventHandlers.init();
            RouteManager.refreshRoutes();
            Changelog.init();
        }
    };

    App.init();
});
