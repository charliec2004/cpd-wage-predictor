import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input, type InputProps } from '../../components/ui/input';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('grid gap-1.5 text-[12px] font-medium text-foreground', className)}>
      <span>{label}</span>
      {children}
      {hint && <span className="font-normal leading-4 text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-8 w-full appearance-none rounded-md border border-input bg-background px-2.5 pr-8 text-[13px] text-foreground focus-visible:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2 h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
    </div>
  );
}

interface MoneyInputProps extends Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onValueChange, onBlur, onKeyDown, ...props }, forwardedRef) => {
    const [draft, setDraft] = React.useState(value);
    React.useEffect(() => setDraft(value), [value]);

    const commit = () => onValueChange(draft);

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1.5 text-[13px] text-muted-foreground">$</span>
        <Input
          {...props}
          ref={forwardedRef}
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => {
            commit();
            onBlur?.(event);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit();
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              setDraft(value);
              event.currentTarget.blur();
            }
            onKeyDown?.(event);
          }}
          className={cn('pl-6 font-mono tabular-nums', className)}
        />
      </div>
    );
  },
);

MoneyInput.displayName = 'MoneyInput';
