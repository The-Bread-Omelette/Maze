/*
==============================================
AETHERIUM LABYRINTH - PRELOAD SCRIPT (preload.js)
==============================================
Securely exposes backend functions from main.js to the renderer.js UI.
Only the functions defined here will be accessible in the renderer process.
*/

const { contextBridge, ipcRenderer } = require('electron');

// Define the secure API to expose to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // --- NEWLY ADDED FUNCTION ---
  // Exposes the function to send a command (like "START") to the main process.
  sendCommand: (command) => ipcRenderer.send('serial:send-command', command),

  // --- EXISTING FUNCTIONS ---
  // Renderer -> Main (one-way)
  quitApp: () => ipcRenderer.send('app:quit'),
  showFile: () => ipcRenderer.send('app:show-file'),

  // Renderer -> Main -> Renderer (two-way)
  loadData: () => ipcRenderer.invoke('excel:load-data'),
  saveData: (data) => ipcRenderer.invoke('excel:save-data', data),

  // Main -> Renderer (listening for events)
  onSerialData: (callback) => ipcRenderer.on('serial:data-received', callback)
  // You can also add listeners for 'serial:error' and 'serial:closed' here if needed
  // onSerialError: (callback) => ipcRenderer.on('serial:error', callback),
  // onSerialClosed: (callback) => ipcRenderer.on('serial:closed', callback),
});
