import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Clock3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatTime12Hour } from '../../src/lib/format';
import { Button } from './button';

interface TimePickerProps {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

const selectClassName = 'h-8 w-full rounded-md border border-input bg-background px-2 text-[13px] text-foreground focus-visible:outline-none';

function timeParts(value: number) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  return {
    hour: hour24 % 12 || 12,
    minute: normalized % 60,
    period: hour24 >= 12 ? 'PM' : 'AM',
  } as const;
}

function toMinutes(hour: number, minute: number, period: 'AM' | 'PM') {
  const hour24 = hour % 12 + (period === 'PM' ? 12 : 0);
  return hour24 * 60 + minute;
}

export function TimePicker({ value, onValueChange, disabled = false, className, 'aria-label': ariaLabel }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const hourSelectRef = React.useRef<HTMLSelectElement>(null);
  const parts = timeParts(value);
  const update = (next: Partial<{ hour: number; minute: number; period: 'AM' | 'PM' }>) => {
    onValueChange(toMinutes(next.hour ?? parts.hour, next.minute ?? parts.minute, next.period ?? parts.period));
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={`${ariaLabel ?? 'Time'}: ${formatTime12Hour(value)}`}
          aria-expanded={open}
          className={cn('h-8 w-full justify-start px-2.5 text-left font-normal', className)}
        >
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-mono tabular-nums">{formatTime12Hour(value)}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => hourSelectRef.current?.focus());
          }}
          className="z-[200] w-60 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-fade-in"
        >
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            <label className="grid gap-1.5 text-[10px] font-medium text-muted-foreground">
              Hour
              <select ref={hourSelectRef} aria-label={`${ariaLabel ?? 'Time'} hour`} value={parts.hour} onChange={(event) => update({ hour: Number(event.target.value) })} className={selectClassName}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-medium text-muted-foreground">
              Minute
              <select aria-label={`${ariaLabel ?? 'Time'} minute`} value={parts.minute} onChange={(event) => update({ minute: Number(event.target.value) })} className={cn(selectClassName, 'font-mono tabular-nums')}>
                {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-medium text-muted-foreground">
              Period
              <select aria-label={`${ariaLabel ?? 'Time'} AM or PM`} value={parts.period} onChange={(event) => update({ period: event.target.value as 'AM' | 'PM' })} className={selectClassName}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
            <span className="font-mono text-[11px] text-muted-foreground">{formatTime12Hour(value)}</span>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
