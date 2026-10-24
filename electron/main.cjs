// Supplyline for Windows: the built game in its own window, with saves on disk and updates that download in the background.
const { app, BrowserWindow, protocol, net, ipcMain, shell, Menu, session, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

// Use the strong graphics card, and let WebGL run on cards the browser would have blocked.
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

const DIST = path.join(__dirname, '..', 'dist');
// The demo installer is the same app with slDemo set in its packaged package.json (tools/build-demo.cjs). Nothing is written to the
// project folder, so a full build made at the same time can never pick it up.
const DEMO = require('../package.json').slDemo === true;
let win = null;
let updater = null;
let pending = null;
let checkNow = null;
// What the updater last said. The game asks for it when it starts, since the check begins before the page is ready to listen.
let lastUpdate = { state: app.isPackaged && !DEMO ? 'checking' : 'none' };

function send(channel, payload) {
  if (channel === 'update') lastUpdate = payload;
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function startUpdater() {
  if (!app.isPackaged || DEMO) return;
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
  updater.on('checking-for-update', () => send('update', { state: 'checking' }));
  updater.on('update-not-available', () => send('update', { state: 'none' }));
  updater.on('download-progress', (p) => send('update', { state: 'downloading', percent: Math.round(p.percent) }));
  updater.on('error', (e) => send('update', { state: 'error', message: String((e && e.message) || e).split('\n')[0].slice(0, 90) }));
  const check = () => updater.checkForUpdates().catch(() => undefined);
  checkNow = check;
  check();
  setInterval(check, 5 * 60 * 1000);
}

function createWindow() {
  // Open at full HD (1920 by 1080), or as large as the screen allows.
  const area = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(1920, area.width),
    height: Math.min(1080, area.height),
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#03060b',
    title: DEMO ? 'Supplyline Demo' : 'Supplyline',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, additionalArguments: DEMO ? ['--sl-demo'] : [], backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' },
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
  // Maximising goes to true full screen, which drops the title bar and its buttons. F11 (or leaving full screen) returns to a window.
  win.on('maximize', () => {
    if (!win.isFullScreen()) win.setFullScreen(true);
  });
  win.on('leave-full-screen', () => {
    if (win.isMaximized()) win.unmaximize();
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
  // The menu asks for a look right now, instead of waiting for the next timed one.
  ipcMain.on('update:check', () => {
    if (pending) send('update', pending);
    else if (checkNow) checkNow();
    else send('update', { state: 'error', message: 'Updates only run in the installed app' });
  });
  ipcMain.handle('update:state', () => lastUpdate);
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged }));
  createWindow();
  startUpdater();
});

app.on('window-all-closed', () => app.quit());
