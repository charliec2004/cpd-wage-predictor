import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  hideCloseButton?: boolean;
}
export function DialogShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = 'max-w-md',
  contentClassName,
  footerClassName,
  hideCloseButton = false,
}: DialogShellProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const applicationRoot = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (applicationRoot) applicationRoot.inert = true;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const frame = window.requestAnimationFrame(() => {
      if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
        dialogRef.current.querySelector<HTMLElement>(focusableSelector)?.focus();
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (applicationRoot) applicationRoot.inert = false;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-surface-950/82 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative z-[121] w-full overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl',
          widthClassName,
        )}
      >
        {(title || description || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 border-b border-surface-700/90 px-4 py-3.5">
            <div className="min-w-0">
              {title && <h3 id={titleId} className="text-[15px] font-semibold text-surface-100">{title}</h3>}
              {description && (
                <p id={descriptionId} className={cn('text-[12px] leading-5 text-surface-400', title && 'mt-1')}>
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            )}
          </div>
        )}
        {children != null && <div className={cn('px-4 py-4', contentClassName)}>{children}</div>}
        {footer && (
          <div className={cn('flex items-center justify-end gap-2 border-t border-surface-700/90 px-4 py-3', footerClassName)}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
