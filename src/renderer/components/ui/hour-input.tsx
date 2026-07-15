import * as React from 'react';
import { cn } from '../../lib/utils';
import { HOUR_INPUT_STEP, clampHours, formatHoursValue, parseHoursInputValue } from '../../utils/hours';

interface HourInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> {
  value: number;
  onValueChange: (value: number) => void;
}

const HourInput = React.forwardRef<HTMLInputElement, HourInputProps>(
  ({ className, value, onValueChange, min, max, onBlur, onKeyDown, ...props }, ref) => {
    const numericMin = typeof min === 'string' ? Number(min) : min;
    const numericMax = typeof max === 'string' ? Number(max) : max;
    const [draft, setDraft] = React.useState(() => formatHoursValue(value));

    React.useEffect(() => setDraft(formatHoursValue(value)), [value]);

    const commitValue = React.useCallback(
      (nextValue: number) => {
        const clamped = clampHours(nextValue, numericMin, numericMax);
        onValueChange(clamped);
        setDraft(formatHoursValue(clamped));
      },
      [numericMax, numericMin, onValueChange],
    );

    const commitDraft = React.useCallback(() => {
      const parsed = parseHoursInputValue(draft);
      if (parsed === null) {
        setDraft(formatHoursValue(value));
        return;
      }
      commitValue(parsed);
    }, [commitValue, draft, value]);

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          commitDraft();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitDraft();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            setDraft(formatHoursValue(value));
            event.currentTarget.blur();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const baseValue = parseHoursInputValue(draft) ?? value;
            commitValue(baseValue + (event.key === 'ArrowUp' ? HOUR_INPUT_STEP : -HOUR_INPUT_STEP));
          }
          onKeyDown?.(event);
        }}
        className={cn(
          'flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] tabular-nums text-foreground transition-colors',
          'placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
    );
  },
);

HourInput.displayName = 'HourInput';

export { HourInput };
