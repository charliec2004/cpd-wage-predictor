import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { app, dialog, safeStorage, type BrowserWindow } from 'electron';
import {
  MAX_WORKSPACE_BYTES,
  type StorageResult,
  type Workspace,
  validateWorkspace,
  validateWorkspaceJson,
} from '../shared/workspace';

const BACKUP_LIMIT = 10;

function safeMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.includes('Secure local storage')) return error.message;
  return fallback;
}

export class WorkspaceStorage {
  private readonly dataDirectory = app.getPath('userData');
  private readonly workspacePath = join(this.dataDirectory, 'workspace.cpdw');
  private readonly backupDirectory = join(this.dataDirectory, 'backups');

  private requireEncryption(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure local storage is unavailable on this computer. The workspace remains open in memory but was not saved.');
    }
  }

  async load(): Promise<StorageResult<Workspace | null>> {
    try {
      this.requireEncryption();
      const encrypted = await readFile(this.workspacePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (!encrypted) return { ok: true, value: null };
      if (encrypted.byteLength > MAX_WORKSPACE_BYTES * 2) {
        return { ok: false, error: 'The local workspace is unexpectedly large and was not opened.' };
      }
      const json = safeStorage.decryptString(encrypted);
      const validated = validateWorkspaceJson(json);
      return validated.ok ? { ok: true, value: validated.value } : validated;
    } catch (error) {
      return { ok: false, error: safeMessage(error, 'The local workspace could not be opened.') };
    }
  }

  async save(workspace: Workspace): Promise<StorageResult> {
    if (!validateWorkspace(workspace)) {
      return { ok: false, error: 'The workspace contains invalid data and was not saved.' };
    }
    try {
      this.requireEncryption();
      const json = JSON.stringify(workspace);
      if (Buffer.byteLength(json, 'utf8') > MAX_WORKSPACE_BYTES) {
        return { ok: false, error: 'The workspace is larger than the 5 MB safety limit and was not saved.' };
      }
      await mkdir(this.dataDirectory, { recursive: true });
      await mkdir(this.backupDirectory, { recursive: true });
      await this.backupCurrentFile();
      const temporaryPath = `${this.workspacePath}.tmp`;
      await writeFile(temporaryPath, safeStorage.encryptString(json), { mode: 0o600 });
      await chmod(temporaryPath, 0o600);
      await rename(temporaryPath, this.workspacePath);
      await this.trimBackups();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: safeMessage(error, 'The workspace could not be saved.') };
    }
  }

  async exportPortable(window: BrowserWindow, workspace: Workspace): Promise<StorageResult<string>> {
    if (!validateWorkspace(workspace)) return { ok: false, error: 'The current workspace is invalid and cannot be exported.' };
    const result = await dialog.showSaveDialog(window, {
      title: 'Export CPD Wage Predictor workspace',
      defaultPath: `CPD-Wage-Predictor-${workspace.updatedAt.slice(0, 10)}.cpd.json`,
      filters: [{ name: 'CPD Wage Predictor workspace', extensions: ['json'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    try {
      await writeFile(result.filePath, `${JSON.stringify(workspace, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await chmod(result.filePath, 0o600);
      return { ok: true, value: result.filePath };
    } catch {
      return { ok: false, error: 'The workspace export could not be written to the selected location.' };
    }
  }

  async importPortable(window: BrowserWindow): Promise<StorageResult<Workspace>> {
    const result = await dialog.showOpenDialog(window, {
      title: 'Import CPD Wage Predictor workspace',
      filters: [{ name: 'CPD Wage Predictor workspace', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length !== 1) return { ok: false, canceled: true };
    const selectedPath = result.filePaths[0];
    if (!selectedPath) return { ok: false, canceled: true };
    try {
      const metadata = await stat(selectedPath);
      if (!metadata.isFile() || metadata.size > MAX_WORKSPACE_BYTES) {
        return { ok: false, error: 'The selected workspace exceeds the 5 MB import limit.' };
      }
      return validateWorkspaceJson(await readFile(selectedPath, 'utf8'));
    } catch {
      return { ok: false, error: 'The selected workspace could not be read.' };
    }
  }

  private async backupCurrentFile(): Promise<void> {
    try {
      await stat(this.workspacePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const stamp = new Date().toISOString().replaceAll(':', '-');
    const backupPath = join(this.backupDirectory, `workspace-${stamp}.cpdw`);
    await copyFile(this.workspacePath, backupPath);
    await chmod(backupPath, 0o600);
  }

  private async trimBackups(): Promise<void> {
    const entries = (await readdir(this.backupDirectory))
      .filter((name) => /^workspace-.*\.cpdw$/.test(name))
      .sort()
      .reverse();
    await Promise.all(entries.slice(BACKUP_LIMIT).map((name) => rm(join(this.backupDirectory, name), { force: true })));
  }
}
