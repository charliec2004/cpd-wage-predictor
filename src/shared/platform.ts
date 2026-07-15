export type DesktopPlatform = 'darwin' | 'win32' | 'linux';

export function isSupportedDesktopPlatform(platform: string): platform is DesktopPlatform {
  return platform === 'darwin' || platform === 'win32' || platform === 'linux';
}

export function isMacOS(platform: DesktopPlatform): boolean {
  return platform === 'darwin';
}

export function primaryShortcutModifier(platform: DesktopPlatform): 'Command' | 'Ctrl' {
  return isMacOS(platform) ? 'Command' : 'Ctrl';
}
