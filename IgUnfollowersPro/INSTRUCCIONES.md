# Guía de instalación de Instagram Unfollowers Pro

Esta guía detalla los pasos para instalar, configurar y distribuir Instagram Unfollowers Pro como una extensión de navegador.

## 1. Requisitos previos

- Un editor de código (como Visual Studio Code, Sublime Text, etc.)
- Navegador web (Chrome o Firefox)
- Conocimientos básicos de extensiones de navegador

## 2. Estructura de archivos

Asegúrate de que todos los archivos estén organizados en la siguiente estructura:

```
instagram-unfollowers-pro/
│
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── content/
│   ├── content.js
│   ├── unfollowers.js
│   └── styles.css
│
├── background/
│   └── background.js
│
├── lib/
│   ├── subscription.js
│   └── storage.js
│
└── assets/
    ├── images/
    │   ├── icon16.png
    │   ├── icon48.png
    │   ├── icon128.png
    │   ├── instagram.png
    │   ├── warning.png
    │   └── loading.gif
```

## 3. Preparación de los iconos

La extensión necesita iconos para mostrar en la barra de herramientas y menús del navegador. Puedes usar los siguientes tamaños estándar:

1. Crea o consigue iconos en estos tamaños:
   - 16x16 pixels (icon16.png)
   - 48x48 pixels (icon48.png)
   - 128x128 pixels (icon128.png)

2. Coloca los iconos en la carpeta `assets/images/`

## 4. Instalación para desarrollo

### En Google Chrome:

1. Abre Chrome y navega a `chrome://extensions/`
2. Activa el "Modo de desarrollador" en la esquina superior derecha
3. Haz clic en "Cargar descomprimida"
4. Selecciona la carpeta `instagram-unfollowers-pro` con todos los archivos
5. La extensión debería aparecer en tu lista de extensiones y en la barra de herramientas

### En Firefox:

1. Abre Firefox y navega a `about:debugging#/runtime/this-firefox`
2. Haz clic en "Cargar complemento temporal..."
3. Selecciona el archivo `manifest.json` dentro de la carpeta `instagram-unfollowers-pro`
4. La extensión se cargará temporalmente (nota: en Firefox, las extensiones temporales se eliminan al reiniciar)

## 5. Configuración para monetización

Para configurar los niveles de suscripción y la monetización:

1. Abre el archivo `content/unfollowers.js`
2. Localiza la sección `SUBSCRIPTION_CONFIG` al principio del archivo
3. Modifica los siguientes valores según tus necesidades:
   - `TRIAL_DAYS`: Duración del período de prueba en días
   - `FREE.maxUnfollowers`: Número máximo de unfollowers permitidos en el plan gratuito
   - `FREE.historyDays`: Días de historial permitidos en el plan gratuito
   - Configura las características disponibles en cada plan (`true` para activar, `false` para desactivar)

```javascript
const SUBSCRIPTION_CONFIG = {
    // Número de días para prueba gratuita (análisis ilimitado)
    TRIAL_DAYS: 7,
    
    // Límites para cada plan (fácilmente modificable)
    FREE: {
        // Número máximo de unfollowers a analizar
        maxUnfollowers: 100,
        // Número de días para mantener el historial
        historyDays: 7,
        // Funciones premium deshabilitadas
        automation: false,
        realTimeAlerts: false,
        multipleAccounts: false,
        export: false
    },
    // ...resto de configuración
};
```

## 6. Personalización de la interfaz

Para personalizar textos, colores y otros elementos visuales:

1. **Textos**: Modifica la sección `UI_TEXTS` en `content/unfollowers.js`
2. **Estilos**: Edita el archivo `content/styles.css` para cambiar colores, fuentes, etc.
3. **Popup**: Modifica `popup/popup.html` y `popup/popup.css` para cambiar la interfaz del popup

## 7. Implementación del sistema de pagos

Para implementar un sistema de pagos real:

1. Debes modificar la función `upgradeToPlan()` en `lib/subscription.js`
2. Integra con tu proveedor de pagos preferido (Stripe, PayPal, etc.)
3. Configura un backend para validar y procesar pagos

### Ejemplo de integración con Stripe:

```javascript
async upgradeToPlan(newPlan) {
    try {
        // Definir precios según el plan
        const prices = {
            "PREMIUM": "price_1AbCdEfGhIjKlMnO",
            "PRO": "price_2BcDeFgHiJkLmNoP"
        };
        
        // Redirigir a página de pago
        window.open(`https://tudominio.com/checkout?plan=${newPlan}&price=${prices[newPlan]}`, '_blank');
        
        // El resto se maneja en tu backend
        return { success: true, redirected: true };
    } catch (error) {
        console.error("Error upgrading plan:", error);
        return { success: false, error: error.message };
    }
}
```

## 8. Pruebas

Antes de publicar, prueba exhaustivamente:

1. Verifica que la detección de unfollowers funcione correctamente
2. Prueba los límites de cada plan de suscripción
3. Asegúrate de que la interfaz se vea bien en diferentes tamaños de ventana
4. Comprueba que las notificaciones y mensajes aparezcan correctamente
5. Verifica el período de prueba y las funciones premium

## 9. Empaquetado para distribución

### Para Chrome Web Store:

1. Comprime la carpeta `instagram-unfollowers-pro` en un archivo ZIP
2. Crea una cuenta de desarrollador en [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. Sigue las instrucciones para subir tu extensión
4. Completa todos los detalles, descripciones, capturas de pantalla y política de privacidad
5. Paga la tarifa de registro única ($5.00 USD)
6. Envía para revisión (puede tomar varios días)

### Para Firefox Add-ons:

1. Comprime la carpeta en un archivo ZIP
2. Crea una cuenta en [Firefox Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/)
3. Sube tu extensión siguiendo las instrucciones
4. Completa la información requerida y envía para revisión

## 10. Análisis de uso (opcional)

Para implementar análisis de uso:

1. Registra una cuenta en un servicio como Google Analytics o Mixpanel
2. Integra la API de análisis en el archivo `background.js`
3. Configura eventos para rastrear acciones importantes (análisis completados, upgrades, etc.)

## 11. Solución de problemas comunes

### La extensión no aparece en Instagram:
- Verifica que la extensión esté habilitada
- Comprueba la consola de desarrollador para ver errores
- Asegúrate de que los permisos en `manifest.json` sean correctos

### Problemas con la detección de unfollowers:
- Verifica que la API de Instagram no haya cambiado (QUERY_HASH)
- Comprueba el flujo de autenticación (cookies, sesión)
- Aumenta los tiempos de espera entre solicitudes para evitar bloqueos

### Errores en almacenamiento:
- Verifica los límites de almacenamiento local (5MB para extensiones)
- Implementa limpieza de datos antiguos

## 12. Mantenimiento continuo

Instagram actualiza su API y estructura con frecuencia. Para mantener la extensión funcionando:

1. Monitorea los cambios en la API de Instagram
2. Actualiza regularmente el QUERY_HASH y otros parámetros
3. Mantén un canal de comunicación con tus usuarios para reportes de errores
4. Implementa actualizaciones automáticas a través de las tiendas de extensiones

---

Para soporte adicional, contacta a: soporte@tudominio.com