import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

export interface DesktopTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  hasAttention?: boolean;
}

interface TopTabNavigationProps {
  tabs: DesktopTab[];
  activeTab: string;
  onActiveTabChange: (tabId: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function TopTabNavigation({
  tabs,
  activeTab,
  onActiveTabChange,
  ariaLabel = 'Main navigation',
  className,
}: TopTabNavigationProps) {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const activateAndFocus = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    onActiveTabChange(tab.id);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    activateAndFocus(nextIndex);
  };

  return (
    <nav className={cn('shrink-0 border-b border-border bg-surface-900/95', className)}>
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex gap-0.5" role="tablist" aria-label={ariaLabel}>
          {tabs.map((tab, index) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onActiveTabChange(tab.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  'relative inline-flex h-10 items-center gap-1.5 border-b-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150',
                  'hover:border-border hover:text-foreground',
                  selected && 'border-foreground text-foreground',
                  tab.hasAttention && 'text-surface-100',
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge != null && (
                  <Badge
                    variant={selected ? 'default' : 'secondary'}
                    className={cn('ml-0.5 min-w-5 justify-center px-1.5', selected && 'bg-foreground/10 text-foreground')}
                  >
                    {tab.badge}
                  </Badge>
                )}
                {tab.hasAttention && (
                  <>
                    <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-surface-200" aria-hidden="true" />
                    <span className="sr-only">Needs attention</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
