import * as React from 'react';
import { validateWorkspace, type Workspace } from '../../../shared/workspace';
import { createInitialWorkspace } from '../domain/seed';

const PREVIEW_STORAGE_KEY = 'cpd-wage-predictor-preview-workspace';

interface WorkspaceState {
  workspace: Workspace | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
  previewMode: boolean;
  updateWorkspace: (updater: (current: Workspace) => Workspace) => void;
  exportWorkspace: () => Promise<void>;
  importWorkspace: () => Promise<void>;
  clearMessage: () => void;
}

export function useWorkspace(): WorkspaceState {
  const [workspace, setWorkspace] = React.useState<Workspace | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const hydrated = React.useRef(false);
  const previewMode = !window.cpdWagePredictor;

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      if (!window.cpdWagePredictor) {
        const stored = localStorage.getItem(PREVIEW_STORAGE_KEY);
        let initial = createInitialWorkspace();
        if (stored) {
          try {
            const candidate: unknown = JSON.parse(stored);
            if (validateWorkspace(candidate)) initial = candidate;
            else localStorage.removeItem(PREVIEW_STORAGE_KEY);
          } catch {
            localStorage.removeItem(PREVIEW_STORAGE_KEY);
          }
        }
        if (active) {
          setWorkspace(initial);
          setLoading(false);
          hydrated.current = true;
        }
        return;
      }
      const result = await window.cpdWagePredictor.loadWorkspace();
      if (!active) return;
      if (result.ok) setWorkspace(result.value ?? createInitialWorkspace());
      else {
        setWorkspace(createInitialWorkspace());
        setError(result.error ?? 'The workspace could not be opened.');
      }
      setLoading(false);
      hydrated.current = true;
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!workspace || !hydrated.current) return;
    const timeout = window.setTimeout(async () => {
      setSaving(true);
      if (!window.cpdWagePredictor) {
        localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(workspace));
        setSaving(false);
        return;
      }
      const result = await window.cpdWagePredictor.saveWorkspace(workspace);
      setSaving(false);
      setError(result.ok ? null : result.error ?? 'The workspace could not be saved.');
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [workspace]);

  const updateWorkspace = React.useCallback((updater: (current: Workspace) => Workspace) => {
    setWorkspace((current) => {
      if (!current) return current;
      return { ...updater(current), updatedAt: new Date().toISOString() };
    });
  }, []);

  const exportWorkspace = React.useCallback(async () => {
    if (!workspace) return;
    if (!window.cpdWagePredictor) {
      setError('Portable export is available in the Electron desktop application.');
      return;
    }
    const result = await window.cpdWagePredictor.exportWorkspace(workspace);
    if (result.ok) setMessage(`Workspace exported to ${result.value}.`);
    else if (!result.canceled) setError(result.error ?? 'The workspace could not be exported.');
  }, [workspace]);

  const importWorkspace = React.useCallback(async () => {
    if (!window.cpdWagePredictor) {
      setError('Portable import is available in the Electron desktop application.');
      return;
    }
    const result = await window.cpdWagePredictor.importWorkspace();
    if (result.ok && result.value) {
      setWorkspace({ ...result.value, updatedAt: new Date().toISOString() });
      setMessage(`Imported ${result.value.name}.`);
    } else if (!result.canceled) setError(result.error ?? 'The workspace could not be imported.');
  }, []);

  return {
    workspace,
    loading,
    saving,
    error,
    message,
    previewMode,
    updateWorkspace,
    exportWorkspace,
    importWorkspace,
    clearMessage: () => {
      setMessage(null);
      setError(null);
    },
  };
}
