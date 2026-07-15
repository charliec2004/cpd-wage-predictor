import * as React from 'react';
import type { ThemePreference } from '../../../shared/workspace';

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');

  React.useEffect(() => {
    const load = async () => {
      const saved = window.cpdWagePredictor
        ? await window.cpdWagePredictor.getTheme()
        : ((localStorage.getItem('cpd-theme') as ThemePreference | null) ?? 'system');
      setPreferenceState(saved);
    };
    void load();
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = resolveTheme(preference);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = React.useCallback(async (next: ThemePreference) => {
    document.documentElement.classList.add('theme-transition');
    setPreferenceState(next);
    if (window.cpdWagePredictor) await window.cpdWagePredictor.setTheme(next);
    else localStorage.setItem('cpd-theme', next);
    window.setTimeout(() => document.documentElement.classList.remove('theme-transition'), 200);
  }, []);

  return { preference, setPreference };
}
