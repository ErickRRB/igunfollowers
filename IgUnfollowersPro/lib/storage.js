/**
 * Instagram Unfollowers Pro
 * Módulo de gestión de almacenamiento
 */

class StorageManager {
    constructor() {
        this.HISTORY_KEY = "instagram_unfollowers_history";
        this.SETTINGS_KEY = "instagram_unfollowers_settings";
        this.isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    }

    /**
     * Guarda datos en el almacenamiento (localStorage o extensión)
     * @param {string} key - Clave para guardar los datos
     * @param {any} data - Datos a guardar (serán serializados como JSON)
     * @returns {Promise<boolean>} - true si se guardó correctamente
     */
    async saveData(key, data) {
        return new Promise((resolve, reject) => {
            const jsonData = JSON.stringify(data);
            
            if (this.isExtension) {
                // Almacenamiento de la extensión
                const saveObj = {};
                saveObj[key] = jsonData;
                
                chrome.storage.local.set(saveObj, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(true);
                    }
                });
            } else {
                // Usar localStorage
                try {
                    localStorage.setItem(key, jsonData);
                    resolve(true);
                } catch (error) {
                    console.error("Error saving data:", error);
                    reject(error);
                }
            }
        });
    }

    /**
     * Obtiene datos del almacenamiento
     * @param {string} key - Clave para obtener los datos
     * @returns {Promise<any>} - Datos obtenidos (ya deserializados)
     */
    async getData(key) {
        return new Promise((resolve, reject) => {
            if (this.isExtension) {
                // Almacenamiento de la extensión
                chrome.storage.local.get([key], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        try {
                            const data = result[key] ? JSON.parse(result[key]) : null;
                            resolve(data);
                        } catch (error) {
                            console.error("Error parsing data:", error);
                            reject(error);
                        }
                    }
                });
            } else {
                // Usar localStorage
                try {
                    const jsonData = localStorage.getItem(key);
                    const data = jsonData ? JSON.parse(jsonData) : null;
                    resolve(data);
                } catch (error) {
                    console.error("Error getting data:", error);
                    reject(error);
                }
            }
        });
    }

    /**
     * Guarda un historial de unfollowers
     * @param {array} unfollowers - Lista de unfollowers a guardar
     * @param {number} maxHistoryDays - Número máximo de días a mantener en historial
     * @returns {Promise<boolean>} - true si se guardó correctamente
     */
    async saveUnfollowersHistory(unfollowers, maxHistoryDays = 7) {
        try {
            // Obtener historial existente
            const history = await this.getUnfollowersHistory() || [];
            
            // Crear nueva entrada
            const entry = {
                date: new Date().toISOString(),
                unfollowers: unfollowers.map(user => ({
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name || "",
                    profile_pic_url: user.profile_pic_url || "",
                    is_verified: !!user.is_verified,
                    is_private: !!user.is_private
                }))
            };
            
            // Añadir al historial
            history.push(entry);
            
            // Limpiar entradas antiguas según límite
            let cleanedHistory = history;
            if (maxHistoryDays > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - maxHistoryDays);
                
                cleanedHistory = history.filter(entry => {
                    const entryDate = new Date(entry.date);
                    return entryDate >= cutoffDate;
                });
            }
            
            // Guardar historial actualizado
            await this.saveData(this.HISTORY_KEY, cleanedHistory);
            return true;
            
        } catch (error) {
            console.error("Error saving unfollowers history:", error);
            return false;
        }
    }

    /**
     * Obtiene el historial de unfollowers
     * @returns {Promise<Array>} - Historial de unfollowers
     */
    async getUnfollowersHistory() {
        try {
            const history = await this.getData(this.HISTORY_KEY);
            return Array.isArray(history) ? history : [];
        } catch (error) {
            console.error("Error getting unfollowers history:", error);
            return [];
        }
    }

    /**
     * Guarda configuración de la aplicación
     * @param {object} settings - Configuración a guardar
     * @returns {Promise<boolean>} - true si se guardó correctamente
     */
    async saveSettings(settings) {
        try {
            // Obtener configuración existente
            const existingSettings = await this.getSettings() || {};
            
            // Fusionar con nueva configuración
            const updatedSettings = { ...existingSettings, ...settings };
            
            // Guardar configuración actualizada
            await this.saveData(this.SETTINGS_KEY, updatedSettings);
            return true;
            
        } catch (error) {
            console.error("Error saving settings:", error);
            return false;
        }
    }

    /**
     * Obtiene la configuración de la aplicación
     * @returns {Promise<object>} - Configuración
     */
    async getSettings() {
        try {
            const settings = await this.getData(this.SETTINGS_KEY);
            return settings || {};
        } catch (error) {
            console.error("Error getting settings:", error);
            return {};
        }
    }

    /**
     * Limpia todos los datos almacenados
     * @returns {Promise<boolean>} - true si se limpió correctamente
     */
    async clearAllData() {
        try {
            if (this.isExtension) {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.clear(() => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(true);
                        }
                    });
                });
            } else {
                localStorage.clear();
            }
            return true;
        } catch (error) {
            console.error("Error clearing data:", error);
            return false;
        }
    }

    /**
     * Calcula el tamaño aproximado de los datos almacenados
     * @returns {Promise<number>} - Tamaño en bytes
     */
    async getStorageSize() {
        try {
            let totalSize = 0;
            
            if (this.isExtension) {
                // En extensión
                const data = await new Promise(resolve => {
                    chrome.storage.local.get(null, items => {
                        resolve(items);
                    });
                });
                
                totalSize = new Blob([JSON.stringify(data)]).size;
            } else {
                // En localStorage
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    totalSize += key.length + value.length;
                }
            }
            
            return totalSize;
        } catch (error) {
            console.error("Error calculating storage size:", error);
            return 0;
        }
    }
}

// Exportar el gestor de almacenamiento
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}