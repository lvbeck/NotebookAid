import { smokeMath } from './math-smoke';
import { loginLaunchHidden } from './login-startup';
import { externalAccessHost } from './external-access';
import { registerMcpSetup } from './mcp-setup';
import { assertProbeHome } from './mcp-probe';
import { smokeLoginStartup } from './login-startup-smoke';
import { smokeView } from './view-smoke';
import { smokeOutline } from './outline-smoke';
import { smokeSkin } from './skin-smoke';
import { smokeEaster } from './easter-smoke';
import { smokeArchive } from './archive-smoke';
import { smokeSearch } from './search-smoke';
import { registerUpdates, updateSourceReady } from './updates';
import { bridgeEndpoint, prepareBridgeEndpoint } from './bridge-endpoint';
import { migrateAppData } from '../core/app-data';
import { validZoom } from '../shared/ui';
import { registerAi } from './ai-ipc';
import { registerWriting } from './writing-ipc';
import { smokeAi } from './ai-smoke';
import { smokeWriting } from './writing-smoke';
import { smokeOnboarding } from './onboarding-smoke';
import { smokeUi } from './ui-smoke';
import { smokeContext } from './context-smoke';
import { smokeDecrypt } from './decrypt-smoke';
import { smokeStartup } from './startup-smoke';
import { smokeTasks } from './tasks-smoke';
import { smokeAddon } from './addon-smoke';
import { AddonService } from '../core/addon';
import type { AddonRequest, DesktopNoteTarget } from '../shared/addon';
import { translate, type Locale } from '../src/app/i18n';
import { smokeHtmlImport } from './html-import-smoke';
import { smokeLibrary } from './smoke';
import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell } from 'electron';
import { chmodSync, mkdirSync, writeFileSync, existsSync, unlinkSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer, Server } from 'node:net';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { release } from 'node:os';
import { runSqliteProbe } from '../core/probe';
import { FrameDecoder, encodeFrame } from './framing';
import type { RuntimeInfo } from '../shared/contracts';
import { registerLibrary } from './library-ipc';
import { registerNotifications } from './notifications-ipc';
import { passkeyClient } from './passkeys';
import { smokePasskey } from './passkey-smoke';

const easterRequests: string[] = [];
const selfTest = process.argv.includes('--self-test') || process.argv.includes('--self-test-reopen');
const dataPath = process.env['NOTEBOOKAID_TEST_HOME'] || migrateAppData(app.getPath('appData'), pid => { try { process.kill(pid,0); return true; } catch { return false; } });
const mcpTestWorkspace = app.isPackaged ? process.argv[process.argv.indexOf('--mcp-test-workspace') + 1] : app.getAppPath();
if (process.env['NOTEBOOKAID_MCP_SETUP_TEST'] === '1') {
  if (!selfTest || !mcpTestWorkspace) throw Error('UNSAFE_PROBE_HOME');
  assertProbeHome(mcpTestWorkspace, dataPath);
}
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
let externalAccess: Awaited<ReturnType<typeof externalAccessHost>> | undefined;
let ai: ReturnType<typeof registerAi>;
let writing: ReturnType<typeof registerWriting>;
let updates: ReturnType<typeof registerUpdates>;
let updateInstalling = false;
let addonWaiters = 0;
let editorWindowBounds: Electron.Rectangle | null = null;
let storage: ReturnType<typeof registerLibrary>;
let requestedArchive = selfTest ? undefined : process.argv.find(value => isAbsolute(value) && value.toLowerCase().endsWith('.nabook'));
function requestArchive(path: string): void {
  if (!isAbsolute(path) || !path.toLowerCase().endsWith('.nabook')) return;
  requestedArchive = path; if (storage) { storage.requestArchive(path); requestedArchive = undefined; }
}
app.on('open-file', (event, path) => { if (path.toLowerCase().endsWith('.nabook')) { event.preventDefault(); requestArchive(path); if (app.isReady() && storage) void createWindow(); } });
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
  return { onboardingAutoStart: !selfTest || process.env['NOTEBOOKAID_ONBOARDING_TEST'] === '1', version: app.getVersion(), electron: process.versions.electron, node: process.versions.node,
    chrome: process.versions.chrome, platform: `${process.platform} ${release()} ${process.arch}`, dataPath,
    packaged: app.isPackaged, pid: process.pid };
}

