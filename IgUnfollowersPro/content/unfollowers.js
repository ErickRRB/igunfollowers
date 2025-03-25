"use strict";

// ====================================
// CONFIGURACIÓN DE MONETIZACIÓN
// ====================================
const SUBSCRIPTION_CONFIG = {
    // Número de días para prueba gratuita (análisis ilimitado)
    TRIAL_DAYS: 7,
    
    // Límites para cada plan (fácilmente modificable)
    FREE: {
        // Número máximo de unfollowers a analizar
        maxUnfollowers: 300,
        // Número de días para mantener el historial
        historyDays: 7,
        // Funciones premium deshabilitadas
        automation: false,
        realTimeAlerts: false,
        multipleAccounts: false,
        export: false
    },
    PREMIUM: {
        maxUnfollowers: -1, // -1 significa ilimitado
        historyDays: 365,
        automation: false,
        realTimeAlerts: true,
        multipleAccounts: false,
        export: true
    },
    PRO: {
        maxUnfollowers: -1,
        historyDays: 730, // 2 años
        automation: true,
        realTimeAlerts: true,
        multipleAccounts: true,
        export: true
    }
};

// Configuración básica de Instagram
const INSTAGRAM_HOSTNAME = "www.instagram.com";
const QUERY_HASH = "3dec7e2c57367ef3da3d987d89f9dbc8";
const BASE_URL = `https://www.instagram.com/graphql/query/?query_hash=${QUERY_HASH}`;
const STORAGE_KEY = "instagram_unfollowers_history";
const USER_DATA_KEY = "instagram_unfollowers_user_data";

// Obtener información del usuario
const USER_ID = getCookie("ds_user_id");
const USER_SESSIONID = getCookie("sessionid");
const USER_CSRFTOKEN = getCookie("csrftoken");

// Textos de la interfaz de usuario para fácil edición
const UI_TEXTS = {
    // Título y botones principales
    TITLE: "Instagram Unfollowers Pro",
    RUN_BUTTON: "RUN",
    COPY_LIST_BUTTON: "Copiar lista",
    COPY_SUCCESS: "¡Lista copiada al portapapeles!",
    INCLUDE_VERIFIED: "Incluir verificados",
    HISTORY_BUTTON: "Ver historial",
    
    // Estadísticas y contadores
    NON_FOLLOWERS: "No te siguen:",
    UNFOLLOW_SELECTED: "Dejar de seguir",
    
    // Mensajes del proceso
    SLEEPING_SHORT: "Esperando 10 segundos para evitar bloqueos...",
    SLEEPING_LONG: "Esperando 5 minutos para evitar bloqueos...",
    PROCESS_DONE: "¡LISTO!",
    ALL_DONE: "¡TODO COMPLETADO!",
    
    // Confirmaciones y alertas
    CONFIRM_UNFOLLOW: "¿Estás seguro de dejar de seguir a estos usuarios?",
    INSTAGRAM_ONLY: "Solo puede usarse en Instagram",
    CSRF_ERROR: "Error: No se pudo obtener el token de autenticación",
    
    // Historial
    HISTORY_TITLE: "Historial de Unfollowers",
    NO_HISTORY: "No hay historial de unfollowers guardado",
    HISTORY_COUNT: "unfollowers",
    HISTORY_ERROR: "Error al mostrar el historial",
    
    // Columnas de tablas
    COLUMN_USER: "Usuario",
    COLUMN_NAME: "Nombre",
    COLUMN_VERIFIED: "Verificado",
    
    // Etiquetas de usuarios
    PRIVATE_LABEL: "Privado",
    FOLLOWER_SINCE: "Detectado:",
    
    // Mensajes de monetización
    LIMIT_REACHED: "Has alcanzado el límite de tu plan actual",
    UPGRADE_TITLE: "¡Mejora tu experiencia!",
    UPGRADE_BUTTON: "Actualizar plan",
    TRIAL_ACTIVE: "Período de prueba activo: ",
    TRIAL_DAYS_LEFT: "días restantes",
    PREMIUM_FEATURE: "Función premium",
    
    // Tutorial
    TUTORIAL_TITLE: "¡Bienvenido a Instagram Unfollowers Pro!",
    TUTORIAL_NEXT: "Siguiente",
    TUTORIAL_SKIP: "Saltar tutorial",
    TUTORIAL_FINISH: "Finalizar"
};

// ====================================
// HTML TEMPLATES
// ====================================

const headerHTML = `
    <header style="position:fixed; top:0; left:0; right:0; display:flex; align-items:center; justify-content:space-between; padding:1rem; height:2.5rem; background-color:#333; z-index:1;">
        <div style="font-family:monospace; font-size:1.5em; cursor:pointer;" onclick="location.reload()">${UI_TEXTS.TITLE}</div>
        <button class="ui_copy-list-btn" style="background:none; color:white; border: 1px solid white; border-radius:15px; padding:0.5em; cursor:pointer" onclick="copyListToClipboard()" disabled>${UI_TEXTS.COPY_LIST_BUTTON}</button>
        <label style="display:flex; cursor:pointer;">
            <input type="checkbox" class="iu_include-verified-checkbox" /> ${UI_TEXTS.INCLUDE_VERIFIED}
        </label>
        <div class="iu_progressbar-container" style="display:none; width:120px; height:30px; border-radius:5px; position:relative; border:1px solid #7b7777;">
            <div class="iu_progressbar-bar" style="width:0; height:100%; background-color:#7b7777;"></div>
            <label class="iu_progressbar-text" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);">0%</label>
        </div>
        <div>${UI_TEXTS.NON_FOLLOWERS} <span class="iu_nonfollower-count"></span></div>
        <div style="font-size: 1.2em; text-decoration: underline; color: red; cursor: pointer;" onclick="unfollow()">${UI_TEXTS.UNFOLLOW_SELECTED} <span class="iu_selected-count">[0]</span></div>
        <input type="checkbox" class="iu_toggle-all-checkbox" style="height: 1.1rem; width: 1.1rem;" onclick="toggleAllUsers(this.checked)" disabled />
    </header>`;

