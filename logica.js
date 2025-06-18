$(document).ready(function() {
    // Variables de estado
    let bankResources = 0;
    let totalResources = 0;
    let clients = [];
    let isSimulationRunning = false;
    let currentStep = 0;
    let safeSequence = [];
    let autoSimulationInterval = null;
    
    // Inicializar la interfaz de usuario
    function initUI() {
        totalResources = parseInt($("#total-resources").val()) || 10;
        bankResources = totalResources;
        const numClients = parseInt($("#num-clients").val()) || 5;
        
        // Generar clientes
        clients = [];
        for (let i = 0; i < numClients; i++) {
            // Datos aleatorios del cliente - el reclamo máximo está entre 1 y totalResources/2
            const maxClaim = Math.floor(Math.random() * (totalResources / 2)) + 1;
            // Asignado está entre 0 y maxClaim
            const allocated = Math.floor(Math.random() * Math.min(maxClaim, bankResources / 2));
            
            clients.push({
                id: i + 1,
                maxClaim: maxClaim,
                allocated: allocated,
                remainingNeed: maxClaim - allocated,
                completed: false,
                status: "waiting" // esperando, procesando, completado
            });
            
            // Actualizar recursos del banco
            bankResources -= allocated;
        }
        
        // Renderizar el estado inicial
        renderState();
        
        // Habilitar botones
        $("#step-simulation").prop("disabled", false);
        $("#auto-simulation").prop("disabled", false);
        
        // Registrar en el log
        log("Simulación inicializada con " + totalResources + " recursos y " + numClients + " clientes.");
        
        // Calcular y mostrar la secuencia segura si es posible
        calculateSafeSequence();
    }
    
    // Renderizar el estado actual
    function renderState() {
        // Mostrar recursos del banco
        const bankResourcesContainer = $("#bank-resources");
        bankResourcesContainer.empty();
        bankResourcesContainer.append(`<span>${bankResources} unidades disponibles:</span>`);
        
        for (let i = 0; i < bankResources; i++) {
            bankResourcesContainer.append(`<div class="resource">$</div>`);
        }
        
        // Mostrar clientes
        const clientsContainer = $("#clients-container");
        clientsContainer.empty();
        
        clients.forEach(client => {
            let statusClass = '';
            let statusText = '';
            
            if (client.status === "processing") {
                statusClass = 'processing';
                statusText = '<div class="status-indicator status-processing"></div> Procesando';
            } else if (client.status === "completed") {
                statusClass = 'safe';
                statusText = '<div class="status-indicator status-safe"></div> Completado';
            } else if (client.remainingNeed <= bankResources) {
                statusClass = 'safe';
                statusText = '<div class="status-indicator status-safe"></div> Seguro';
            } else {
                statusClass = 'unsafe';
                statusText = '<div class="status-indicator status-unsafe"></div> Inseguro';
            }
            
            const clientHTML = `
                <div class="client ${statusClass}" id="client-${client.id}" data-id="${client.id}">
                    <div class="client-title">Cliente ${client.id} ${statusText}</div>
                    <div class="client-info">
                        <div class="client-resources">
                            <span>Máximo:</span>
                            ${renderResources(client.maxClaim)}
                        </div>
                        <div class="client-resources">
                            <span>Asignado:</span>
                            ${renderResources(client.allocated)}
                        </div>
                        <div class="client-resources">
                            <span>Necesita:</span>
                            ${renderResources(client.remainingNeed)}
                        </div>
                    </div>
                </div>
            `;
            
            clientsContainer.append(clientHTML);
        });
    }
    
    // Función auxiliar para mostrar íconos de recursos
    function renderResources(count) {
        let result = `<span>${count} unidades</span>`;
        for (let i = 0; i < count; i++) {
            result += `<div class="resource">$</div>`;
        }
        return result;
    }
    
    // Calcular la secuencia segura usando el algoritmo del banquero
    function calculateSafeSequence() {
        // Crear una copia del estado actual
        const tempBankResources = bankResources;
        const tempClients = JSON.parse(JSON.stringify(clients));
        const unprocessedClients = tempClients.filter(client => !client.completed);
        
        safeSequence = [];
        let work = tempBankResources;
        let finish = Array(unprocessedClients.length).fill(false);
        
        // Bucle hasta que todos los clientes puedan completarse o no se pueda avanzar más
        let found;
        do {
            found = false;
            for (let i = 0; i < unprocessedClients.length; i++) {
                if (!finish[i] && unprocessedClients[i].remainingNeed <= work) {
                    // Procesar este cliente
                    work += unprocessedClients[i].allocated;
                    finish[i] = true;
                    safeSequence.push(unprocessedClients[i].id);
                    found = true;
                }
            }
        } while (found);
        
        // Verificar si todos los clientes pudieron completarse
        const allCompleted = finish.every(f => f);
        
        if (allCompleted) {
            log("Estado seguro detectado. Secuencia segura: " + safeSequence.join(" → "));
        } else {
            log("¡Estado inseguro! No se puede garantizar una secuencia segura para todos los clientes.");
            safeSequence = [];
        }
        
        return allCompleted;
    }
    
    // Simular un paso del algoritmo
    function simulateStep() {
        if (safeSequence.length === 0) {
            log("No hay secuencia segura para continuar. Intente reiniciar con diferentes parámetros.");
            return false;
        }
        
        if (currentStep >= safeSequence.length) {
            log("¡Simulación completada! Todos los clientes han sido atendidos.");
            stopAutoSimulation();
            return false;
        }
        
        const clientId = safeSequence[currentStep];
        const client = clients.find(c => c.id === clientId);
        
        // Marcar cliente como en proceso
        client.status = "processing";
        renderState();
        log(`Cliente ${clientId} está siendo procesado...`);
        
        // Simular que el cliente toma los recursos que necesita
        setTimeout(() => {
            // Animar transferencia de recursos desde el banco al cliente
            animateResourceTransfer("bank-resources", `client-${clientId}`, client.remainingNeed);
            
            // Actualizar estado del cliente y banco
            bankResources -= client.remainingNeed;
            client.allocated += client.remainingNeed;
            client.remainingNeed = 0;
            
            log(`Cliente ${clientId} recibió ${client.remainingNeed} recursos adicionales.`);
            
            // Simular que el cliente completa su trabajo
            setTimeout(() => {
                // Liberar todos los recursos de nuevo al banco
                animateResourceTransfer(`client-${clientId}`, "bank-resources", client.allocated);
                
                log(`Cliente ${clientId} completó su trabajo y liberó ${client.allocated} recursos.`);
                
                bankResources += client.allocated;
                client.allocated = 0;
                client.completed = true;
                client.status = "completed";
                
                // Pasar al siguiente paso
                currentStep++;
                renderState();
                
                // Continuar si la simulación automática está activada
                if (autoSimulationInterval !== null) {
                    if (currentStep >= safeSequence.length) {
                        stopAutoSimulation();
                        log("¡Simulación automática completada!");
                    }
                }
            }, 1500);
        }, 1000);
        
        return true;
    }
    
    // Animar transferencia de recursos entre elementos
    function animateResourceTransfer(fromId, toId, count) {
        const fromElement = document.getElementById(fromId);
        const toElement = document.getElementById(toId);
        
        if (!fromElement || !toElement || count <= 0) return;
        
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Crear tokens visuales de recursos
        for (let i = 0; i < Math.min(count, 5); i++) {
            const resourceToken = document.createElement('div');
            resourceToken.className = 'resource-transfer';
            document.body.appendChild(resourceToken);
            
            // Establecer posición inicial
            resourceToken.style.left = `${fromRect.left + 50 + Math.random() * 50}px`;
            resourceToken.style.top = `${fromRect.top + 20 + Math.random() * 20}px`;
            
            // Animar hacia la posición de destino
            setTimeout(() => {
                resourceToken.style.left = `${toRect.left + 50 + Math.random() * 50}px`;
                resourceToken.style.top = `${toRect.top + 20 + Math.random() * 20}px`;
                
                // Eliminar después de completar animación
                setTimeout(() => {
                    resourceToken.remove();
                }, 1000);
            }, 10);
        }
    }
    
    // Iniciar simulación automática
    function startAutoSimulation() {
        if (autoSimulationInterval !== null) return;
        
        autoSimulationInterval = setInterval(() => {
            if (!simulateStep()) {
                stopAutoSimulation();
            }
        }, 4000);
        
        log("Simulación automática iniciada.");
        $("#auto-simulation").text("Detener Auto");
    }
    
    // Detener simulación automática
    function stopAutoSimulation() {
        if (autoSimulationInterval !== null) {
            clearInterval(autoSimulationInterval);
            autoSimulationInterval = null;
            $("#auto-simulation").text("Simulación Automática");
            log("Simulación automática detenida.");
        }
    }
    
    // Reiniciar simulación
    function resetSimulation() {
        stopAutoSimulation();
        currentStep = 0;
        safeSequence = [];
        $("#log-area").empty();
        log("Simulación reiniciada. Configure los parámetros y presione 'Iniciar Simulación'.");
        
        // Deshabilitar botones
        $("#step-simulation").prop("disabled", true);
        $("#auto-simulation").prop("disabled", true);
    }
    
    // Añadir entrada al log
    function log(message) {
        const timestamp = new Date().toLocaleTimeString();
        $("#log-area").append(`<div class="log-entry">[${timestamp}] ${message}</div>`);
        
        // Desplazar hacia abajo
        const logArea = document.getElementById("log-area");
        logArea.scrollTop = logArea.scrollHeight;
    }
    
    // Manejadores de eventos
    $("#init-simulation").click(function() {
        resetSimulation();
        initUI();
    });
    
    $("#step-simulation").click(function() {
        simulateStep();
    });
    
    $("#auto-simulation").click(function() {
        if (autoSimulationInterval === null) {
            startAutoSimulation();
        } else {
            stopAutoSimulation();
        }
    });
    
    $("#reset-simulation").click(function() {
        resetSimulation();
    });
    
    // Inicializar al cargar
    resetSimulation();
});
