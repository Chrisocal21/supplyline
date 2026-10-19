// Supplyline for Windows: the built game in its own window, with saves on disk and updates that download in the background.
const { app, BrowserWindow, protocol, net, ipcMain, shell, Menu, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

// Use the strong graphics card, and let WebGL run on cards the browser would have blocked.
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

const DIST = path.join(__dirname, '..', 'dist');
let win = null;
let updater = null;
let pending = null;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function startUpdater() {
  if (!app.isPackaged) return;
  try {
    ({ autoUpdater: updater } = require('electron-updater'));
  } catch {
    return;
  }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('update-available', (info) => send('update', { state: 'downloading', version: info.version }));
  updater.on('update-downloaded', (info) => {
    pending = { state: 'ready', version: info.version };
    send('update', pending);
  });
  updater.on('error', () => undefined);
  const check = () => updater.checkForUpdates().catch(() => undefined);
  check();
  setInterval(check, 30 * 60 * 1000);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#03060b',
    title: 'Supplyline',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  // Saves live in the page's storage. Write it to disk often and when the window closes, so a crash or a killed process loses little.
  const flush = () => session.defaultSession.flushStorageData();
  const timer = setInterval(flush, 15000);
  win.on('close', () => {
    clearInterval(timer);
    flush();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
  win.webContents.on('did-finish-load', () => {
    if (pending) send('update', pending);
  });
  win.loadURL('app://game/play/index.html');
}

app.whenReady().then(() => {
  // The built files are served under app://game/ so the pages' absolute paths work as they do on the web.
  protocol.handle('app', (request) => {
    let p = decodeURIComponent(new URL(request.url).pathname);
    if (p.endsWith('/')) p += 'index.html';
    if (p === '/version.json') return net.fetch(pathToFileURL(path.join(DIST, 'version.json')).toString());
    const file = path.normalize(path.join(DIST, p));
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  ipcMain.on('update:install', () => {
    if (updater && pending) updater.quitAndInstall(false, true);
  });
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged }));
  createWindow();
  startUpdater();
});

app.on('window-all-closed', () => app.quit());
