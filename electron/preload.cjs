const { contextBridge, ipcRenderer } = require('electron');

// What the game can ask of the desktop app: its update state, and to restart into a downloaded update.
contextBridge.exposeInMainWorld('supplyline', {
  desktop: true,
  onUpdate: (cb) => ipcRenderer.on('update', (_e, info) => cb(info)),
  installUpdate: () => ipcRenderer.send('update:install'),
});
