 $(document).ready(function() {
            // State variables
            let bankResources = 0;
            let totalResources = 0;
            let clients = [];
            let isSimulationRunning = false;
            let currentStep = 0;
            let safeSequence = [];
            let autoSimulationInterval = null;
            
            // Initialize UI
            function initUI() {
                totalResources = parseInt($("#total-resources").val()) || 10;
                bankResources = totalResources;
                const numClients = parseInt($("#num-clients").val()) || 5;
                
                // Generate clients
                clients = [];
                for (let i = 0; i < numClients; i++) {
                    // Random client data - max claim is between 1 and totalResources/2
                    const maxClaim = Math.floor(Math.random() * (totalResources / 2)) + 1;
                    // Allocated is between 0 and maxClaim
                    const allocated = Math.floor(Math.random() * Math.min(maxClaim, bankResources / 2));
                    
                    clients.push({
                        id: i + 1,
                        maxClaim: maxClaim,
                        allocated: allocated,
                        remainingNeed: maxClaim - allocated,
                        completed: false,
                        status: "waiting" // waiting, processing, completed
                    });
                    
                    // Update bank resources
                    bankResources -= allocated;
                }
                
                // Render initial state
                renderState();
                
                // Enable buttons
                $("#step-simulation").prop("disabled", false);
                $("#auto-simulation").prop("disabled", false);
                
                // Log
                log("Simulación inicializada con " + totalResources + " recursos y " + numClients + " clientes.");
                
                // Calculate and display safe sequence if possible
                calculateSafeSequence();
            }
            
            // Render the current state
            function renderState() {
                // Render bank resources
                const bankResourcesContainer = $("#bank-resources");
                bankResourcesContainer.empty();
                bankResourcesContainer.append(`<span>${bankResources} unidades disponibles:</span>`);
                
                for (let i = 0; i < bankResources; i++) {
                    bankResourcesContainer.append(`<div class="resource">$</div>`);
                }
                
                // Render clients
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
            
            // Helper function to render resource icons
            function renderResources(count) {
                let result = `<span>${count} unidades</span>`;
                for (let i = 0; i < count; i++) {
                    result += `<div class="resource">$</div>`;
                }
                return result;
            }
            
            // Calculate safe sequence using Banker's Algorithm
            function calculateSafeSequence() {
                // Make a copy of the current state
                const tempBankResources = bankResources;
                const tempClients = JSON.parse(JSON.stringify(clients));
                const unprocessedClients = tempClients.filter(client => !client.completed);
                
                safeSequence = [];
                let work = tempBankResources;
                let finish = Array(unprocessedClients.length).fill(false);
                
                // Loop until all clients are processed or no safe client is found
                let found;
                do {
                    found = false;
                    for (let i = 0; i < unprocessedClients.length; i++) {
                        if (!finish[i] && unprocessedClients[i].remainingNeed <= work) {
                            // Process this client
                            work += unprocessedClients[i].allocated;
                            finish[i] = true;
                            safeSequence.push(unprocessedClients[i].id);
                            found = true;
                        }
                    }
                } while (found);
                
                // Check if all clients can be completed
                const allCompleted = finish.every(f => f);
                
                if (allCompleted) {
                    log("Estado seguro detectado. Secuencia segura: " + safeSequence.join(" → "));
                } else {
                    log("¡Estado inseguro! No se puede garantizar una secuencia segura para todos los clientes.");
                    safeSequence = [];
                }
                
                return allCompleted;
            }
            
            // Simulate a step of the algorithm
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
                
                // Mark client as processing
                client.status = "processing";
                renderState();
                log(`Cliente ${clientId} está siendo procesado...`);
                
                // Simulate the client taking all needed resources
                setTimeout(() => {
                    // Animate resource transfer from bank to client
                    animateResourceTransfer("bank-resources", `client-${clientId}`, client.remainingNeed);
                    
                    // Update client and bank state
                    bankResources -= client.remainingNeed;
                    client.allocated += client.remainingNeed;
                    client.remainingNeed = 0;
                    
                    log(`Cliente ${clientId} recibió ${client.remainingNeed} recursos adicionales.`);
                    
                    // Simulate the client completing its work
                    setTimeout(() => {
                        // Release all resources back to bank
                        animateResourceTransfer(`client-${clientId}`, "bank-resources", client.allocated);
                        
                        log(`Cliente ${clientId} completó su trabajo y liberó ${client.allocated} recursos.`);
                        
                        bankResources += client.allocated;
                        client.allocated = 0;
                        client.completed = true;
                        client.status = "completed";
                        
                        // Move to next step
                        currentStep++;
                        renderState();
                        
                        // Continue auto simulation if enabled
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
            
            // Animate resource transfer between elements
            function animateResourceTransfer(fromId, toId, count) {
                const fromElement = document.getElementById(fromId);
                const toElement = document.getElementById(toId);
                
                if (!fromElement || !toElement || count <= 0) return;
                
                const fromRect = fromElement.getBoundingClientRect();
                const toRect = toElement.getBoundingClientRect();
                
                // Create resource tokens
                for (let i = 0; i < Math.min(count, 5); i++) {
                    const resourceToken = document.createElement('div');
                    resourceToken.className = 'resource-transfer';
                    document.body.appendChild(resourceToken);
                    
                    // Set initial position
                    resourceToken.style.left = `${fromRect.left + 50 + Math.random() * 50}px`;
                    resourceToken.style.top = `${fromRect.top + 20 + Math.random() * 20}px`;
                    
                    // Animate to target position
                    setTimeout(() => {
                        resourceToken.style.left = `${toRect.left + 50 + Math.random() * 50}px`;
                        resourceToken.style.top = `${toRect.top + 20 + Math.random() * 20}px`;
                        
                        // Remove element after animation completes
                        setTimeout(() => {
                            resourceToken.remove();
                        }, 1000);
                    }, 10);
                }
            }
            
            // Start auto simulation
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
            
            // Stop auto simulation
            function stopAutoSimulation() {
                if (autoSimulationInterval !== null) {
                    clearInterval(autoSimulationInterval);
                    autoSimulationInterval = null;
                    $("#auto-simulation").text("Simulación Automática");
                    log("Simulación automática detenida.");
                }
            }
            
            // Reset simulation
            function resetSimulation() {
                stopAutoSimulation();
                currentStep = 0;
                safeSequence = [];
                $("#log-area").empty();
                log("Simulación reiniciada. Configure los parámetros y presione 'Iniciar Simulación'.");
                
                // Disable buttons
                $("#step-simulation").prop("disabled", true);
                $("#auto-simulation").prop("disabled", true);
            }
            
            // Add log entry
            function log(message) {
                const timestamp = new Date().toLocaleTimeString();
                $("#log-area").append(`<div class="log-entry">[${timestamp}] ${message}</div>`);
                
                // Scroll to bottom
                const logArea = document.getElementById("log-area");
                logArea.scrollTop = logArea.scrollHeight;
            }
            
            // Event handlers
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
            
            // Initialize on load
            resetSimulation();
        });