const sleepingContainerHTML = `
    <div class="iu_sleeping-container" style="position: fixed; bottom: 0; left: 0; right: 0; display: none; padding: 1rem; background-color: #000; z-index: 1; color: yellow; font-weight:bold"></div>`;

const mainBtnHTML = `
    <button class="iu_main-btn" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 2em; cursor: pointer; height: 160px; width: 160px; border-radius: 50%; background: transparent; color: currentColor; border: 1px solid currentColor;">${UI_TEXTS.RUN_BUTTON}</button>`;

const resultsContainerHTML = `
    <div class="iu_results-container" style="transform: translateY(75px)"></div>`;

const historyBtnHTML = `
    <button class="iu_history-btn" style="position: fixed; bottom: 10px; right: 10px; font-size: 1em; cursor: pointer; padding: 10px; border-radius: 5px; background: #333; color: white; border: 1px solid white;">${UI_TEXTS.HISTORY_BUTTON}</button>
`;

// Premium badge para mostrar en la interfaz
const premiumBadgeHTML = `
    <div class="iu_premium-badge" style="position: fixed; top: 10px; right: 10px; background: linear-gradient(45deg, #FFD700, #FFA500); color: #333; padding: 5px 10px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">PREMIUM</div>
`;

// Trial badge para mostrar en período de prueba
const trialBadgeHTML = `
    <div class="iu_trial-badge" style="position: fixed; top: 10px; right: 10px; background: linear-gradient(45deg, #4CAF50, #8BC34A); color: white; padding: 5px 10px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${UI_TEXTS.TRIAL_ACTIVE} <span class="iu_trial-days"></span> ${UI_TEXTS.TRIAL_DAYS_LEFT}</div>
`;

// Modal para upgrade
const upgradeModalHTML = `
    <div class="iu_modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); z-index: 999; display: flex; justify-content: center; align-items: center;">
        <div class="iu_modal" style="background-color: white; color: #333; width: 80%; max-width: 500px; border-radius: 10px; padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
            <h2 style="text-align: center; margin-bottom: 20px;">${UI_TEXTS.UPGRADE_TITLE}</h2>
            <p style="margin-bottom: 20px;" class="iu_limit-message"></p>
            
            <div class="iu_plan-options" style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <!-- Opciones de plan -->
                <div class="iu_plan" style="flex: 1; margin: 0 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
                    <h3>Gratis</h3>
                    <p class="iu_price">$0/mes</p>
                    <ul style="text-align: left; padding-left: 20px;">
                        <li>Hasta ${SUBSCRIPTION_CONFIG.FREE.maxUnfollowers} unfollowers</li>
                        <li>Historial de ${SUBSCRIPTION_CONFIG.FREE.historyDays} días</li>
                    </ul>
                </div>
                
                <div class="iu_plan iu_premium-plan" style="flex: 1; margin: 0 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center; background-color: #f9f9f9;">
                    <h3>Premium</h3>
                    <p class="iu_price">$4.99/mes</p>
                    <ul style="text-align: left; padding-left: 20px;">
                        <li>Unfollowers ilimitados</li>
                        <li>Historial de 1 año</li>
                        <li>Alertas en tiempo real</li>
                        <li>Exportación de datos</li>
                    </ul>
                    <button class="iu_upgrade-btn" style="background-color: #4CAF50; color: white; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; margin-top: 10px;" data-plan="PREMIUM">${UI_TEXTS.UPGRADE_BUTTON}</button>
                </div>
                
                <div class="iu_plan" style="flex: 1; margin: 0 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
                    <h3>Pro</h3>
                    <p class="iu_price">$9.99/mes</p>
                    <ul style="text-align: left; padding-left: 20px;">
                        <li>Todo lo de Premium</li>
                        <li>Automatización</li>
                        <li>Múltiples cuentas</li>
                        <li>Soporte prioritario</li>
                    </ul>
                    <button class="iu_upgrade-btn" style="background-color: #2196F3; color: white; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; margin-top: 10px;" data-plan="PRO">${UI_TEXTS.UPGRADE_BUTTON}</button>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button class="iu_close-modal" style="background: none; border: 1px solid #ccc; padding: 8px 15px; border-radius: 20px; cursor: pointer;">Continuar con plan actual</button>
            </div>
        </div>
    </div>
`;

// Tutorial paso a paso
const tutorialHTML = `
    <div class="iu_tutorial-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); z-index: 1000; display: flex; justify-content: center; align-items: center;">
        <div class="iu_tutorial-modal" style="background-color: white; color: #333; width: 80%; max-width: 500px; border-radius: 10px; padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
            <h2 style="text-align: center; margin-bottom: 20px;">${UI_TEXTS.TUTORIAL_TITLE}</h2>
            <div class="iu_tutorial-content">
                <!-- El contenido del paso actual se inserta aquí -->
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <button class="iu_tutorial-skip" style="background: none; border: 1px solid #ccc; padding: 8px 15px; border-radius: 20px; cursor: pointer;">${UI_TEXTS.TUTORIAL_SKIP}</button>
                <button class="iu_tutorial-next" style="background-color: #4CAF50; color: white; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer;">${UI_TEXTS.TUTORIAL_NEXT}</button>
            </div>
        </div>
    </div>
`;

// ====================================
// VARIABLES GLOBALES
// ====================================

let nonFollowersList = [],
    previousNonFollowers = [],
    userIdsToUnfollow = [],
    isActiveProcess = false,
    currentUserPlan = null,
    isTrialActive = false,
    trialDaysLeft = 0;

// ====================================
// FUNCIONES DE SUSCRIPCIÓN Y MONETIZACIÓN
// ====================================

