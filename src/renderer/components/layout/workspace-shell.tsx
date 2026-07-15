import * as React from 'react';
import { cn } from '../../lib/utils';

interface WorkspaceShellProps {
  titleBar: React.ReactNode;
  navigation: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  width?: 'constrained' | 'fluid';
  mainClassName?: string;
  contentClassName?: string;
}

export function WorkspaceShell({
  titleBar,
  navigation,
  banner,
  children,
  width = 'constrained',
  mainClassName,
  contentClassName,
}: WorkspaceShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {titleBar}
      {navigation}
      {banner}
      <main
        id="main-content"
        role="main"
        className={cn('scrollbar-gutter-stable flex-1 overflow-y-auto', mainClassName)}
      >
        <div
          className={cn(
            'mx-auto px-5 py-6',
            width === 'constrained' ? 'max-w-7xl' : 'w-full max-w-none',
            contentClassName,
          )}
        >
          {children}
        </div>
      </main>
      <div id="sr-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
