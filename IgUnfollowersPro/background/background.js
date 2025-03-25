// Background script para Instagram Unfollowers Pro
const TRIAL_NOTIFICATION_ID = 'trial-notification';
const USER_DATA_KEY = "instagram_unfollowers_user_data";
const TRIAL_DAYS = 7;

// Cuando se instala la extensión
chrome.runtime.onInstalled.addListener(async function(details) {
    if (details.reason === 'install') {
        // Inicializar datos de usuario
        const userData = {
            subscriptionPlan: "FREE",
            trialStartDate: new Date().toISOString(),
            subscriptionExpiry: null,
            installDate: new Date().toISOString()
        };
        
        // Guardar en almacenamiento local
        await chrome.storage.local.set({ [USER_DATA_KEY]: userData });
        
        // Configuración por defecto
        await chrome.storage.local.set({
            autoStart: false,
            showNotifications: true,
            unfollowersCount: 0,
            lastAnalysisDate: null
        });
        
        // Abrir página de bienvenida
        chrome.tabs.create({ url: 'https://www.instagramunfollowerspro.com/welcome' });
        
        // Programar recordatorio para el fin de prueba
        scheduleTrialEndReminder();
    }
    
    if (details.reason === 'update') {
        // Verificar si hay actualizaciones necesarias en datos
        const data = await chrome.storage.local.get([USER_DATA_KEY]);
        if (data[USER_DATA_KEY]) {
            // Datos existentes, verificar si necesitan actualización
            const userData = data[USER_DATA_KEY];
            let needsUpdate = false;
            
            // Ejemplo: añadir nuevos campos si no existen
            if (!userData.hasOwnProperty('installDate')) {
                userData.installDate = new Date().toISOString();
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await chrome.storage.local.set({ [USER_DATA_KEY]: userData });
            }
        }
    }
});

// Programar alarma para verificar fin de prueba
function scheduleTrialEndReminder() {
    // Configurar alarma para verificar diariamente
    chrome.alarms.create('checkTrialStatus', {
        delayInMinutes: 60 * 24, // 24 horas
        periodInMinutes: 60 * 24 // Repetir cada 24 horas
    });
}

// Escuchar eventos de alarmas
chrome.alarms.onAlarm.addListener(async function(alarm) {
    if (alarm.name === 'checkTrialStatus') {
        await checkTrialStatus();
    }
});

// Verificar estado de prueba
async function checkTrialStatus() {
    const data = await chrome.storage.local.get([USER_DATA_KEY]);
    if (!data[USER_DATA_KEY]) return;
    
    const userData = data[USER_DATA_KEY];
    
    // Si no está en prueba o ya tiene un plan pagado, no continuar
    if (!userData.trialStartDate || userData.subscriptionPlan !== "FREE") {
        return;
    }
    
    const trialStart = new Date(userData.trialStartDate);
    const now = new Date();
    const diffTime = Math.abs(now - trialStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Verificar días restantes
    if (diffDays === TRIAL_DAYS - 1) {
        // Queda 1 día de prueba
        showTrialNotification("¡Tu prueba termina mañana!", 
            "Actualiza tu plan para continuar disfrutando de todas las funciones.");
    } else if (diffDays >= TRIAL_DAYS) {
        // Prueba terminada
        showTrialNotification("Tu período de prueba ha terminado", 
            "Actualiza a Premium para seguir disfrutando de todas las funciones.");
    }
}

// Mostrar notificación de prueba
function showTrialNotification(title, message) {
    chrome.storage.local.get(['showNotifications'], function(result) {
        if (result.showNotifications === false) return;
        
        chrome.notifications.create(TRIAL_NOTIFICATION_ID, {
            type: 'basic',
            iconUrl: '/assets/images/icon128.png',
            title: title,
            message: message,
            buttons: [
                { title: 'Actualizar ahora' },
                { title: 'Recordar después' }
            ],
            priority: 2
        });
    });
}

// Escuchar clicks en notificaciones
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    if (notificationId === TRIAL_NOTIFICATION_ID) {
        if (buttonIndex === 0) {
            // Abrir página de actualización
            chrome.tabs.create({ url: 'https://www.instagramunfollowerspro.com/upgrade' });
        }
        // Cerrar notificación
        chrome.notifications.clear(TRIAL_NOTIFICATION_ID);
    }
});

// Escuchar mensajes de content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'trackEvent') {
        // Aquí puedes implementar analítica de uso anónima
        console.log('Tracking event:', message.event, message.data || {});
        
        // Si el análisis se completó, actualizar contador
        if (message.event === 'analysisCompleted') {
            updateAnalysisStats(message.data);
        }
    }
    
    if (message.action === 'getUserData') {
        chrome.storage.local.get([USER_DATA_KEY], function(result) {
            sendResponse(result[USER_DATA_KEY] || null);
        });
        return true; // Mantener la conexión abierta para respuesta asíncrona
    }
    
    if (message.action === 'saveUserData') {
        chrome.storage.local.set({ [USER_DATA_KEY]: message.userData }, function() {
            sendResponse({ success: true });
        });
        return true; // Mantener la conexión abierta para respuesta asíncrona
    }
});

// Actualizar estadísticas de análisis
async function updateAnalysisStats(data) {
    const stats = await chrome.storage.local.get(['unfollowersCount', 'lastAnalysisDate']);
    
    await chrome.storage.local.set({
        unfollowersCount: data.count || 0,
        lastAnalysisDate: new Date().toISOString()
    });
}