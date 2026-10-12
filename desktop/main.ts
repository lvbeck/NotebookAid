import { migrateAppData } from '../core/app-data';
import { smokeAddon } from './addon-smoke';
import { AddonService } from '../core/addon';
import type { AddonRequest, DesktopNoteTarget } from '../shared/addon';
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
import { passkeyClient } from './passkeys';
import { smokePasskey } from './passkey-smoke';

const selfTest = process.argv.includes('--self-test') || process.argv.includes('--self-test-reopen');
const background = process.argv.includes('--background');
const dataPath = process.env['NOTEBOOKAID_TEST_HOME'] || migrateAppData(app.getPath('appData'), pid => { try { process.kill(pid,0); return true; } catch { return false; } });
mkdirSync(dataPath, { recursive: true });
app.setPath('userData', dataPath);
app.setPath('sessionData', join(dataPath, 'session'));
app.setAppUserModelId('de.zub-systems.notebookaid');
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
let addon: AddonService;
let addonWaiters = 0;
let editorWindowBounds: Electron.Rectangle | null = null;
let storage: ReturnType<typeof registerLibrary>;
let notifications: ReturnType<typeof registerNotifications>;
let passkeys: ReturnType<typeof passkeyClient>;
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
    title: 'NotebookAid · T10', icon: applicationIcon(), backgroundColor: '#f6f6f9', autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: false }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('console-message', (_event, level, message) => { if (level === 3) rendererErrors.push(message); });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow the authenticated lock screen to reload the exact application entry point.
    if (url !== rendererUrl || !passkeys.gate.unlocked) event.preventDefault();
  });
  const owner = String(mainWindow.webContents.id);
  mainWindow.webContents.on('render-process-gone', () => { passkeys.gate.lock(); storage.release(owner); });
  mainWindow.webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame) storage.release(owner); });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
  mainWindow.on('close', event => { if (!quitting) { event.preventDefault(); void quitByUser(false, true); } });
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
    { type: 'separator' }, { label: translate(locale, 'quit'), click: () => { void quitByUser(); } }
  ]));
}
async function start(): Promise<void> {
  if (existsSync(stoppedFile)) unlinkSync(stoppedFile);
  Menu.setApplicationMenu(null);
  passkeys = passkeyClient(dataPath);
  const protectedCaller = (event: Electron.IpcMainInvokeEvent) => { authorize(event); if (!passkeys.gate.unlocked) throw Error('APP_LOCKED'); };
  storage = registerLibrary(dataPath, () => mainWindow, protectedCaller, selfTest, updateTray, { enabled: () => passkeys.gate.enabled && passkeys.gate.unlocked, lock: () => { passkeys.gate.lock(); mainWindow?.webContents.reload(); } }, authorize);
  notifications = registerNotifications(dataPath, protectedCaller, selfTest);
  ipcMain.handle('prototype:passkeys', async (event, action: unknown) => {
    authorize(event); let error: string | undefined;
    try {
      if (!['status', 'enable', 'unlock', 'disable', 'lock'].includes(String(action))) throw Error('INVALID_INPUT');
      if (action === 'lock') { if (passkeys.gate.enabled && await storage.flush()) { storage.lock(); passkeys.gate.lock(); mainWindow?.webContents.reload(); } }
      else if (action !== 'status') await passkeys.action(action as 'enable' | 'unlock' | 'disable', mainWindow!);
    } catch (failure) { error = failure instanceof Error && /^[A-Z_]+$/.test(failure.message) ? failure.message : 'PASSKEY_FAILED'; }
    return { enabled: passkeys.gate.enabled, locked: !passkeys.gate.unlocked, count: passkeys.gate.count, supported: await passkeys.supported(), locale: storage.locale(), theme: storage.theme(), ...(error ? { error } : {}) };
  });
  tray = new Tray(nativeImage.createFromPath(join(app.getAppPath(), 'assets/notebookaid.ico')));
  tray.setToolTip('NotebookAid · T10');
  updateTray(storage.locale());
  tray.on('double-click', () => { void createWindow(); });
  ipcMain.handle('prototype:runtime', event => { authorize(event); return runtime(); });
  ipcMain.handle('prototype:sqlite', event => { protectedCaller(event); return runSqliteProbe(dataPath); });
  ipcMain.handle('prototype:hide', event => { authorize(event); mainWindow?.hide(); });
  ipcMain.handle('prototype:editor-fullscreen', (event, enabled: unknown) => {
    authorize(event);
    if (typeof enabled !== 'boolean') throw new Error('Invalid editor fullscreen state');
    const window = mainWindow!;
    if (enabled && !editorWindowBounds) {
      editorWindowBounds = window.getNormalBounds();
      window.maximize();
    } else if (!enabled && editorWindowBounds) {
      const bounds = editorWindowBounds;
      editorWindowBounds = null;
      window.unmaximize();
      window.setBounds(bounds);
    }
  });
  ipcMain.handle('prototype:quit', event => { authorize(event); quitByUser(); });
  addon = new AddonService(() => ({ ...storage.addonContext(), unlocked: passkeys.gate.unlocked, appVersion: app.getVersion() }), openDesktopNote);
  await startBridge();
  if (!background || selfTest) {
    const window = await createWindow(!selfTest);
    if (selfTest) await runSmoke(window);
  }
}

