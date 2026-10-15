import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, open, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type { UpdateState } from '../shared/updates';

const repository = 'https://github.com/lvbeck/NotebookAid';
export interface MsiFeed { provider: 'github-msi'; url: string; publisherName: string; }
export interface MsiRelease { version: string; url: string; sha256: string; size: number; }
export function isMsiInstallation(root: string): boolean {
  try { const value = JSON.parse(readFileSync(join(root, 'installation.json'), 'utf8')); return value.owner === 'NotebookAid.Installation.v1' && value.installer === 'msi' && ['user', 'machine'].includes(value.scope); } catch { return false; }
}
export function readMsiFeed(resources: string): MsiFeed | null {
  try {
    const value = JSON.parse(readFileSync(join(resources, 'msi-update.json'), 'utf8'));
    if (value.provider !== 'github-msi' || value.url !== repository + '/releases/latest/download/latest-msi.json' || typeof value.publisherName !== 'string' || !value.publisherName.trim() || value.publisherName.length > 256) return null;
    return value;
  } catch { return null; }
}
export function validateMsiRelease(value: unknown): MsiRelease {
  const release = value as MsiRelease;
  if (!release || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.version) || !/^[a-f0-9]{64}$/.test(release.sha256) || !Number.isSafeInteger(release.size) || release.size < 1 || release.size > 2 * 1024 ** 3 || release.url !== `${repository}/releases/download/v${release.version}/NotebookAid-${release.version}-Setup-x64.msi`) throw Error('Invalid MSI release metadata.');
  const parts = release.version.split('.').map(Number);
  if (parts[0]! > 255 || parts[1]! > 255 || parts[2]! > 65535) throw Error('Invalid MSI product version.');
  return release;
}
export function newerMsiVersion(candidate: string, current: string): boolean {
  const left = candidate.split('.').map(Number), right = current.split('.').map(Number);
  if (left.length !== 3 || right.length !== 3 || [...left, ...right].some(value => !Number.isSafeInteger(value) || value < 0)) return false;
  for (let n = 0; n < 3; n++) { if (left[n] !== right[n]) return left[n]! > right[n]!; } return false;
}
interface Options {
  root: string; resources: string; configured: boolean; enabled(): boolean; publish(state: UpdateState): void;
  confirm(): Promise<boolean>; flush(): Promise<boolean>; beforeInstall(): void; installFailed?(): void;
}
export function registerMsiUpdates(options: Options) {
  let state: UpdateState = {phase: options.configured && readMsiFeed(options.resources) ? 'idle' : 'unconfigured'};
  let busy = false, applying = false, downloaded: {file: string; directory: string; release: MsiRelease; publisher: string} | null = null;
  const set = (value: UpdateState) => { state = value; options.publish({...state}); };
  const verifier = join(options.root, 'Update-MSI.ps1');
  const powershell = join(process.env['WINDIR'] || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const verifyArguments = (item: NonNullable<typeof downloaded>) => ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', verifier, '-InstallerPath', item.file, '-Version', item.release.version, '-Publisher', item.publisher, '-Sha256', item.release.sha256, '-Root', options.root];
  const check = async () => {
    if (!options.configured || busy || applying || state.phase === 'ready') return {...state};
    const config = readMsiFeed(options.resources); if (!config || !isMsiInstallation(options.root)) { set({phase:'unconfigured'}); return {...state}; }
    busy = true; set({phase:'checking'}); let directory: string | null = null;
    try {
      const response = await fetch(config.url, {signal:AbortSignal.timeout(30000)});
      if (!response.ok || Number(response.headers.get('content-length') || 0) > 32768) throw Error('MSI update metadata unavailable.');
      if (!response.body) throw Error('Missing MSI metadata.');
      const chunks: Uint8Array[] = []; let bytes = 0;
      for await (const chunk of response.body) { bytes += chunk.length; if (bytes > 32768) throw Error('MSI metadata too large.'); chunks.push(chunk); }
      const release = validateMsiRelease(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      const {app} = await import('electron');
      if (!newerMsiVersion(release.version, app.getVersion())) { set({phase:'current'}); return {...state}; }
      if (!existsSync(verifier)) throw Error('MSI update verifier unavailable.');
      const cache = join(app.getPath('userData'), 'msi-updates'); await mkdir(cache, {recursive:true}); directory = await mkdtemp(join(cache, 'download-'));
      const file = join(directory, `NotebookAid-${release.version}-Setup-x64.msi`);
      const asset = await fetch(release.url, {signal:AbortSignal.timeout(10 * 60 * 1000)});
      if (!asset.ok || !asset.body) throw Error('MSI update download failed.');
      const output = await open(file, 'wx', 0o600), hash = createHash('sha256'); let count = 0;
      try {
        for await (const chunk of asset.body) { count += chunk.length; if (count > release.size) throw Error('MSI update size mismatch.'); hash.update(chunk); await output.writeFile(chunk); set({phase:'downloading',version:release.version,percent:count * 100 / release.size}); }
      } finally { await output.close(); }
      if (count !== release.size || hash.digest('hex') !== release.sha256) throw Error('MSI update checksum mismatch.');
      const item = {file, directory, release, publisher:config.publisherName};
      await promisify(execFile)(powershell, verifyArguments(item), {windowsHide:true, timeout:60000, maxBuffer:65536});
      downloaded = item; directory = null; set({phase:'ready',version:release.version});
    } catch { set({phase:'error'}); }
    finally { busy = false; if (directory) await rm(directory, {recursive:true,force:true}); }
    return {...state};
  };
  const install = async () => {
    if (!downloaded || state.phase !== 'ready' || applying) return {...state};
    applying = true;
    try {
      if (await options.confirm() && await options.flush()) {
        // Recheck before exit. The launcher rechecks while holding a read-only file lock.
        await promisify(execFile)(powershell, verifyArguments(downloaded), {windowsHide:true,timeout:60000,maxBuffer:65536});
        const child = spawn(powershell, [...verifyArguments(downloaded), '-Install', '-ParentProcessId', String(process.pid)], {detached:true,stdio:'ignore',windowsHide:true});
        await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
        child.unref(); options.beforeInstall(); (await import('electron')).app.quit();
      }
    } catch { options.installFailed?.(); set({phase:'error'}); } finally { applying = false; }
    return {...state};
  };
  const first = setTimeout(() => { if (options.enabled()) void check(); }, 90000); first.unref();
  const timer = setInterval(() => { if (options.enabled()) void check(); }, 6 * 60 * 60 * 1000); timer.unref();
  return {state:() => ({...state}),check,install,close:() => {clearTimeout(first);clearInterval(timer);}};
}
