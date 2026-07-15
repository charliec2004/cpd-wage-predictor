import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { format } from 'date-fns';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayButton } from 'react-day-picker';
import { cn } from '../../lib/utils';
import { Button } from './button';

function fromIso(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIso(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:relative focus-visible:z-10',
        modifiers.today && !modifiers.selected && 'border border-[hsl(var(--action-primary-border)/0.6)] text-[hsl(var(--success-accent))]',
        modifiers.selected && 'bg-[hsl(var(--action-primary))] text-[hsl(var(--action-primary-foreground))] hover:bg-[hsl(var(--action-primary-hover))]',
        modifiers.outside && 'text-muted-foreground/45',
        modifiers.disabled && 'cursor-not-allowed text-muted-foreground/35 line-through hover:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  disabled = false,
  required = false,
  className,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = fromIso(value);
  const minDate = fromIso(min);
  const maxDate = fromIso(max);
  const today = new Date();
  const todayAllowed = (!minDate || today >= minDate) && (!maxDate || today <= maxDate);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn('h-8 w-full justify-start px-2.5 text-left font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{selected ? format(selected, 'MMM d, yyyy') : placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          collisionPadding={12}
          className="z-[200] w-auto rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-fade-in"
        >
          <DayPicker
            mode="single"
            required={required}
            selected={selected}
            defaultMonth={selected ?? minDate ?? today}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
            onSelect={(date: Date | undefined) => {
              if (!date) return;
              onChange(toIso(date));
              setOpen(false);
            }}
            showOutsideDays
            className="p-3"
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-3',
              month_caption: 'relative flex h-8 items-center justify-center px-9',
              caption_label: 'text-[13px] font-semibold',
              nav: 'absolute inset-x-3 top-3 flex items-center justify-between',
              button_previous: 'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-35',
              button_next: 'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-35',
              month_grid: 'border-collapse',
              weekdays: 'flex',
              weekday: 'flex h-8 w-8 items-center justify-center text-[10px] font-medium uppercase text-muted-foreground',
              week: 'mt-1 flex',
              day: 'relative h-8 w-8 p-0 text-center',
              outside: 'text-muted-foreground/45',
              disabled: 'text-muted-foreground/35',
              hidden: 'invisible',
            }}
            components={{
              Chevron: ({ orientation }) => orientation === 'left'
                ? <ChevronLeft className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />,
              DayButton: CalendarDayButton,
            }}
          />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <Button type="button" variant="ghost" size="sm" disabled={!todayAllowed} onClick={() => { onChange(toIso(today)); setOpen(false); }}>Today</Button>
            {!required && value && <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false); }}>Clear</Button>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
