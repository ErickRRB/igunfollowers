// Instagram Unfollowers Pro - Script de inyección
(function() {
    let isScriptInjected = false;
    let isAnalysisRunning = false;
    
    // Constantes
    const INSTAGRAM_HOSTNAME = "www.instagram.com";
    const USER_DATA_KEY = "instagram_unfollowers_user_data";
    
    // Verificar si estamos en Instagram
    if (window.location.hostname !== INSTAGRAM_HOSTNAME) {
        return;
    }
    
    // Escuchar mensajes del popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'checkStatus') {
            const isLoggedIn = document.cookie.includes('ds_user_id=');
            sendResponse({
                isRunning: isAnalysisRunning,
                isLoggedIn: isLoggedIn
            });
            return true;
        }
        
        if (message.action === 'runAnalysis') {
            injectMainScript();
            return true;
        }
        
        if (message.action === 'showUpgrade') {
            if (isScriptInjected) {
                // Si el script ya está inyectado, mostrar modal de upgrade
                window.postMessage({ type: 'INSTAGRAM_UNFOLLOWERS_PRO', action: 'showUpgrade' }, '*');
            } else {
                // Inyectar script primero
                injectMainScript();
                // Esperar un poco para asegurarse de que el script esté listo
                setTimeout(() => {
                    window.postMessage({ type: 'INSTAGRAM_UNFOLLOWERS_PRO', action: 'showUpgrade' }, '*');
                }, 1000);
            }
            return true;
        }
    });
    
    // Función para inyectar el script principal
    function injectMainScript() {
        if (isScriptInjected) {
            // Si ya está inyectado, solo mandar mensaje para iniciar análisis
            window.postMessage({ type: 'INSTAGRAM_UNFOLLOWERS_PRO', action: 'runAnalysis' }, '*');
            isAnalysisRunning = true;
            return;
        }
        
        // Cargar el script principal de unfollowers.js
        const scriptUrl = chrome.runtime.getURL('content/unfollowers.js');
        
        // Crear elemento script
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.onload = function() {
            isScriptInjected = true;
            isAnalysisRunning = true;
            
            // Una vez cargado, mandar mensaje para iniciar análisis
            window.postMessage({ type: 'INSTAGRAM_UNFOLLOWERS_PRO', action: 'runAnalysis' }, '*');
            
            // Eliminar elemento script (opcional)
            this.remove();
        };
        
        // Inyectar script en la página
        (document.head || document.documentElement).appendChild(script);
        
        // Escuchar mensajes del script principal
        window.addEventListener('message', function(event) {
            // Asegurarse de que el mensaje viene de nuestra aplicación
            if (event.data.type !== 'INSTAGRAM_UNFOLLOWERS_PRO') {
                return;
            }
            
            // Manejar diferentes acciones
            if (event.data.action === 'analysisStarted') {
                isAnalysisRunning = true;
                
                // Notificar al background script
                chrome.runtime.sendMessage({
                    action: 'trackEvent',
                    event: 'analysisStarted'
                });
            }
            
            if (event.data.action === 'analysisCompleted') {
                isAnalysisRunning = false;
                
                // Notificar al background script
                chrome.runtime.sendMessage({
                    action: 'trackEvent',
                    event: 'analysisCompleted',
                    data: { 
                        count: event.data.count,
                        timeElapsed: event.data.timeElapsed
                    }
                });
            }
            
            if (event.data.action === 'saveUserData') {
                // Guardar datos de usuario en el almacenamiento de la extensión
                chrome.storage.local.set({
                    [USER_DATA_KEY]: event.data.userData
                });
            }
            
            if (event.data.action === 'getUserData') {
                // Obtener datos del usuario del almacenamiento
                chrome.storage.local.get([USER_DATA_KEY], function(result) {
                    window.postMessage({
                        type: 'INSTAGRAM_UNFOLLOWERS_PRO',
                        action: 'userDataResponse',
                        userData: result[USER_DATA_KEY] || null
                    }, '*');
                });
            }
        });
    }
    
    // Si la página se carga completamente, verificar configuración para auto-inicio
    document.addEventListener('DOMContentLoaded', function() {
        chrome.storage.local.get(['autoStart'], function(result) {
            if (result.autoStart === true) {
                // Auto-iniciar análisis
                injectMainScript();
            }
        });
    });
})();