async function createWindow(show = true): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) { if (show) mainWindow.show(); return mainWindow; }
  mainWindow = new BrowserWindow({ width: 1300, height: 860, minWidth: 960, minHeight: 640, show: false,
    title: 'NotebookAid', icon: applicationIcon(), backgroundColor: '#f6f6f9', autoHideMenuBar: true,
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
  mainWindow.webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame) { writing?.clear(); storage.release(owner); } });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
  if (selfTest && process.env['NOTEBOOKAID_EASTER_TEST'] === '1') {
    mainWindow.webContents.session.webRequest.onCompleted({ urls: ['file://*/*'] }, details => easterRequests.push(details.url));
  }
  mainWindow.on('close', event => { if (!quitting) { event.preventDefault(); void quitByUser(false, true); } });
  mainWindow.on('closed', () => { storage.release(owner); mainWindow = null; });
  mainWindow.webContents.on('did-finish-load', () => mainWindow?.webContents.setZoomFactor(storage.zoom() / 100));
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
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
  passkeys = passkeyClient(dataPath);
  const protectedCaller = (event: Electron.IpcMainInvokeEvent) => { authorize(event); if (!passkeys.gate.unlocked) throw Error('APP_LOCKED'); };
  storage = registerLibrary(dataPath, () => mainWindow, protectedCaller, selfTest, updateTray, { enabled: () => passkeys.gate.enabled && passkeys.gate.unlocked, lock: () => { passkeys.gate.lock(); mainWindow?.webContents.reload(); } }, authorize);
  if (requestedArchive) { storage.requestArchive(requestedArchive); requestedArchive = undefined; }
  updates = registerUpdates({ root: dirname(process.execPath), resources: process.resourcesPath, configured: app.isPackaged && !selfTest && updateSourceReady(dirname(process.execPath), process.resourcesPath), enabled: () => !selfTest && storage.autoUpdatesEnabled(), publish: state => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updates:state', state); }, confirm: () => storage.confirmUpdate(), flush: () => storage.flush(), beforeInstall: () => { updateInstalling = true; quitting = true; }, installFailed: () => { if (updateInstalling) { updateInstalling = false; quitting = false; } } });
  ipcMain.handle('updates:state', event => { protectedCaller(event); return updates.state(); });
  ipcMain.handle('updates:check', event => { protectedCaller(event); return updates.check(); });
  ipcMain.handle('updates:install', event => { protectedCaller(event); return updates.install(); });
  notifications = registerNotifications(dataPath, protectedCaller, selfTest);
  ipcMain.handle('prototype:edit-command',(event,action:unknown)=>{
    protectedCaller(event);if(typeof action!=='string'||!['cut','copy','paste','selectAll'].includes(action))throw Error('INVALID_INPUT');
    event.sender[action as 'cut'|'copy'|'paste'|'selectAll']();
  });
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
  tray.setToolTip('NotebookAid');
  updateTray(storage.locale());
  tray.on('double-click', () => { void createWindow(); });
  ipcMain.handle('information:third-party', event => {
    authorize(event);
    const root = app.isPackaged ? (process.platform === 'darwin' ? process.resourcesPath : dirname(process.execPath)) : join(app.getAppPath(),'release',app.getVersion(),'NotebookAid-win32-x64');
    const catalog = JSON.parse(readFileSync(join(root,'distribution-dependencies.json'),'utf8')) as import('../shared/contracts').ThirdPartyCatalog;
    if (!Array.isArray(catalog.components) || !Array.isArray(catalog.noticeFiles)) throw Error('INVALID_CATALOG');
    return { components: [...catalog.components,{name:'Node.js',version:process.versions.node,license:'See bundled notices',notices:['LICENSES.chromium.html']}], noticeFiles: catalog.noticeFiles };
  });
  ipcMain.handle('information:open-link', async (event, target: unknown) => {
    authorize(event);
    const links = { github: 'https://github.com/lvbeck/NotebookAid', support: 'https://buymeacoffee.com/lvbeck', contact: 'mailto:it@live.cn' };
    if (typeof target !== 'string' || !Object.hasOwn(links,target)) throw new Error('INVALID_INPUT');
    await shell.openExternal(links[target as keyof typeof links]);
  });
  ipcMain.handle('prototype:runtime', event => { authorize(event); return runtime(); });
  ipcMain.handle('prototype:sqlite', event => { protectedCaller(event); return runSqliteProbe(dataPath); });
  ipcMain.handle('prototype:hide', event => { authorize(event); mainWindow?.hide(); });
  ipcMain.handle('prototype:ui-zoom', (event, percent: unknown) => { authorize(event); if (!validZoom(percent)) throw new Error('INVALID_INPUT'); mainWindow!.webContents.setZoomFactor(percent / 100); });
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
  ai = registerAi(dataPath, protectedCaller, selfTest && process.env['NOTEBOOKAID_AI_TEST'] === '1', () => passkeys.gate.unlocked);
  writing = registerWriting(storage, ai, protectedCaller);
  await startBridge();
  if (!app.isPackaged && selfTest && process.env['NOTEBOOKAID_EXTERNAL_BACKGROUND_TEST'] === '1' && process.env['NOTEBOOKAID_TEST_HOME']) {
    await (await import('./external-background-smoke.js')).startExternalBackgroundSmoke(app.getAppPath(), dataPath, () => storage.externalContext(passkeys.gate.unlocked), passkeys.gate, () => { storage.close(); app.exit(0); });
    return;
  }
  if (!app.isPackaged && selfTest && process.env['NOTEBOOKAID_EXTERNAL_ACCESS_TEST'] === '1' && process.env['NOTEBOOKAID_TEST_HOME']) {
    await (await import('./external-access-smoke.js')).startExternalAccessSmoke(app.getAppPath(), dataPath, () => storage.externalContext(passkeys.gate.unlocked), () => { storage.close(); app.exit(0); });
    return;
  }
  if (!app.isPackaged && selfTest && process.env['NOTEBOOKAID_MCP_PROBE'] === '1' && process.env['NOTEBOOKAID_TEST_HOME']) {
    await (await import('./mcp-probe.js')).startMcpProbe({ workspace: app.getAppPath(), dataPath, context: () => ({ ...storage.addonContext(), unlocked: passkeys.gate.unlocked }), windowCount: () => BrowserWindow.getAllWindows().length, stop: () => { storage.close(); app.exit(0); } });
    return;
  }
  const loginStartup = storage.loginStartup();
  try { externalAccess = await externalAccessHost(dataPath, () => storage.externalContext(passkeys.gate.unlocked), signal => passkeys.unlockBackground(signal)); registerMcpSetup(dataPath, externalAccess, protectedCaller, () => storage.externalContext(passkeys.gate.unlocked), message => storage.confirmExternal(message), storage.locale); }
  catch { console.error('EXTERNAL_ACCESS_UNAVAILABLE'); }
  const hiddenLogin = loginLaunchHidden(process.platform, process.argv, loginStartup, process.platform === 'darwin' && !selfTest && app.getLoginItemSettings().wasOpenedAtLogin);
  if (!hiddenLogin || selfTest) {
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
  const endpoint = bridgeEndpoint(dataPath);
  const name = endpoint.name, pipePath = endpoint.address;
  prepareBridgeEndpoint(endpoint);
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
  if (endpoint.directory) chmodSync(pipePath, 0o600);
  writeFileSync(runtimeFile, JSON.stringify({ pipe: name, ...(endpoint.directory ? { socket: pipePath } : {}), token: sessionToken, pid: process.pid }), { mode: 0o600 });
  if (endpoint.directory) chmodSync(runtimeFile, 0o600);
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
app.on('second-instance', (_event, argv) => { const path = argv.find(value => isAbsolute(value) && value.toLowerCase().endsWith('.nabook')); if (path) requestArchive(path); if (!argv.includes('--background')) void createWindow(); });
app.on('window-all-closed', () => { /* The explicit Exit command owns background shutdown. */ });
app.on('before-quit', event => {
  if (!quitting && storage) { event.preventDefault(); void quitByUser(); return; }
  quitting = true;
  addon?.close();
  externalAccess?.close();
  ai?.close();
  writing?.close();
  updates?.close();
  server?.close();
  tray?.destroy();
  storage?.close();
  notifications?.close();
  try {
    if (existsSync(runtimeFile) && JSON.parse(readFileSync(runtimeFile, 'utf8')).pid === process.pid) unlinkSync(runtimeFile);
  } catch { /* A stale marker is rejected by the connection handshake. */ }
});

async function runSmoke(window: BrowserWindow): Promise<void> {
  if (process.env['NOTEBOOKAID_MCP_SETUP_TEST'] === '1') { try { await (await import('./mcp-setup-smoke.js')).smokeMcpSetup(window, dataPath, mcpTestWorkspace!); await quitByUser(true); } catch (error) { writeFileSync(join(dataPath, 'smoke-error.txt'), error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'MCP_SETUP_SMOKE_FAILED'); app.exit(1); } return; }
  if (process.env['NOTEBOOKAID_SEARCH_TEST'] === '1') { try { await smokeSearch(window, dataPath); await quitByUser(true); } catch(error) { writeFileSync(join(dataPath, 'smoke-error.txt'), String(error)); app.exit(1); } return; }
  try {
    if(process.env['NOTEBOOKAID_LOGIN_STARTUP_TEST']==='1'){await smokeLoginStartup(window,dataPath);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_MATH_TEST']==='1'){await smokeMath(window,dataPath);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_OUTLINE_TEST']==='1'){await smokeOutline(window,dataPath);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_VIEW_TEST']==='1'){await smokeView(window,dataPath);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_SKIN_TEST']==='1'){await smokeSkin(window,dataPath);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_EASTER_TEST']==='1'){await smokeEaster(window,dataPath,easterRequests);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_STARTUP_TEST']==='1'){await smokeStartup(window,dataPath);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_DECRYPT_TEST']==='1'){await smokeDecrypt(window,dataPath);await quitByUser(true);return;}
    if(process.env['NOTEBOOKAID_CONTEXT_TEST']==='1'){await smokeContext(window,dataPath);await quitByUser(true);return;}
    if (process.env['NOTEBOOKAID_ONBOARDING_TEST'] === '1') { await smokeOnboarding(window,dataPath);await quitByUser(true);return; }
    if (process.env['NOTEBOOKAID_UI_TEST'] === '1') { await smokeUi(window, dataPath); await quitByUser(true); return; }
    if (process.env['NOTEBOOKAID_ARCHIVE_TEST'] === '1') { await smokeArchive(window, dataPath, storage.requestArchive); await quitByUser(true); return; }
    if (process.env['NOTEBOOKAID_TASKS_TEST'] === '1') { await smokeTasks(window,dataPath);await quitByUser(true);return; }

    if (process.env['NOTEBOOKAID_WRITING_TEST'] === '1') { await smokeWriting(window, dataPath); await quitByUser(true); return; }
    if (process.env['NOTEBOOKAID_AI_TEST'] === '1') { await smokeAi(window, dataPath); await quitByUser(true); return; }
    if (process.env['NOTEBOOKAID_ADDON_TEST'] === '1') { await smokeAddon(window, dataPath); await quitByUser(true); return; }
    if (process.env['NOTEBOOKAID_PASSKEY_TEST'] === '1') { await smokePasskey(window, dataPath, passkeys.gate); await quitByUser(true); return; }
    if (!process.argv.includes('--self-test-reopen')) await smokeHtmlImport(dataPath);
    await smokeLibrary(window, dataPath, rendererErrors);
    await quitByUser(true);
  } catch (error) { writeFileSync(join(dataPath, 'smoke-error.txt'), String(error)); app.exit(1); }
}
