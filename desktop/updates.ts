import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { UpdateState } from '../shared/updates';
export function registerUpdates(options: { root: string; resources: string; enabled(): boolean; configured: boolean; publish(state: UpdateState): void; confirm(): Promise<boolean>; flush(): Promise<boolean>; beforeInstall(): void; installFailed?(): void; createUpdater?: () => Promise<import('electron-updater').AppUpdater> }) {
  let state: UpdateState = { phase: options.configured ? 'idle' : process.platform === 'darwin' || existsSync(join(options.root, 'installation.json')) ? 'unconfigured' : 'portable' };
  let updater: import('electron-updater').AppUpdater | null = null, busy = false, applying = false;
  const set = (next: UpdateState) => { state = next; options.publish({ ...state }); };
  const load = async () => {
    if (updater) return updater;
    const module = options.createUpdater ? null : await import('electron-updater');
    const value = options.createUpdater ? await options.createUpdater() : process.platform === 'darwin' ? new module!.MacUpdater() : new module!.NsisUpdater();
    value.logger = null; value.autoDownload = false; value.autoInstallOnAppQuit = false;
    value.allowDowngrade = false; value.allowPrerelease = false;
    value.on('update-not-available', () => set({ phase: 'current' }));
    value.on('download-progress', progress => set({ ...state, phase: 'downloading', percent: Math.max(0, Math.min(100, progress.percent)) }));
    value.on('update-downloaded', info => set({ phase: 'ready', version: info.version }));
    value.on('error', () => { options.installFailed?.(); set({ phase: 'error' }); });
    updater = value; return value;
  };
  const check = async () => {
    if (!options.configured || busy || applying || state.phase === 'ready') return { ...state };
    busy = true; set({ phase: 'checking' });
    try {
      const service = await load(), result = await service.checkForUpdates();
      if (result?.isUpdateAvailable) { set({ phase: 'downloading', version: result.updateInfo.version, percent: 0 }); await service.downloadUpdate(); }
    } catch { set({ phase: 'error' }); } finally { busy = false; }
    return { ...state };
  };
  const install = async () => {
    if (!updater || state.phase !== 'ready' || applying) return { ...state };
    applying = true;
    try { if (await options.confirm() && await options.flush()) { options.beforeInstall(); updater.quitAndInstall(false, true); } }
    catch { options.installFailed?.(); set({ phase: 'error' }); }
    finally { applying = false; }
    return { ...state };
  };
  const first = setTimeout(() => { if (options.enabled()) void check(); }, 90000); first.unref();
  const timer = setInterval(() => { if (options.enabled()) void check(); }, 6 * 60 * 60 * 1000); timer.unref();
  return { state: () => ({ ...state }), check, install, close: () => { clearTimeout(first); clearInterval(timer); } };
}
export function updateSourceReady(root: string, resources: string, platform = process.platform): boolean {
  try {
    if (!existsSync(join(resources, 'app-update.yml'))) return false;
    if (platform !== 'darwin') {
      const installation = JSON.parse(readFileSync(join(root, 'installation.json'), 'utf8'));
      if (installation.owner !== 'NotebookAid.Installation.v1') return false;
    }
    // A publisher name is mandatory; electron-updater otherwise skips Windows signature checks.
    const yaml = require('js-yaml') as { load(text: string): unknown };
    const config = yaml.load(readFileSync(join(resources, 'app-update.yml'), 'utf8')) as { provider?: string; url?: string; publisherName?: string | string[] };
    const names = typeof config.publisherName === 'string' ? [config.publisherName] : config.publisherName;
    const url = new URL(config.url ?? '');
    return config.provider === 'generic' && url.protocol === 'https:' && !url.username && !url.password && Array.isArray(names) && names.length > 0 && names.every(name => typeof name === 'string' && name.trim().length > 0);
  } catch { return false; }
}