// Inicializa los datos del usuario
async function initUserData() {
    try {
        // Intenta cargar datos del usuario
        const userData = await getUserData();
        
        if (!userData || !userData.subscriptionPlan) {
            // Es un usuario nuevo, crear datos iniciales
            const newUserData = {
                userId: USER_ID,
                subscriptionPlan: "FREE",
                trialStartDate: new Date().toISOString(),
                subscriptionExpiry: null
            };
            
            // Guardar datos del usuario
            await saveUserData(newUserData);
            
            // Mostrar tutorial solo a usuarios nuevos
            showTutorial();
            
            currentUserPlan = "FREE";
            // Activar período de prueba
            isTrialActive = true;
            trialDaysLeft = SUBSCRIPTION_CONFIG.TRIAL_DAYS;
        } else {
            // Usuario existente
            currentUserPlan = userData.subscriptionPlan;
            
            // Verificar si está en período de prueba
            if (userData.trialStartDate) {
                const trialStart = new Date(userData.trialStartDate);
                const now = new Date();
                const diffTime = Math.abs(now - trialStart);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= SUBSCRIPTION_CONFIG.TRIAL_DAYS) {
                    isTrialActive = true;
                    trialDaysLeft = SUBSCRIPTION_CONFIG.TRIAL_DAYS - diffDays;
                }
            }
        }
        
        // Mostrar indicador de plan
        showPlanIndicator();
        
    } catch (error) {
        console.error("Error inicializando datos de usuario:", error);
        currentUserPlan = "FREE"; // Fallback a plan gratuito
    }
}

// Mostrar indicador de plan activo
function showPlanIndicator() {
    const overlay = document.querySelector('.iu_overlay');
    
    if (!overlay) return;
    
    // Remover indicadores existentes
    const existingBadge = document.querySelector('.iu_premium-badge, .iu_trial-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    if (isTrialActive) {
        // Mostrar badge de período de prueba
        overlay.insertAdjacentHTML('beforeend', trialBadgeHTML);
        document.querySelector('.iu_trial-days').textContent = trialDaysLeft;
    } else if (currentUserPlan !== "FREE") {
        // Mostrar badge de premium/pro
        overlay.insertAdjacentHTML('beforeend', premiumBadgeHTML);
    }
}

// Verificar acceso a características según plan
function checkFeatureAccess(feature) {
    // Durante el período de prueba, acceso completo
    if (isTrialActive) {
        return true;
    }
    
    const planConfig = SUBSCRIPTION_CONFIG[currentUserPlan];
    
    if (!planConfig || planConfig[feature] === false) {
        showUpgradeModal(feature);
        return false;
    }
    
    return true;
}

// Verificar límite de unfollowers
function checkUnfollowersLimit(count) {
    // Durante período de prueba, sin límites
    if (isTrialActive) {
        return true;
    }
    
    const planConfig = SUBSCRIPTION_CONFIG[currentUserPlan];
    const maxUnfollowers = planConfig.maxUnfollowers;
    
    // -1 significa sin límite
    if (maxUnfollowers === -1 || count <= maxUnfollowers) {
        return true;
    }
    
    // Mostrar sólo los permitidos por el plan
    showUpgradeModal('maxUnfollowers');
    return false;
}

// Mostrar modal para actualizar plan
function showUpgradeModal(feature) {
    // Remover modal existente si hay
    const existingModal = document.querySelector('.iu_modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Añadir nuevo modal
    document.body.insertAdjacentHTML('beforeend', upgradeModalHTML);
    
    // Personalizar mensaje según la característica
    let message = "";
    switch (feature) {
        case 'maxUnfollowers':
            message = `Tu plan actual te permite ver hasta ${SUBSCRIPTION_CONFIG[currentUserPlan].maxUnfollowers} unfollowers. Actualiza para análisis ilimitado.`;
            break;
        case 'automation':
            message = "La automatización de unfollow es una característica premium.";
            break;
        case 'export':
            message = "La exportación de datos es una característica premium.";
            break;
        default:
            message = "Esta es una característica premium. Actualiza tu plan para acceder.";
    }
    
    document.querySelector('.iu_limit-message').textContent = message;
    
    // Manejar clics en botones
    document.querySelector('.iu_close-modal').addEventListener('click', () => {
        document.querySelector('.iu_modal-overlay').remove();
    });
    
    // Manejar clics en botones de actualización
    document.querySelectorAll('.iu_upgrade-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const plan = event.target.getAttribute('data-plan');
            upgradeToPlan(plan);
        });
    });
}

// Procesar actualización de plan
async function upgradeToPlan(plan) {
    try {
        // Aquí iría la integración con sistema de pagos
        
        // Simulación de actualización exitosa
        const userData = await getUserData();
        userData.subscriptionPlan = plan;
        
        // Si está actualizando, terminar período de prueba
        isTrialActive = false;
        
        // Guardar cambios
        await saveUserData(userData);
        
        // Actualizar variables globales
        currentUserPlan = plan;
        
        // Cerrar modal
        document.querySelector('.iu_modal-overlay').remove();
        
        // Actualizar indicador
        showPlanIndicator();
        
        // Refrescar datos (opcional)
        location.reload();
        
    } catch (error) {
        console.error("Error upgrading plan:", error);
        alert("Hubo un problema procesando tu actualización. Por favor intenta de nuevo.");
    }
}

