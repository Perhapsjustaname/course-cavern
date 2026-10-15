import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONE: Record<Tone, string> = {
  info: 'bg-md-secondary-container text-md-on-secondary-container',
  success: 'bg-md-primary-container text-md-on-primary-container',
  warning: 'bg-md-tertiary-container text-md-on-tertiary-container',
  error: 'bg-md-error-container text-md-on-error-container',
};

/** An inline message block. Errors are announced to screen readers. */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-md3-md px-5 py-4 text-body-md', TONE[tone], className)}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={cn(title && 'mt-1', 'opacity-90')}>{children}</div> : null}
    </div>
  );
}
