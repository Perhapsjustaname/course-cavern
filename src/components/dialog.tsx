'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A modal built on the native <dialog>: the browser traps focus inside it,
 * closes it on Escape and keeps it above everything else.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  icon,
  tone = 'neutral',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'danger' | 'warning';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click that lands on the dialog itself, not its contents, is the backdrop.
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md3-xl bg-md-surface-container p-0 text-md-on-surface shadow-xl backdrop:bg-md-on-surface/40 backdrop:backdrop-blur-sm open:animate-[dialog-in_250ms_cubic-bezier(0.2,0,0,1)]"
    >
      <div className="p-6 sm:p-7">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              'mb-4 grid h-12 w-12 place-items-center rounded-md3-md',
              tone === 'danger'
                ? 'bg-md-error-container text-md-on-error-container'
                : tone === 'warning'
                  ? 'bg-md-tertiary-container text-md-on-tertiary-container'
                  : 'bg-md-secondary-container text-md-on-secondary-container',
            )}
          >
            {icon}
          </span>
        ) : null}
        <h2 id={titleId} className="text-title-lg">
          {title}
        </h2>
        <div className="mt-2">{children}</div>
      </div>
    </dialog>
  );
}