// Tutorial para nuevos usuarios
function showTutorial() {
    // Añadir HTML del tutorial
    document.body.insertAdjacentHTML('beforeend', tutorialHTML);
    
    // Pasos del tutorial
    const tutorialSteps = [
        {
            title: "Bienvenido a Instagram Unfollowers Pro",
            content: "Esta herramienta te permite descubrir quién no te sigue de vuelta en Instagram y gestionar tus seguidores de forma eficiente.",
            image: null
        },
        {
            title: "Análisis de seguidores",
            content: "Haz clic en el botón 'RUN' para comenzar a escanear tu cuenta. El proceso puede tomar unos minutos dependiendo del número de seguidores.",
            image: "tutorial-analyze.png"
        },
        {
            title: "Gestión de unfollowers",
            content: "Selecciona los usuarios que quieres dejar de seguir marcando las casillas correspondientes, o usa la casilla superior para seleccionar todos.",
            image: "tutorial-select.png"
        },
        {
            title: "Historial de unfollowers",
            content: "El historial te permite ver quién dejó de seguirte y cuándo. Esto te ayuda a identificar tendencias y usuarios que te siguen y dejan de seguir repetidamente.",
            image: "tutorial-history.png"
        },
        {
            title: "¡Listo para empezar!",
            content: "Ahora estás listo para gestionar tus seguidores de Instagram como un profesional. ¡Disfruta tu período de prueba gratuito con todas las funciones premium!",
            image: null
        }
    ];
    
    let currentStep = 0;
    
    // Función para actualizar contenido del tutorial
    function updateTutorialContent() {
        const step = tutorialSteps[currentStep];
        let content = `<h3>${step.title}</h3><p>${step.content}</p>`;
        
        if (step.image) {
            content += `<div style="text-align: center; margin: 15px 0;"><img src="${step.image}" style="max-width: 100%; border-radius: 5px;"></div>`;
        }
        
        document.querySelector('.iu_tutorial-content').innerHTML = content;
        
        // Actualizar botón siguiente/finalizar
        const nextBtn = document.querySelector('.iu_tutorial-next');
        if (currentStep === tutorialSteps.length - 1) {
            nextBtn.textContent = UI_TEXTS.TUTORIAL_FINISH;
        } else {
            nextBtn.textContent = UI_TEXTS.TUTORIAL_NEXT;
        }
    }
    
    // Mostrar primer paso
    updateTutorialContent();
    
    // Manejar navegación
    document.querySelector('.iu_tutorial-next').addEventListener('click', () => {
        currentStep++;
        if (currentStep >= tutorialSteps.length) {
            // Final del tutorial
            document.querySelector('.iu_tutorial-overlay').remove();
        } else {
            updateTutorialContent();
        }
    });
    
    document.querySelector('.iu_tutorial-skip').addEventListener('click', () => {
        document.querySelector('.iu_tutorial-overlay').remove();
    });
}

// ====================================
// FUNCIONES UTILITARIAS
// ====================================

function sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}

function getCookie(name) {
    const value = `; ${document.cookie}`.split(`; ${name}=`);
    return value.length === 2 ? value.pop().split(";").shift() : null;
}

async function getUserData() {
    return new Promise((resolve, reject) => {
        try {
            const dataStr = localStorage.getItem(USER_DATA_KEY);
            if (dataStr) {
                resolve(JSON.parse(dataStr));
            } else {
                resolve(null);
            }
        } catch (error) {
            reject(error);
        }
    });
}

