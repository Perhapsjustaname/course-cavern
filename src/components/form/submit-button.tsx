'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { Button, type Size, type Variant } from '@/components/button';

/** A submit button that disables itself and says so while the action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'filled',
  size = 'lg',
  className,
  name,
  value,
  pending: pendingOverride,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  name?: string;
  value?: string;
  /** For forms submitted through useFormAction, which useFormStatus cannot see. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingOverride ?? status.pending;
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
      name={name}
      value={value}
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          {pendingLabel ?? 'Saving'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
