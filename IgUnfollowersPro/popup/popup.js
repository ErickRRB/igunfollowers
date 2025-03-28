document.addEventListener('DOMContentLoaded', async function() {
    const USER_DATA_KEY = "instagram_unfollowers_user_data";
    
    // Elementos UI
    const notInstagramCard = document.getElementById('not-instagram');
    const onInstagramCard = document.getElementById('on-instagram');
    const needsLoginCard = document.getElementById('needs-login');
    const alreadyRunningCard = document.getElementById('already-running');
    const subscriptionBadge = document.getElementById('subscriptionBadge');
    const trialInfo = document.getElementById('trialInfo');
    const freeInfo = document.getElementById('freeInfo');
    const premiumInfo = document.getElementById('premiumInfo');
    const proInfo = document.getElementById('proInfo');
    const trialDaysLeft = document.getElementById('trialDaysLeft');
    
    // Botones
    const goToInstagramBtn = document.getElementById('goToInstagram');
    const runAnalysisBtn = document.getElementById('runAnalysis');
    const refreshPageBtn = document.getElementById('refreshPage');
    const upgradePlanBtn = document.getElementById('upgradePlan');
    const privacyLink = document.getElementById('privacyLink');
    const termsLink = document.getElementById('termsLink');
    const contactLink = document.getElementById('contactLink');
    
    // Escuchar eventos de clic en botones
    goToInstagramBtn.addEventListener('click', openInstagram);
    runAnalysisBtn.addEventListener('click', startAnalysis);
    refreshPageBtn.addEventListener('click', refreshPage);
    upgradePlanBtn.addEventListener('click', showUpgradeOptions);
    privacyLink.addEventListener('click', openPrivacyPolicy);
    termsLink.addEventListener('click', openTerms);
    contactLink.addEventListener('click', openContact);
    
    // Obtener la pestaña activa
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        let activeTab = tabs && tabs.length > 0 ? tabs[0] : null;
        
        if (activeTab && activeTab.url && activeTab.url.includes('instagram.com')) {
            // Estamos en Instagram, verificar si ya está ejecutándose o si el usuario está logueado
            checkInstagramStatus(activeTab.id);
        } else {
            // No estamos en Instagram
            showNotInstagramCard();
        }
    } catch (error) {
        console.error("Error obteniendo la pestaña activa:", error);
        showNotInstagramCard();
    }
    
    // Cargar datos de suscripción
    loadSubscriptionData();
    
    // Funciones
    function showNotInstagramCard() {
        notInstagramCard.style.display = 'block';
        onInstagramCard.style.display = 'none';
        needsLoginCard.style.display = 'none';
        alreadyRunningCard.style.display = 'none';
    }
    
    function openInstagram() {
        chrome.tabs.create({ url: 'https://www.instagram.com/' });
        window.close();
    }
    
    async function startAnalysis() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0) {
                // Mensaje a la pestaña para ejecutar el análisis
                chrome.tabs.sendMessage(tabs[0].id, { action: 'runAnalysis' })
                    .catch(error => console.log("Error enviando mensaje, podría ser normal si content script no está cargado:", error));
                window.close();
            }
        } catch (error) {
            console.error("Error iniciando análisis:", error);
        }
    }
    
    function refreshPage() {
        try {
            const tabs = chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0) {
                chrome.tabs.reload(tabs[0].id);
            }
        } catch (error) {
            console.error("Error recargando página:", error);
        }
        window.close();
    }
    
    function showUpgradeOptions() {
        try {
            const tabs = chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'showUpgrade' })
                    .catch(error => console.log("Error enviando mensaje, podría ser normal si content script no está cargado:", error));
            }
        } catch (error) {
            console.error("Error mostrando opciones de actualización:", error);
        }
        window.close();
    }
    
    function openPrivacyPolicy() {
        chrome.tabs.create({ url: 'https://www.instagramunfollowerspro.com/privacy' });
    }
    
    function openTerms() {
        chrome.tabs.create({ url: 'https://www.instagramunfollowerspro.com/terms' });
    }
    
    function openContact() {
        chrome.tabs.create({ url: 'https://www.instagramunfollowerspro.com/contact' });
    }
    
    async function checkInstagramStatus(tabId) {
        try {
            // Verificar estado en Instagram (si está ejecutándose o si necesita login)
            const response = await chrome.tabs.sendMessage(tabId, { action: 'checkStatus' });
            
            if (response && response.isRunning) {
                // Ya está ejecutándose
                notInstagramCard.style.display = 'none';
                onInstagramCard.style.display = 'none';
                needsLoginCard.style.display = 'none';
                alreadyRunningCard.style.display = 'block';
            } else if (response && response.isLoggedIn) {
                // Usuario logueado, mostrar opción para iniciar
                notInstagramCard.style.display = 'none';
                onInstagramCard.style.display = 'block';
                needsLoginCard.style.display = 'none';
                alreadyRunningCard.style.display = 'none';
            } else {
                // Necesita login
                notInstagramCard.style.display = 'none';
                onInstagramCard.style.display = 'none';
                needsLoginCard.style.display = 'block';
                alreadyRunningCard.style.display = 'none';
            }
        } catch (error) {
            console.log("Error comprobando estado, posiblemente content script no inicializado:", error);
            // La extensión probablemente no está inicializada en la página
            notInstagramCard.style.display = 'none';
            onInstagramCard.style.display = 'block';
            needsLoginCard.style.display = 'none';
            alreadyRunningCard.style.display = 'none';
        }
    }
    
    async function loadSubscriptionData() {
        try {
            // Obtener datos de suscripción de localStorage
            const userData = await new Promise((resolve) => {
                chrome.storage.local.get(USER_DATA_KEY, (result) => {
                    resolve(result[USER_DATA_KEY] || null);
                });
            });
            
            if (!userData) {
                // Usuario nuevo o sin datos
                subscriptionBadge.textContent = "GRATIS";
                freeInfo.style.display = 'flex';
                return;
            }
            
            // Verificar tipo de plan
            if (userData.subscriptionPlan === "FREE") {
                subscriptionBadge.textContent = "GRATIS";
                freeInfo.style.display = 'flex';
            } else if (userData.subscriptionPlan === "PREMIUM") {
                subscriptionBadge.textContent = "PREMIUM";
                premiumInfo.style.display = 'flex';
            } else if (userData.subscriptionPlan === "PRO") {
                subscriptionBadge.textContent = "PRO";
                proInfo.style.display = 'flex';
            }
            
            // Verificar período de prueba
            if (userData.trialStartDate) {
                const trialStart = new Date(userData.trialStartDate);
                const now = new Date();
                const diffTime = Math.abs(now - trialStart);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Configuración de prueba (7 días)
                const TRIAL_DAYS = 7;
                
                if (diffDays <= TRIAL_DAYS) {
                    const daysLeft = TRIAL_DAYS - diffDays;
                    trialDaysLeft.textContent = daysLeft;
                    trialInfo.style.display = 'flex';
                    
                    // Badge especial de prueba
                    subscriptionBadge.textContent = "PRUEBA";
                    subscriptionBadge.style.background = "linear-gradient(135deg, #4CAF50, #8BC34A)";
                }
            }
            
        } catch (error) {
            console.error("Error loading subscription data:", error);
            subscriptionBadge.textContent = "GRATIS";
            freeInfo.style.display = 'flex';
        }
    }
});