async function saveUserData(userData) {
    return new Promise((resolve, reject) => {
        try {
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

function afterUrlGenerator(afterCursor = "") {
    const variables = {
        id: USER_ID,
        include_reel: "true",
        fetch_mutual: "false",
        first: "24"
    };
    if (afterCursor) {
        variables.after = afterCursor;
    }
    return `${BASE_URL}&variables=${JSON.stringify(variables)}`;
}

function unfollowUserUrlGenerator(userId) {
    return `https://www.instagram.com/web/friendships/${userId}/unfollow/`;
}

function getElementByClass(selector) {
    const element = document.querySelector(selector);
    if (element === null) throw new Error(`Unable to find element by selector: ${selector}`);
    return element;
}

function getUserById(userId) {
    const user = nonFollowersList.find(user => user.id.toString() === userId.toString());
    if (user === undefined) {
        console.error(`Unable to find user by id. userId: ${userId}`);
    }
    return user;
}

function copyListToClipboard() {
    try {
        if (!nonFollowersList || nonFollowersList.length === 0) {
            alert("No hay unfollowers para copiar");
            return;
        }

        const sortedList = [...nonFollowersList].sort((a, b) => a.username.localeCompare(b.username));
        let textToCopy = "";
        
        sortedList.forEach(user => {
            textToCopy += user.username + "\n";
        });
        
        // Intento directo de copia usando navigator.clipboard
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                alert(UI_TEXTS.COPY_SUCCESS);
            })
            .catch((err) => {
                console.error("Error al copiar directamente:", err);
                // Método alternativo: creamos un elemento textarea temporal
                fallbackCopyToClipboard(textToCopy);
            });
    } catch (error) {
        console.error("Error en copyListToClipboard:", error);
        alert("Error al copiar la lista. Por favor intenta de nuevo.");
    }
}

async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
    alert(UI_TEXTS.COPY_SUCCESS);
}

function onToggleUser() {
    getElementByClass(".iu_selected-count").innerHTML = `[${userIdsToUnfollow.length}]`;
}

// ====================================
// FUNCIONES DE RENDERIZADO DE UI
// ====================================

function renderResults(users) {
    // Aplicar límite según plan (excepto en período de prueba)
    let displayedUsers = [...users];
    const maxUnfollowers = SUBSCRIPTION_CONFIG[currentUserPlan].maxUnfollowers;
    
    if (!isTrialActive && maxUnfollowers !== -1 && displayedUsers.length > maxUnfollowers) {
        displayedUsers = displayedUsers.slice(0, maxUnfollowers);
        // Mostrar mensaje de límite
        setTimeout(() => showUpgradeModal('maxUnfollowers'), 500);
    }
    
    // Ordenar por nombre de usuario
    const sortedUsers = displayedUsers.sort((a, b) => a.username.localeCompare(b.username));
    
    getElementByClass(".iu_toggle-all-checkbox").disabled = false;
    const resultsContainer = getElementByClass(".iu_results-container");
    resultsContainer.innerHTML = "";
    
    let currentLetter = "";

    sortedUsers.forEach(user => {
        const firstLetter = user.username.substring(0, 1).toUpperCase();
        
        // Create letter header if new letter section
        if (currentLetter !== firstLetter) {
            currentLetter = firstLetter;
            resultsContainer.innerHTML += `
                <div style="margin:1rem; padding:1rem; font-size:2em; border-bottom: 1px solid #333;">
                    ${currentLetter}
                </div>`;
        }
        
        // Check if user is new (wasn't in previous list)
        const isNewUnfollower = isNewNonFollower(user.id);
        const lastSeenDate = getLastSeenDate(user.id);
        
        // Create user element - QUITAR onchange y añadir data-user-id
        const verifiedIcon = user.is_verified ? `
            <div style="background-color:#49adf4; border-radius:50%; padding:0.2rem 0.3rem; font-size:0.35em; height:fit-content;">✔</div>` : "";

        const privacyStatus = user.is_private ? `
            <div style="display:flex; width:100%; justify-content:space-around;">
                <span style="border: 2px solid #51bb42; border-radius:25px; padding:0.5rem; color:#51bb42; font-weight:500;">${UI_TEXTS.PRIVATE_LABEL}</span>
            </div>` : "";
        
        const newUnfollowerStyle = isNewUnfollower ? 
            `background-color: rgba(255, 0, 0, 0.1); border: 1px solid #ff6666;` : "";
        
        const lastSeenInfo = lastSeenDate ? 
            `<div style="font-size:0.7em; color:#888;">${UI_TEXTS.FOLLOWER_SINCE} ${lastSeenDate}</div>` : "";

        // IMPORTANTE: Quitar el onchange y agregar data-user-id
        resultsContainer.innerHTML += `
            <label style="display:flex; align-items:center; padding:1rem; border-radius:3px; cursor:pointer; ${newUnfollowerStyle}">
                <div style="display:flex; align-items:center; flex:1;">
                    <img src="${user.profile_pic_url}" width="75px" style="border-radius:50%;" />
                    <div style="display:flex; flex-direction:column; margin-left: 10px;">
                        <span style="font-size:1.7em;">${user.username}</span>
                        <span style="font-size:0.8em;">${user.full_name}</span>
                        ${lastSeenInfo}
                    </div>
                    ${verifiedIcon}
                    ${privacyStatus}
                </div>
                <input class="iu_account-checkbox" type="checkbox" data-user-id="${user.id}" style="height:1.1rem; width:1.1rem;" />
            </label>`;
    });
    
    // Mostrar mensaje de límite de plan si aplica
    if (!isTrialActive && maxUnfollowers !== -1 && users.length > maxUnfollowers) {
        resultsContainer.innerHTML += `
            <div style="margin:2rem 1rem; padding:1rem; text-align:center; background-color: #FFF3CD; color: #856404; border-radius: 5px;">
                <strong>Límite de plan:</strong> Mostrando ${maxUnfollowers} de ${users.length} unfollowers.
                <button class="iu_upgrade-btn-inline" style="background-color: #007BFF; color: white; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; margin-left: 10px;">Actualizar plan</button>
            </div>`;
        
        document.querySelector('.iu_upgrade-btn-inline').addEventListener('click', () => {
            showUpgradeModal('maxUnfollowers');
        });
    }

    addCheckboxEventListeners();
}

function addCheckboxEventListeners() {
    // Agregar event listeners a todos los checkboxes
    document.querySelectorAll('.iu_account-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const userId = this.getAttribute('data-user-id');
            toggleUser(userId);
        });
    });
}

async function run(includeVerified) {
    getElementByClass(".iu_main-btn").remove();
    getElementByClass(".iu_include-verified-checkbox").disabled = true;
    
    // Inicializar datos del usuario y plan
    await initUserData();
    
    // Load previous data first
    loadPreviousNonFollowers();
    
    // Get current non-followers
    nonFollowersList = await getNonFollowersList(includeVerified);
    
    // Save the current list to history
    saveNonFollowersToHistory(nonFollowersList);
    
    getElementByClass(".ui_copy-list-btn").disabled = false;
}

function renderOverlay() {
    let includeVerified = true;
    document.documentElement.style.backgroundColor = "#222";
    
    const overlay = document.createElement("div");
    overlay.setAttribute("class", "iu_overlay");
    overlay.setAttribute("style",
        ["background-color:#222",
         "color:#fff",
         "height:100%",
         "font-family:system-ui"].join(";"));
    
    overlay.innerHTML = `${headerHTML}${sleepingContainerHTML}${mainBtnHTML}${resultsContainerHTML}${historyBtnHTML}`;
    document.body.replaceChildren(overlay);
    
    getElementByClass(".iu_main-btn").addEventListener("click", () => run(includeVerified));
    getElementByClass(".iu_history-btn").addEventListener("click", showHistoryOverlay);
    
    const verifiedCheckbox = getElementByClass(".iu_include-verified-checkbox");
    verifiedCheckbox.checked = includeVerified;
    verifiedCheckbox.addEventListener("change", () => includeVerified = !includeVerified);
    
    // Inicializar datos del usuario (plan, trial, etc)
    initUserData();
}

// ====================================
// FUNCIONES DE ANÁLISIS DE FOLLOWERS
// ====================================

