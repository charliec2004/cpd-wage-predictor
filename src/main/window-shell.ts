import type { BrowserWindowConstructorOptions } from 'electron';
import { isMacOS, type DesktopPlatform } from '../shared/platform';

export type ResolvedTheme = 'dark' | 'light';

export const TITLE_BAR_HEIGHT = 48;

export const WINDOW_THEME_COLORS = {
  dark: {
    background: '#0a0a0a',
    titleBar: '#121212',
    symbols: '#d1d1d1',
  },
  light: {
    background: '#fcfcfc',
    titleBar: '#f7f7f8',
    symbols: '#42424a',
  },
} as const;

interface WindowShellOptions {
  platform: DesktopPlatform;
  resolvedTheme: ResolvedTheme;
  preloadPath: string;
}

export function createWindowShellOptions({
  platform,
  resolvedTheme,
  preloadPath,
}: WindowShellOptions): BrowserWindowConstructorOptions {
  const chrome = WINDOW_THEME_COLORS[resolvedTheme];
  const platformChrome: Partial<BrowserWindowConstructorOptions> = isMacOS(platform)
    ? {
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 18 },
      }
    : {
        titleBarStyle: 'hidden',
        titleBarOverlay: {
          color: chrome.titleBar,
          symbolColor: chrome.symbols,
          height: TITLE_BAR_HEIGHT,
        },
      };

  return {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'CPD Wage Predictor',
    backgroundColor: chrome.background,
    ...platformChrome,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}
