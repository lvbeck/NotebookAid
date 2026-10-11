import { translate, type Locale } from '../src/app/i18n';
import { smokeHtmlImport } from './html-import-smoke';
import { smokeLibrary } from './smoke';
import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } from 'electron';
import { mkdirSync, writeFileSync, existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer, Server } from 'node:net';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { release } from 'node:os';
import { runSqliteProbe } from '../core/probe';
import { FrameDecoder, encodeFrame } from './framing';
import type { RuntimeInfo } from '../shared/contracts';
import { registerLibrary } from './library-ipc';
import { registerNotifications } from './notifications-ipc';

const selfTest = process.argv.includes('--self-test') || process.argv.includes('--self-test-reopen');
const background = process.argv.includes('--background');
const dataPath = process.env['NOTEBOOKAID_TEST_HOME'] || join(app.getPath('appData'), 'NotebookAid-T02');
mkdirSync(dataPath, { recursive: true });
app.setPath('userData', dataPath);
app.setPath('sessionData', join(dataPath, 'session'));
app.setAppUserModelId('de.zub-systems.notebookaid.t02');
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else void app.whenReady().then(start).catch(error => {
  if (selfTest) writeFileSync(join(dataPath, 'smoke-error.txt'), String(error));
  console.error('Startup failed:', error instanceof Error ? error.message : 'Unknown failure');
  app.exit(1);
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let server: Server | null = null;
let quitting = false;
let exitPending = false;
let storage: ReturnType<typeof registerLibrary>;
let notifications: ReturnType<typeof registerNotifications>;
const rendererErrors: string[] = [];
const sessionToken = randomBytes(32).toString('hex');
const runtimeFile = join(dataPath, 'bridge-runtime.json');
const stoppedFile = join(dataPath, 'user-stopped.json');
const rendererPath = resolve(__dirname, '../../renderer/browser/index.html');
const rendererUrl = pathToFileURL(rendererPath).href;

function applicationIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromPath(join(app.getAppPath(), 'assets/notebookaid-256.png'));
  if (icon.isEmpty()) throw new Error('Application icon is missing');
  return icon;
}

function runtime(): RuntimeInfo {
  return { version: app.getVersion(), electron: process.versions.electron, node: process.versions.node,
    chrome: process.versions.chrome, platform: `${process.platform} ${release()} ${process.arch}`, dataPath,
    packaged: app.isPackaged, pid: process.pid };
}

async function createWindow(show = true): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) { if (show) mainWindow.show(); return mainWindow; }
  mainWindow = new BrowserWindow({ width: 1300, height: 860, minWidth: 960, minHeight: 640, show: false,
    title: 'NotebookAid · T04', icon: applicationIcon(), backgroundColor: '#f6f6f9', autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: false }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('console-message', (_event, level, message) => { if (level === 3) rendererErrors.push(message); });
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  const owner = String(mainWindow.webContents.id);
  mainWindow.webContents.on('render-process-gone', () => storage.release(owner));
  mainWindow.webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame) storage.release(owner); });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
  mainWindow.on('close', event => { if (!quitting) { event.preventDefault(); mainWindow?.hide(); } });
  mainWindow.on('closed', () => { storage.release(owner); mainWindow = null; });
  await mainWindow.loadFile(rendererPath);
  if (show) mainWindow.show();
  return mainWindow;
}

function authorize(event: Electron.IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || event.senderFrame.url !== rendererUrl) {
    throw new Error('Untrusted IPC caller');
  }
}

