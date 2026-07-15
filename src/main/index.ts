import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { app, BrowserWindow, ipcMain, nativeTheme, type IpcMainInvokeEvent } from 'electron';
import { createWindowShellOptions, WINDOW_THEME_COLORS, type ResolvedTheme } from './window-shell';
import { WorkspaceStorage } from './workspace-storage';
import type { ThemePreference, Workspace } from '../shared/workspace';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const allowedThemes = new Set<ThemePreference>(['system', 'light', 'dark']);
let mainWindow: BrowserWindow | null = null;
let themePreference: ThemePreference = 'system';

function resolvedTheme(): ResolvedTheme {
  return themePreference === 'system' ? (nativeTheme.shouldUseDarkColors ? 'dark' : 'light') : themePreference;
}

function preferencesPath(): string {
  return join(app.getPath('userData'), 'preferences.json');
}

async function loadThemePreference(): Promise<void> {
  try {
    const parsed: unknown = JSON.parse(await readFile(preferencesPath(), 'utf8'));
    if (typeof parsed === 'object' && parsed !== null && 'theme' in parsed && allowedThemes.has(parsed.theme as ThemePreference)) {
      themePreference = parsed.theme as ThemePreference;
    }
  } catch {
    themePreference = 'system';
  }
  nativeTheme.themeSource = themePreference;
}

async function saveThemePreference(): Promise<void> {
  await writeFile(preferencesPath(), JSON.stringify({ theme: themePreference }), { encoding: 'utf8', mode: 0o600 });
}

function updateNativeTheme(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const chrome = WINDOW_THEME_COLORS[resolvedTheme()];
  mainWindow.setBackgroundColor(chrome.background);
  if (process.platform !== 'darwin') {
    mainWindow.setTitleBarOverlay({ color: chrome.titleBar, symbolColor: chrome.symbols, height: 48 });
  }
  mainWindow.webContents.send('theme:resolved', resolvedTheme());
}

function trustedRendererUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    if (url.protocol === 'file:') return true;
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    return Boolean(devUrl && url.origin === new URL(devUrl).origin);
  } catch {
    return false;
  }
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl || !trustedRendererUrl(senderUrl)) throw new Error('Untrusted renderer request.');
}

async function createWindow(): Promise<void> {
  const preloadPath = join(currentDirectory, '../preload/index.cjs');
  mainWindow = new BrowserWindow(
    createWindowShellOptions({
      platform: process.platform as 'darwin' | 'win32' | 'linux',
      resolvedTheme: resolvedTheme(),
      preloadPath,
    }),
  );
  mainWindow.setMenuBarVisibility(process.platform === 'darwin');
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!trustedRendererUrl(url)) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (process.env.ELECTRON_RENDERER_URL) await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  else await mainWindow.loadFile(join(currentDirectory, '../renderer/index.html'));
}

function registerIpc(storage: WorkspaceStorage): void {
  ipcMain.handle('workspace:load', (event) => {
    assertTrustedSender(event);
    return storage.load();
  });
  ipcMain.handle('workspace:save', (event, workspace: Workspace) => {
    assertTrustedSender(event);
    return storage.save(workspace);
  });
  ipcMain.handle('workspace:export', (event, workspace: Workspace) => {
    assertTrustedSender(event);
    if (!mainWindow) return { ok: false, error: 'The application window is unavailable.' };
    return storage.exportPortable(mainWindow, workspace);
  });
  ipcMain.handle('workspace:import', (event) => {
    assertTrustedSender(event);
    if (!mainWindow) return { ok: false, error: 'The application window is unavailable.' };
    return storage.importPortable(mainWindow);
  });
  ipcMain.handle('theme:get', (event) => {
    assertTrustedSender(event);
    return themePreference;
  });
  ipcMain.handle('theme:set', async (event, nextTheme: unknown) => {
    assertTrustedSender(event);
    if (!allowedThemes.has(nextTheme as ThemePreference)) return { ok: false, error: 'Invalid theme preference.' };
    themePreference = nextTheme as ThemePreference;
    nativeTheme.themeSource = themePreference;
    await saveThemePreference();
    updateNativeTheme();
    return { ok: true };
  });
}

app.whenReady().then(async () => {
  await loadThemePreference();
  const storage = new WorkspaceStorage();
  registerIpc(storage);
  nativeTheme.on('updated', updateNativeTheme);
  await createWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
