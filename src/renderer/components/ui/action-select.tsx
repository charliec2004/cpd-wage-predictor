import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface ActionSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface ActionSelectProps {
  value: string;
  options: ActionSelectOption[];
  onValueChange: (value: string) => void;
  actionLabel: string;
  onAction: () => void;
  ariaLabel: string;
  className?: string;
  menuClassName?: string;
}

export function ActionSelect({
  value,
  options,
  onValueChange,
  actionLabel,
  onAction,
  ariaLabel,
  className,
  menuClassName,
}: ActionSelectProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const focusItem = (direction: 1 | -1) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-item]') ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = current < 0 ? (direction === 1 ? 0 : items.length - 1) : (current + direction + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn('h-8 min-w-0 justify-between px-2.5 font-normal', className)}
        >
          <span className="truncate">{selected?.label ?? 'Select'}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={menuRef}
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusItem(1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              focusItem(-1);
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-item]') ?? []);
              items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
            }
          }}
          className={cn(
            'z-[200] min-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-fade-in',
            menuClassName,
          )}
        >
          <div role="listbox" aria-label={ariaLabel} className="p-1.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value || 'default'}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-menu-item
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <Check className={cn('h-3.5 w-3.5 shrink-0 text-[hsl(var(--success-accent))]', !isSelected && 'opacity-0')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium">{option.label}</span>
                    {option.description && <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{option.description}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              data-menu-item
              onClick={() => {
                setOpen(false);
                onAction();
              }}
              className="flex w-full items-center gap-2 rounded-md bg-[hsl(var(--action-primary)/0.1)] px-2.5 py-2 text-left text-[12px] font-semibold text-[hsl(var(--success-accent))] transition-colors hover:bg-[hsl(var(--action-primary)/0.17)]"
            >
              <Plus className="h-3.5 w-3.5" />{actionLabel}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