async function openDesktopNote(target: DesktopNoteTarget): Promise<boolean> {
  const window = await createWindow();
  if (window.isMinimized()) window.restore(); window.show(); window.focus();
  return new Promise(resolveResult => {
    const id = randomBytes(16).toString('hex');
    const finish = (ok: boolean) => { clearTimeout(timer); ipcMain.removeListener('prototype:open-note-result', listener); resolveResult(ok); };
    const listener = (event: Electron.IpcMainEvent, responseId: unknown, ok: unknown) => { if (responseId === id && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame) finish(ok === true); };
    const timer = setTimeout(() => finish(false), 20000); ipcMain.on('prototype:open-note-result', listener);
    window.webContents.send('prototype:open-note', id, target);
  });
}
async function startBridge(): Promise<void> {
  const name = 'NotebookAid-' + createHash('sha256').update(dataPath.toLowerCase()).digest('hex').slice(0, 24);
  const pipePath = '\\\\.\\pipe\\' + name;
  server = createServer(socket => {
    socket.setTimeout(25000, () => socket.destroy());
    socket.on('error', () => socket.destroy());
    const decoder = new FrameDecoder();
    socket.on('data', chunk => {
      try {
        for (const raw of decoder.push(chunk)) {
          const request = raw as AddonRequest & { token?: unknown };
          const token = typeof request?.token === 'string' ? Buffer.from(request.token) : Buffer.alloc(0);
          const expected = Buffer.from(sessionToken);
          if (token.length !== expected.length || !timingSafeEqual(token, expected)) throw new Error('Unauthorized');
          if (request.method === 'status' || request.method === 'open') {
            if (request.method === 'open') void createWindow();
            socket.write(encodeFrame({ ok: true, ...runtime(), windowVisible: mainWindow?.isVisible() ?? false }));
          } else {
            void (async () => {
              let result = await addon.request(request);
              if (result.ok && ['trash', 'mapTags'].includes(request.method)) mainWindow?.webContents.send('prototype:addon-changed');
              if (request.method === 'changes' && result.ok && !result.value.resyncRequired && addonWaiters < 8) {
                addonWaiters++;
                try { for (let i = 0; i < 60 && !socket.destroyed; i++) { await new Promise(resolve => setTimeout(resolve, 250)); result = await addon.request(request); if (!result.ok || result.value.resyncRequired) break; } }
                finally { addonWaiters--; }
              }
              if (!socket.destroyed) { try { socket.end(encodeFrame(result)); } catch { socket.end(encodeFrame({ ok: false, code: 'RESPONSE_TOO_LARGE' })); } }
            })().catch(() => { if (!socket.destroyed) socket.end(encodeFrame({ ok: false, code: 'BACKGROUND_UNAVAILABLE' })); });
          }
        }
      } catch { socket.end(encodeFrame({ ok: false, error: 'INVALID_OR_UNAUTHORIZED_REQUEST' })); }
    });
  });
  await new Promise<void>((resolveReady, reject) => { server!.once('error', reject); server!.listen(pipePath, resolveReady); });
  writeFileSync(runtimeFile, JSON.stringify({ pipe: name, token: sessionToken, pid: process.pid }), { mode: 0o600 });
}

async function quitByUser(testShutdown = false, allowTray = false): Promise<void> {
  if (exitPending) return;
  exitPending = true;
  try {
    if (!testShutdown) await createWindow();
    const answer = storage ? (testShutdown ? await storage.flush() : await storage.confirmExit(allowTray)) : true;
    if (!answer) return;
    if (answer === 'tray') { mainWindow?.hide(); return; }
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
  addon?.close();
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
    if (process.env['NOTEBOOKAID_ADDON_TEST'] === '1') { await smokeAddon(window, dataPath); await quitByUser(true); return; }
    if (process.env['NOTEBOOKAID_PASSKEY_TEST'] === '1') { await smokePasskey(window, dataPath, passkeys.gate); await quitByUser(true); return; }
    if (!process.argv.includes('--self-test-reopen')) await smokeHtmlImport(dataPath);
    await smokeLibrary(window, dataPath, rendererErrors);
    await quitByUser(true);
  } catch (error) { writeFileSync(join(dataPath, 'smoke-error.txt'), String(error)); app.exit(1); }
}
