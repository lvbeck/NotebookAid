import type { LoginStartupSettings } from '../shared/settings';

export interface LoginItemPort {
  setLoginItemSettings(settings: { openAtLogin: boolean; path?: string; args?: string[]; name?: string; enabled?: boolean }): void;
  getLoginItemSettings(options?: { path?: string; args?: string[] }): { openAtLogin: boolean };
}
export function synchronizeLoginStartup(port: LoginItemPort, platform: string, packaged: boolean, executable: string, settings?: LoginStartupSettings): void {
  if (!packaged || !['win32', 'darwin'].includes(platform)) throw Error('WRITE_FAILED');
  const enabled = settings?.enabled ?? false;
  const options = platform === 'win32' ? { path: executable, args: ['--login-startup', ...(settings?.mode === 'window' ? [] : ['--background'])] } : {};
  port.setLoginItemSettings({ openAtLogin: enabled, ...options, ...(platform === 'win32' ? { enabled } : {}) });
  if (port.getLoginItemSettings(options).openAtLogin !== enabled) throw Error('WRITE_FAILED');
}

export function loginLaunchHidden(platform: string, argv: readonly string[], settings: LoginStartupSettings | undefined, wasOpenedAtLogin = false): boolean {
  return argv.includes('--background') || (platform === 'darwin' && wasOpenedAtLogin && settings?.enabled === true && settings.mode === 'background');
}
