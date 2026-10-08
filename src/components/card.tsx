import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Cards sit on Surface Container, never white. Depth comes from the tonal
 * step against the background first, and only then from the shadow.
 */
export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md3-lg bg-md-surface-container p-6 shadow-sm transition-all duration-300 ease-md3 sm:p-8',
        interactive && 'hover:scale-[1.02] hover:shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}
