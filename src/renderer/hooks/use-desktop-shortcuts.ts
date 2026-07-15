import * as React from 'react';

interface DesktopShortcut {
  key: string;
  targetId: string;
}

interface UseDesktopShortcutsOptions {
  navigation: DesktopShortcut[];
  onNavigate: (targetId: string) => void;
  onOpenSettings: () => void;
  onDismissTopmost?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

export function useDesktopShortcuts({
  navigation,
  onNavigate,
  onOpenSettings,
  onDismissTopmost,
}: UseDesktopShortcutsOptions) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        if (event.key === ',') {
          event.preventDefault();
          onOpenSettings();
          return;
        }

        const destination = navigation.find((shortcut) => shortcut.key === event.key);
        if (destination) {
          event.preventDefault();
          onNavigate(destination.targetId);
          return;
        }
      }

      if (event.key === 'Escape') onDismissTopmost?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigation, onDismissTopmost, onNavigate, onOpenSettings]);
}