function updateTray(locale: Locale): void {
  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: translate(locale, 'openApp'), click: () => { void createWindow(); } },
    { type: 'separator' }, { label: translate(locale, 'quit'), click: quitByUser }
  ]));
}
async function start(): Promise<void> {
  if (existsSync(stoppedFile)) unlinkSync(stoppedFile);
  Menu.setApplicationMenu(null);
  storage = registerLibrary(dataPath, () => mainWindow, authorize, selfTest, updateTray);
  notifications = registerNotifications(dataPath, authorize, selfTest);
  tray = new Tray(nativeImage.createFromPath(join(app.getAppPath(), 'assets/notebookaid.ico')));
  tray.setToolTip('NotebookAid · T04');
  updateTray(storage.locale());
  tray.on('double-click', () => { void createWindow(); });
  ipcMain.handle('prototype:runtime', event => { authorize(event); return runtime(); });
  ipcMain.handle('prototype:sqlite', event => { authorize(event); return runSqliteProbe(dataPath); });
  ipcMain.handle('prototype:hide', event => { authorize(event); mainWindow?.hide(); });
  ipcMain.handle('prototype:quit', event => { authorize(event); quitByUser(); });
  await startBridge();
  if (!background || selfTest) {
    const window = await createWindow(!selfTest);
    if (selfTest) await runSmoke(window);
  }
}

async function startBridge(): Promise<void> {
  const name = 'NotebookAid-T02-' + createHash('sha256').update(dataPath.toLowerCase()).digest('hex').slice(0, 24);
  const pipePath = '\\\\.\\pipe\\' + name;
  server = createServer(socket => {
    socket.setTimeout(5000, () => socket.destroy());
    socket.on('error', () => socket.destroy());
    const decoder = new FrameDecoder();
    socket.on('data', chunk => {
      try {
        for (const raw of decoder.push(chunk)) {
          const request = raw as { token?: unknown; method?: unknown };
          const token = typeof request?.token === 'string' ? Buffer.from(request.token) : Buffer.alloc(0);
          const expected = Buffer.from(sessionToken);
          if (token.length !== expected.length || !timingSafeEqual(token, expected)) throw new Error('Unauthorized');
          if (request.method !== 'status' && request.method !== 'open') throw new Error('Invalid operation');
          if (request.method === 'open') void createWindow();
          socket.write(encodeFrame({ ok: true, ...runtime(), windowVisible: mainWindow?.isVisible() ?? false }));
        }
      } catch { socket.end(encodeFrame({ ok: false, error: 'INVALID_OR_UNAUTHORIZED_REQUEST' })); }
    });
  });
  await new Promise<void>((resolveReady, reject) => { server!.once('error', reject); server!.listen(pipePath, resolveReady); });
  writeFileSync(runtimeFile, JSON.stringify({ pipe: name, token: sessionToken, pid: process.pid }), { mode: 0o600 });
}

async function quitByUser(): Promise<void> {
  if (exitPending) return;
  exitPending = true;
  try { if (storage && !await storage.flush()) return;
  writeFileSync(stoppedFile, JSON.stringify({ stoppedAt: new Date().toISOString() }));
  quitting = true;
  app.quit();
  } finally { exitPending = false; }
}
app.on('second-instance', (_event, argv) => { if (!argv.includes('--background')) void createWindow(); });
app.on('window-all-closed', () => { /* The explicit Exit command owns background shutdown. */ });
app.on('before-quit', event => {
  if (!quitting && storage) { event.preventDefault(); void quitByUser(); return; }
  quitting = true;
  server?.close();
  tray?.destroy();
  storage?.close();
  notifications?.close();
  try {
    if (existsSync(runtimeFile) && JSON.parse(readFileSync(runtimeFile, 'utf8')).pid === process.pid) unlinkSync(runtimeFile);
  } catch { /* A stale marker is rejected by the connection handshake. */ }
});

async function runSmoke(window: BrowserWindow): Promise<void> {
  try {
    if (!process.argv.includes('--self-test-reopen')) await smokeHtmlImport(dataPath);
    await smokeLibrary(window, dataPath, rendererErrors);
    await quitByUser();
  } catch (error) { writeFileSync(join(dataPath, 'smoke-error.txt'), String(error)); app.exit(1); }
}