async function getNonFollowersList(includeVerifiedAccounts = true) {
    if (isActiveProcess) return [];

    const nonFollowers = [];
    let hasMorePages = true,
        iterationCount = 0,
        fetchedCount = 0,
        totalFollowCount = -1;

    isActiveProcess = true;

    let apiUrl = buildInitialApiUrl();

    displayProgressBar();

    const progressBar = getElementByClass(".iu_progressbar-bar"),
        progressBarText = getElementByClass(".iu_progressbar-text"),
        nonFollowerCountElement = getElementByClass(".iu_nonfollower-count"),
        sleepIndicator = getElementByClass(".iu_sleeping-container");

    while (hasMorePages) {
        let responseJson;
        try {
            const response = await fetch(apiUrl);
            responseJson = await response.json();
        } catch (error) {
            console.error("Error fetching data:", error);
            await sleep(5000); // Wait 5 seconds before retrying
            continue;
        }

        if (totalFollowCount === -1) {
            totalFollowCount = responseJson.data.user.edge_follow.count;
        }

        hasMorePages = responseJson.data.user.edge_follow.page_info.has_next_page;
        apiUrl = afterUrlGenerator(responseJson.data.user.edge_follow.page_info.end_cursor);
        fetchedCount += responseJson.data.user.edge_follow.edges.length;

        responseJson.data.user.edge_follow.edges.forEach(edge => {
            if (!includeVerifiedAccounts && edge.node.is_verified) return;
            if (!edge.node.follows_viewer) nonFollowers.push(edge.node);
        });

        const completionPercentage = `${Math.ceil(fetchedCount / totalFollowCount * 100)}%`;
        updateProgressBar(progressBar, progressBarText, nonFollowerCountElement, completionPercentage, nonFollowers);

        await delay();

        iterationCount++;
        if (iterationCount > 6) {
            await longerDelay(sleepIndicator);
            iterationCount = 0;
        }
    }

    finalizeProgressBar(progressBar, progressBarText);
    isActiveProcess = false;

    return nonFollowers;
}

function buildInitialApiUrl() {
    return `${BASE_URL}&variables={"id":"${USER_ID}","include_reel":"true","fetch_mutual":"false","first":"24"}`;
}

function displayProgressBar() {
    getElementByClass(".iu_progressbar-container").style.display = "block";
}

function updateProgressBar(progressBar, progressBarText, countElement, percentage, nonFollowers) {
    progressBarText.innerHTML = percentage;
    progressBar.style.width = percentage;
    countElement.innerHTML = nonFollowers.length.toString();
    renderResults(nonFollowers);
}

function delay() {
    return sleep(Math.floor(400 * Math.random()) + 1000);
}

function longerDelay(sleepIndicator) {
    sleepIndicator.style.display = "block";
    sleepIndicator.innerHTML = UI_TEXTS.SLEEPING_SHORT;
    return sleep(10000).then(() => {
        sleepIndicator.style.display = "none";
    });
}

function finalizeProgressBar(progressBar, progressBarText) {
    progressBar.style.backgroundColor = "#59A942";
    progressBarText.innerHTML = UI_TEXTS.PROCESS_DONE;
}

// ====================================
// FUNCIONES DE HISTORIAL
// ====================================

function saveNonFollowersToHistory(unfollowers) {
    try {
        // Obtener límite de días según plan
        const historyDaysLimit = isTrialActive 
            ? SUBSCRIPTION_CONFIG.PRO.historyDays // Sin límite en trial
            : SUBSCRIPTION_CONFIG[currentUserPlan].historyDays;
        
        // Get existing history
        const historyJson = localStorage.getItem(STORAGE_KEY) || '[]';
        const history = JSON.parse(historyJson);
        
        // Create new entry with timestamp
        const entry = {
            date: new Date().toISOString(),
            unfollowers: unfollowers.map(user => ({
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                profile_pic_url: user.profile_pic_url,
                is_verified: user.is_verified,
                is_private: user.is_private
            }))
        };
        
        // Add to history
        history.push(entry);
        
        // Limpiar entradas antiguas según límite del plan
        // Convertir fechas a objetos Date para comparación
        let cleanedHistory = history;
        if (historyDaysLimit > 0) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - historyDaysLimit);
            
            cleanedHistory = history.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= cutoffDate;
            });
        }
        
        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedHistory));
    } catch (error) {
        console.error("Error saving unfollowers history:", error);
    }
}

function loadPreviousNonFollowers() {
    try {
        const historyJson = localStorage.getItem(STORAGE_KEY);
        if (!historyJson) return;
        
        const history = JSON.parse(historyJson);
        if (history.length === 0) return;
        
        // Get most recent entry
        const lastEntry = history[history.length - 1];
        previousNonFollowers = lastEntry.unfollowers;
    } catch (error) {
        console.error("Error loading previous unfollowers:", error);
        previousNonFollowers = [];
    }
}

function isNewNonFollower(userId) {
    // Check if user was not in previous list
    return previousNonFollowers.length > 0 && 
           !previousNonFollowers.some(user => user.id === userId);
}

function getLastSeenDate(userId) {
    try {
        const historyJson = localStorage.getItem(STORAGE_KEY);
        if (!historyJson) return null;
        
        const history = JSON.parse(historyJson);
        
        // Find the earliest entry containing this user
        for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            const found = entry.unfollowers.some(user => user.id === userId);
            if (found) {
                return new Date(entry.date).toLocaleDateString();
            }
        }
        return null;
    } catch (error) {
        console.error("Error getting last seen date:", error);
        return null;
    }
}

