// Background script simple para depuración
console.log('Background script cargado correctamente');

// Escuchar instalación
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('Extensión instalada o actualizada', details.reason);
});

// Escuchar mensajes
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Mensaje recibido en background:', message);
  return true;
});