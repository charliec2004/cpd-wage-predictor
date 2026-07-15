import * as React from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type NoticeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const styles: Record<NoticeVariant, string> = {
  neutral: 'border-border bg-surface-900/60 text-surface-100',
  success:
    'border-[hsl(var(--action-primary-border)/0.5)] bg-[hsl(var(--success-accent-bg))] text-[hsl(var(--success-notice-foreground))]',
  warning: 'border-warning-500/55 bg-warning-500/12 text-surface-100',
  error: 'border-destructive/45 bg-destructive/10 text-surface-100',
  info: 'border-border bg-surface-900/60 text-surface-100',
};

const icons = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleAlert,
  info: Info,
};

interface NoticePanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: NoticeVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

export function NoticePanel({
  className,
  variant = 'neutral',
  title,
  description,
  children,
  icon,
  ...props
}: NoticePanelProps) {
  const Icon = icons[variant];
  return (
    <div className={cn('rounded-lg border px-3.5 py-3', styles[variant], className)} {...props}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon ?? <Icon className="h-4 w-4" strokeWidth={1.9} />}</div>
        <div className="min-w-0 flex-1">
          {title && <div className="text-[13px] font-medium">{title}</div>}
          {description && <div className={cn('text-[12px] leading-5 text-surface-400', title && 'mt-0.5')}>{description}</div>}
          {children && <div className={cn('text-[12px] leading-5', (title || description) && 'mt-2')}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
