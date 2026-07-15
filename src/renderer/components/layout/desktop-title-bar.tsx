import * as React from 'react';
import { cn } from '../../lib/utils';
import { isMacOS, type DesktopPlatform } from '../../../shared/platform';

interface DesktopTitleBarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  platform: DesktopPlatform;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  utilities?: React.ReactNode;
}

export function DesktopTitleBar({
  platform,
  icon,
  title,
  subtitle,
  utilities,
  className,
  ...props
}: DesktopTitleBarProps) {
  const macOS = isMacOS(platform);

  return (
    <header
      className={cn(
        'titlebar-drag h-12 shrink-0 border-b border-border bg-surface-900/95 backdrop-blur',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex h-full items-center justify-between gap-4',
          macOS ? 'pl-24 pr-5' : 'titlebar-safe-area',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-surface-300">
              {icon}
            </div>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 text-[14px] font-semibold tracking-tight text-foreground">{title}</div>
            {subtitle && (
              <>
                <span className="hidden h-3.5 w-px bg-border md:block" aria-hidden="true" />
                <p className="hidden truncate text-[12px] text-muted-foreground md:block">{subtitle}</p>
              </>
            )}
          </div>
        </div>

        {utilities && <div className="no-drag flex shrink-0 items-center gap-1.5">{utilities}</div>}
      </div>
    </header>
  );
}
