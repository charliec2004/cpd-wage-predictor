import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi, ThemePreference, Workspace } from '../shared/workspace';

const platform = process.platform === 'darwin' || process.platform === 'win32' ? process.platform : 'linux';

const api: DesktopApi = Object.freeze({
  platform,
  loadWorkspace: () => ipcRenderer.invoke('workspace:load'),
  saveWorkspace: (workspace: Workspace) => ipcRenderer.invoke('workspace:save', workspace),
  exportWorkspace: (workspace: Workspace) => ipcRenderer.invoke('workspace:export', workspace),
  importWorkspace: () => ipcRenderer.invoke('workspace:import'),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme: ThemePreference) => ipcRenderer.invoke('theme:set', theme),
});

contextBridge.exposeInMainWorld('cpdWagePredictor', api);
