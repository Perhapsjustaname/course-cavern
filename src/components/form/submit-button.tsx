'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { Button } from '@/components/button';

/** A submit button that disables itself and says so while the action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'filled',
  size = 'lg',
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'inverse';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
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
