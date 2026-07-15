import type { DesktopApi } from '../../shared/workspace';

declare global {
  interface Window {
    cpdWagePredictor?: DesktopApi;
  }
}

export {};
