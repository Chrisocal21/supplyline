const { contextBridge, ipcRenderer } = require('electron');

// What the game can ask of the desktop app: its update state, and to restart into a downloaded update.
contextBridge.exposeInMainWorld('supplyline', {
  desktop: true,
  // The free demo build: Map 1, ends at Tier 2, never updates into the full game.
  demo: process.argv.includes('--sl-demo'),
  onUpdate: (cb) => ipcRenderer.on('update', (_e, info) => cb(info)),
  getUpdate: () => ipcRenderer.invoke('update:state'),
  checkUpdate: () => ipcRenderer.send('update:check'),
  installUpdate: () => ipcRenderer.send('update:install'),
});
