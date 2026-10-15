'use client';

import { useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';

/** A small round icon button that submits its form and shows when it is busy. */
export function IconSubmit({
  label,
  children,
  disabled,
  tone = 'neutral',
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  tone?: 'neutral' | 'danger';
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      disabled={disabled || pending}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3',
        'active:scale-90 disabled:pointer-events-none disabled:opacity-30',
        tone === 'danger' ? 'hover:bg-md-error/10 hover:text-md-error' : 'hover:bg-md-primary/10 hover:text-md-primary',
        pending && 'animate-pulse',
      )}
    >
      {children}
    </button>
  );
}

export const ArrowUp = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15V5m0 0-4.5 4.5M10 5l4.5 4.5" />
  </svg>
);
export const ArrowDown = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 5v10m0 0-4.5-4.5M10 15l4.5-4.5" />
  </svg>
);
export const Pencil = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 3.5a1.8 1.8 0 0 1 2.5 2.5L7 15l-3.5 1 1-3.5 9-9Z" />
  </svg>
);
export const Trash = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h12M8 6V4.5h4V6m-6.5 0 .7 9.5h7.6l.7-9.5" />
  </svg>
);

/**
 * Delete in two steps. The first click arms it; the second, on a clearly red
 * button, does it. Cheaper than a modal and impossible to fat-finger.
 */
export function ConfirmDelete({ action, what }: { action: () => Promise<void>; what: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        aria-label={`Delete ${what}`}
        title={`Delete ${what}`}
        onClick={() => setArmed(true)}
        className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3 hover:bg-md-error/10 hover:text-md-error active:scale-90"
      >
        <Trash />
      </button>
    );
  }
  return (
    <form action={action} data-armed className="flex items-center gap-1">
      <DangerSubmit what={what} />
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded-full px-3 py-1.5 text-label-sm font-medium text-md-on-surface-variant transition-colors duration-200 hover:bg-md-primary/10"
      >
        Keep
      </button>
    </form>
  );
}

function DangerSubmit({ what }: { what: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      autoFocus
      className="rounded-full bg-md-error px-3.5 py-1.5 text-label-sm font-medium text-md-on-error transition-all duration-200 ease-md3 hover:bg-md-error/90 active:scale-95 disabled:opacity-60"
    >
      {pending ? 'Deleting' : `Delete ${what}`}
    </button>
  );
}

const KIND_PATHS: Record<string, ReactNode> = {
  video: <path d="M8 6.5v7l5.5-3.5L8 6.5Z" fill="currentColor" stroke="none" />,
  audio: <path d="M5 11V9m3 4.5v-7m3 9v-11m3 8.5v-6m3 3.5v-1" />,
  pdf: <path d="M6 3.5h6l3 3V16.5H6v-13Zm6 0V7h3M8.5 10.5h4M8.5 13h4" />,
  text: <path d="M5 6h10M5 9.5h10M5 13h6.5" />,
  quiz: <path d="M7.5 7.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4V12M10 14.6v.4" />,
};

export function KindIcon({ kind }: { kind: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-md-secondary-container text-md-on-secondary-container">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {KIND_PATHS[kind]}
      </svg>
    </span>
  );
}