function showHistoryOverlay() {
    // Verificar si tiene acceso a historial según plan
    if (!isTrialActive && !checkFeatureAccess('historyDays')) {
        return;
    }
    
    try {
        const historyJson = localStorage.getItem(STORAGE_KEY);
        if (!historyJson) {
            alert(UI_TEXTS.NO_HISTORY);
            return;
        }
        
        const history = JSON.parse(historyJson);
        if (history.length === 0) {
            alert(UI_TEXTS.NO_HISTORY);
            return;
        }
        
        // Limit history entries based on plan
        let displayedHistory = [...history];
        const historyDaysLimit = isTrialActive
            ? SUBSCRIPTION_CONFIG.PRO.historyDays
            : SUBSCRIPTION_CONFIG[currentUserPlan].historyDays;
            
        if (historyDaysLimit > 0) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - historyDaysLimit);
            
            displayedHistory = history.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= cutoffDate;
            });
        }
        
        // Create overlay for history
        const historyOverlay = document.createElement("div");
        historyOverlay.className = "iu_history-overlay";
        historyOverlay.style = "position:fixed; top:0; left:0; right:0; bottom:0; background-color:rgba(0,0,0,0.9); z-index:100; overflow-y:auto; padding:20px;";
        
        let historyHTML = `
            <h2 style="text-align:center; margin-bottom:20px; color:white;">${UI_TEXTS.HISTORY_TITLE}</h2>
            <button class="iu_close-history" style="position:absolute; top:10px; right:10px; font-size:20px; color:white; background:none; border:none; cursor:pointer;">✖</button>
        `;

        historyHTML += `
            <div style="text-align:center; margin-bottom:20px;">
                <button class="iu_clear-history-btn" style="background-color:#dc3545; color:white; border:none; padding:8px 15px; border-radius:20px; cursor:pointer; margin:0 5px;">Borrar historial (excepto último)</button>
            </div>
        `;

        // Añadir controles de exportación (solo para planes premium/pro)
        if (isTrialActive || checkFeatureAccess('export')) {
            historyHTML += `
                <div style="text-align:center; margin-bottom:20px;">
                    <button class="iu_export-csv" style="background-color:#4CAF50; color:white; border:none; padding:8px 15px; border-radius:20px; cursor:pointer; margin:0 5px;">Exportar CSV</button>
                    <button class="iu_export-excel" style="background-color:#2196F3; color:white; border:none; padding:8px 15px; border-radius:20px; cursor:pointer; margin:0 5px;">Exportar Excel</button>
                </div>
            `;
        }
        
        // Si no está en trial y es plan gratuito, mostrar mensaje de límite
        if (!isTrialActive && currentUserPlan === "FREE" && history.length > displayedHistory.length) {
            historyHTML += `
                <div style="margin:0 auto 20px; padding:10px; text-align:center; background-color:#FFF3CD; color:#856404; border-radius:5px; max-width:600px;">
                    <strong>Límite de plan:</strong> Mostrando el historial de los últimos ${historyDaysLimit} días.
                    <button class="iu_upgrade-btn-inline" style="background-color:#007BFF; color:white; border:none; padding:5px 10px; border-radius:15px; cursor:pointer; margin-left:10px;">Actualizar</button>
                </div>
            `;
        }
        
        // Build table for each history entry
        displayedHistory.forEach((entry, index) => {
            const date = new Date(entry.date).toLocaleDateString();
            historyHTML += `
                <div style="margin-bottom:30px; background-color:#333; padding:15px; border-radius:5px;">
                    <h3 style="color:white; margin-bottom:10px;">${date} (${entry.unfollowers.length} ${UI_TEXTS.HISTORY_COUNT})</h3>
                    <div style="max-height:300px; overflow-y:auto;">
                        <table style="width:100%; border-collapse:collapse; color:white;">
                            <thead>
                                <tr>
                                    <th style="text-align:left; padding:8px; border-bottom:1px solid #555;">${UI_TEXTS.COLUMN_USER}</th>
                                    <th style="text-align:left; padding:8px; border-bottom:1px solid #555;">${UI_TEXTS.COLUMN_NAME}</th>
                                    <th style="text-align:center; padding:8px; border-bottom:1px solid #555;">${UI_TEXTS.COLUMN_VERIFIED}</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // Add each unfollower to the table
            entry.unfollowers.sort((a, b) => a.username.localeCompare(b.username))
                .forEach(user => {
                    historyHTML += `
                        <tr>
                            <td style="padding:8px; border-bottom:1px solid #555;">
                                <a href="https://instagram.com/${user.username}" target="_blank" style="color:inherit; text-decoration:none; display:flex; align-items:center;">
                                    <img src="${user.profile_pic_url}" style="width:30px; height:30px; border-radius:50%; margin-right:10px;" />
                                    ${user.username}
                                </a>
                            </td>
                            <td style="padding:8px; border-bottom:1px solid #555;">${user.full_name}</td>
                            <td style="padding:8px; border-bottom:1px solid #555; text-align:center;">${user.is_verified ? '✅' : ''}</td>
                        </tr>
                    `;
                });
            
            historyHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        
        historyOverlay.innerHTML = historyHTML;
        document.body.appendChild(historyOverlay);
        
        // Handle close button
        document.querySelector(".iu_close-history").addEventListener("click", () => {
            historyOverlay.remove();
        });
        
        document.querySelector(".iu_clear-history-btn").addEventListener("click", clearHistoryExceptLatest);

        // Handle export buttons
        if (isTrialActive || checkFeatureAccess('export')) {
            document.querySelector(".iu_export-csv")?.addEventListener("click", () => {
                exportData("csv");
            });
            
            document.querySelector(".iu_export-excel")?.addEventListener("click", () => {
                exportData("excel");
            });
        }
        
        // Handle upgrade button
        document.querySelector(".iu_upgrade-btn-inline")?.addEventListener("click", () => {
            historyOverlay.remove();
            showUpgradeModal('historyDays');
        });
        
    } catch (error) {
        console.error("Error showing history:", error);
        alert(UI_TEXTS.HISTORY_ERROR);
    }
}

// ====================================
// FUNCIONES PREMIUM
// ====================================

// Exportar datos (premium)
function exportData(format) {
    if (!isTrialActive && !checkFeatureAccess('export')) {
        return;
    }
    
    try {
        const historyJson = localStorage.getItem(STORAGE_KEY);
        if (!historyJson) {
            alert(UI_TEXTS.NO_HISTORY);
            return;
        }
        
        const history = JSON.parse(historyJson);
        
        // Preparar datos para exportación
        let csvContent = "";
        let fileName = "";
        
        if (format === "csv") {
            // Crear CSV
            csvContent = "Fecha,Usuario,Nombre,Verificado,Privado\n";
            
            history.forEach(entry => {
                const date = new Date(entry.date).toLocaleDateString();
                
                entry.unfollowers.forEach(user => {
                    csvContent += `${date},"${user.username}","${user.full_name}",${user.is_verified},${user.is_private}\n`;
                });
            });
            
            fileName = "instagram_unfollowers.csv";
        } else if (format === "excel") {
            // En realidad creamos CSV pero con otra extensión para Excel
            csvContent = "Fecha,Usuario,Nombre,Verificado,Privado\n";
            
            history.forEach(entry => {
                const date = new Date(entry.date).toLocaleDateString();
                
                entry.unfollowers.forEach(user => {
                    csvContent += `${date},"${user.username}","${user.full_name}",${user.is_verified},${user.is_private}\n`;
                });
            });
            
            fileName = "instagram_unfollowers.xls";
        }
        
        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error("Error exporting data:", error);
        alert("Error al exportar datos");
    }
}

// ====================================
// INICIALIZACIÓN
// ====================================

function init() {
    if (location.hostname === INSTAGRAM_HOSTNAME) {
        document.title = UI_TEXTS.TITLE;
        renderOverlay();
    } else {
        alert(UI_TEXTS.INSTAGRAM_ONLY);
    }
}

// Event listener to prompt when trying to leave the page during an active process
window.addEventListener("beforeunload", event => {
    if (isActiveProcess) {
        const warningMessage = "Changes you made may not be saved.";
        event = event || {};
        event.returnValue = warningMessage;
        return warningMessage;
    }
});

// Toggle a user's selection state
window.toggleUser = userId => {
    if (userIdsToUnfollow.includes(userId)) {
        userIdsToUnfollow = userIdsToUnfollow.filter(id => id !== userId);
    } else {
        userIdsToUnfollow.push(userId);
    }
    onToggleUser();
};

// Toggle all users' selection state
window.toggleAllUsers = (isSelected = false) => {
    const checkboxes = document.querySelectorAll(".iu_account-checkbox");
    checkboxes.forEach(checkbox => checkbox.checked = isSelected);

    userIdsToUnfollow = isSelected ? nonFollowersList.map(user => user.id) : [];
    onToggleUser();
};

// Initiate the unfollow process
window.unfollow = async () => {
    if (isActiveProcess) return;
    if (!confirm(UI_TEXTS.CONFIRM_UNFOLLOW)) return;

    if (!USER_CSRFTOKEN) {
        alert(UI_TEXTS.CSRF_ERROR);
        return;
    }

    const sleepContainer = getElementByClass(".iu_sleeping-container");
    getElementByClass(".iu_toggle-all-checkbox").disabled = true;

    const resultsContainer = getElementByClass(".iu_results-container");
    resultsContainer.innerHTML = "";

    const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);
    isActiveProcess = true;

    let processedCount = 0;
    for (const userId of userIdsToUnfollow) {
        const user = getUserById(userId);
        if (!user) continue;
        
        try {
            await fetch(unfollowUserUrlGenerator(userId), {
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "x-csrftoken": USER_CSRFTOKEN
                },
                method: "POST",
                mode: "cors",
                credentials: "include"
            });
            
            resultsContainer.innerHTML += `
                <div style='padding:1rem;'>
                    Unfollowed 
                    <a style='color:inherit' target='_blank' href='https://www.instagram.com/${user.username}/'>
                        ${user.username}
                    </a>
                    <span style='color:#00ffff'> [${processedCount + 1}/${userIdsToUnfollow.length}]</span>
                </div>`;
        } catch (error) {
            resultsContainer.innerHTML += `
                <div style='padding:1rem;color:red;'>
                    Failed to unfollow ${user.username} [${processedCount + 1}/${userIdsToUnfollow.length}]
                </div>`;
        }

        scrollToBottom();
        await sleep(Math.floor(2000 * Math.random()) + 4000);

        processedCount++;
        if (processedCount % 5 === 0) {
            sleepContainer.style.display = "block";
            sleepContainer.innerHTML = UI_TEXTS.SLEEPING_LONG;
            scrollToBottom();
            await sleep(300000); // Sleep for 5 minutes
            sleepContainer.style.display = "none";
        }
    }

    isActiveProcess = false;
    resultsContainer.innerHTML += `<hr /><div style='padding:1rem;font-size:1.25em;color:#56d756;'>${UI_TEXTS.ALL_DONE}</div><hr />`;
    scrollToBottom();
};

function fallbackCopyToClipboard(text) {
    try {
        // Crear un campo de texto temporal
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Configurar el campo para que no sea visible
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        
        // Seleccionar y copiar el texto
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            alert(UI_TEXTS.COPY_SUCCESS);
        } else {
            alert("No se pudo copiar la lista. Por favor intenta manualmente: selecciona los nombres y usa CTRL+C");
        }
    } catch (err) {
        console.error('Error en fallbackCopyToClipboard:', err);
        alert("Error al copiar la lista. Por favor intenta de nuevo.");
    }
}

/**
 * Borra todo el historial excepto la entrada más reciente
 */
function clearHistoryExceptLatest() {
    try {
        const historyJson = localStorage.getItem(STORAGE_KEY);
        if (!historyJson) {
            alert("No hay historial para borrar");
            return;
        }
        
        const history = JSON.parse(historyJson);
        if (history.length <= 1) {
            alert("Solo hay una entrada en el historial. No hay nada que borrar.");
            return;
        }
        
        // Guardar solo la entrada más reciente
        const latestEntry = history[history.length - 1];
        
        // Crear nuevo array solo con la última entrada
        const newHistory = [latestEntry];
        
        // Guardar el nuevo historial
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        
        alert("Historial borrado correctamente. Se ha conservado solo la entrada más reciente.");
        
        // Si el overlay de historial está abierto, actualizarlo
        const historyOverlay = document.querySelector('.iu_history-overlay');
        if (historyOverlay) {
            historyOverlay.remove();
            showHistoryOverlay(); // Volver a mostrar con el historial actualizado
        }
        
    } catch (error) {
        console.error("Error borrando historial:", error);
        alert("Error al borrar el historial. Por favor intenta de nuevo.");
    }
}

// Initialize
init();