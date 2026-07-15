import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../styles/tokens.css';

async function applyInitialTheme(): Promise<void> {
  const preference = window.cpdWagePredictor
    ? await window.cpdWagePredictor.getTheme()
    : localStorage.getItem('cpd-theme') ?? 'system';
  const resolved = preference === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference;
  document.documentElement.classList.add(resolved === 'dark' ? 'dark' : 'light');
}

await applyInitialTheme();
const root = document.getElementById('root');
if (!root) throw new Error('Application root is unavailable.');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
