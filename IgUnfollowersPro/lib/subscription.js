/**
 * Instagram Unfollowers Pro
 * Módulo de gestión de suscripciones
 */

class SubscriptionManager {
    constructor() {
        this.USER_DATA_KEY = "instagram_unfollowers_user_data";
        this.TRIAL_DAYS = 7;
        this.currentPlan = "FREE";
        this.isTrialActive = false;
        this.trialDaysLeft = 0;
        this.trialStartDate = null;
        this.subscriptionExpiry = null;
    }

    /**
     * Inicializa el estado de suscripción del usuario
     */
    async initialize() {
        try {
            // Obtener datos de usuario guardados
            const userData = await this.getUserData();
            
            if (!userData) {
                // Nuevo usuario - crear perfil con prueba gratuita
                const newUserData = {
                    subscriptionPlan: "FREE",
                    trialStartDate: new Date().toISOString(),
                    subscriptionExpiry: null,
                    installDate: new Date().toISOString()
                };
                
                // Guardar datos
                await this.saveUserData(newUserData);
                
                // Actualizar estado actual
                this.currentPlan = "FREE";
                this.isTrialActive = true;
                this.trialDaysLeft = this.TRIAL_DAYS;
                this.trialStartDate = new Date();
                
                return {
                    plan: this.currentPlan,
                    isTrialActive: this.isTrialActive,
                    trialDaysLeft: this.trialDaysLeft
                };
            }
            
            // Usuario existente - cargar datos
            this.currentPlan = userData.subscriptionPlan || "FREE";
            this.subscriptionExpiry = userData.subscriptionExpiry ? new Date(userData.subscriptionExpiry) : null;
            
            // Verificar si la suscripción ha expirado
            if (this.subscriptionExpiry && new Date() > this.subscriptionExpiry && this.currentPlan !== "FREE") {
                this.currentPlan = "FREE";
                userData.subscriptionPlan = "FREE";
                await this.saveUserData(userData);
            }
            
            // Verificar estado de prueba
            if (userData.trialStartDate) {
                this.trialStartDate = new Date(userData.trialStartDate);
                const now = new Date();
                const diffTime = Math.abs(now - this.trialStartDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= this.TRIAL_DAYS) {
                    this.isTrialActive = true;
                    this.trialDaysLeft = this.TRIAL_DAYS - diffDays;
                } else {
                    this.isTrialActive = false;
                    this.trialDaysLeft = 0;
                }
            }
            
            return {
                plan: this.currentPlan,
                isTrialActive: this.isTrialActive,
                trialDaysLeft: this.trialDaysLeft
            };
            
        } catch (error) {
            console.error("Error initializing subscription:", error);
            // Por defecto, plan gratuito sin prueba
            return {
                plan: "FREE",
                isTrialActive: false,
                trialDaysLeft: 0
            };
        }
    }

    /**
     * Verifica si el usuario tiene acceso a una característica
     * @param {string} feature - Nombre de la característica a verificar
     * @param {object} featureConfig - Configuración de las características por plan
     * @returns {boolean} - true si tiene acceso, false si no
     */
    checkFeatureAccess(feature, featureConfig) {
        // Durante período de prueba, acceso completo
        if (this.isTrialActive) {
            return true;
        }
        
        // Verificar según plan actual
        const planConfig = featureConfig[this.currentPlan];
        
        if (!planConfig || planConfig[feature] === false) {
            return false;
        }
        
        return true;
    }

    /**
     * Simula el proceso de actualización a un plan superior
     * @param {string} newPlan - Plan al que actualizar: "PREMIUM" o "PRO"
     * @returns {Promise<object>} - Resultado de la operación
     */
    async upgradeToPlan(newPlan) {
        try {
            if (newPlan !== "PREMIUM" && newPlan !== "PRO") {
                throw new Error("Plan no válido");
            }
            
            // Obtener datos actuales
            const userData = await this.getUserData();
            if (!userData) {
                throw new Error("No se pudo obtener información del usuario");
            }
            
            // Actualizar plan
            userData.subscriptionPlan = newPlan;
            
            // Configurar fecha de expiración (1 mes)
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            userData.subscriptionExpiry = expiryDate.toISOString();
            
            // Si está actualizando, terminar período de prueba
            this.isTrialActive = false;
            this.trialDaysLeft = 0;
            
            // Guardar cambios
            await this.saveUserData(userData);
            
            // Actualizar variables internas
            this.currentPlan = newPlan;
            this.subscriptionExpiry = expiryDate;
            
            // Informar del cambio a la aplicación principal
            this.notifyPlanChange();
            
            return {
                success: true,
                plan: newPlan,
                expiryDate: expiryDate
            };
            
        } catch (error) {
            console.error("Error upgrading plan:", error);
            return {
                success: false,
                error: error.message || "Error desconocido al actualizar plan"
            };
        }
    }

    /**
     * Notificar cambio de plan a la ventana principal
     */
    notifyPlanChange() {
        // Enviar mensaje a la aplicación principal
        if (typeof window !== 'undefined') {
            window.postMessage({
                type: 'INSTAGRAM_UNFOLLOWERS_PRO',
                action: 'planChanged',
                plan: this.currentPlan,
                isTrialActive: this.isTrialActive,
                trialDaysLeft: this.trialDaysLeft
            }, '*');
        }
    }

    /**
     * Obtiene datos del usuario desde localStorage o extensión
     * @returns {Promise<object|null>} - Datos del usuario o null si no existen
     */
    async getUserData() {
        return new Promise((resolve) => {
            // Verificar si estamos en contexto de extensión
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([this.USER_DATA_KEY], (result) => {
                    resolve(result[this.USER_DATA_KEY] || null);
                });
            } else if (typeof window !== 'undefined' && window.localStorage) {
                // Contexto web normal
                try {
                    const data = localStorage.getItem(this.USER_DATA_KEY);
                    resolve(data ? JSON.parse(data) : null);
                } catch (e) {
                    console.error("Error reading from localStorage:", e);
                    resolve(null);
                }
            } else {
                console.error("No storage mechanism available");
                resolve(null);
            }
        });
    }

    /**
     * Guarda datos del usuario en el almacenamiento adecuado
     * @param {object} userData - Datos a guardar
     * @returns {Promise<boolean>} - true si se guardó correctamente
     */
    async saveUserData(userData) {
        return new Promise((resolve, reject) => {
            // Verificar si estamos en contexto de extensión
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [this.USER_DATA_KEY]: userData }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(true);
                    }
                });
            } else if (typeof window !== 'undefined' && window.localStorage) {
                // Contexto web normal
                try {
                    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
                    resolve(true);
                } catch (e) {
                    console.error("Error writing to localStorage:", e);
                    reject(e);
                }
            } else {
                reject(new Error("No storage mechanism available"));
            }
        });
    }
}

// Exportar el gestor de suscripciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubscriptionManager;
} else if (typeof window !== 'undefined') {
    window.SubscriptionManager = SubscriptionManager;
}