import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'inverse' | 'danger' | 'danger-outlined';
export type Size = 'sm' | 'md' | 'lg';

/**
 * MD3 state layers work by overlaying the base colour at a lower opacity
 * rather than swapping to a different colour, so hover never shifts hue.
 */
const VARIANTS: Record<Variant, string> = {
  filled:
    'bg-md-primary text-md-on-primary hover:bg-md-primary/90 active:bg-md-primary/80 hover:shadow-md',
  tonal:
    'bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/80 active:bg-md-secondary-container/70 hover:shadow-md',
  outlined:
    'border border-md-outline text-md-primary hover:bg-md-primary/5 active:bg-md-primary/10',
  text: 'text-md-primary hover:bg-md-primary/10 active:bg-md-primary/5',
  // For use on primary/tertiary containers, where a filled button would vanish.
  inverse:
    'bg-md-background text-md-primary hover:bg-md-background/90 active:bg-md-background/80 hover:shadow-md',
  // For actions that destroy something. Colours cannot be swapped in through
  // className, because both sets of classes would apply and the stylesheet
  // order, not the class order, decides which one shows.
  danger: 'bg-md-error text-md-on-error hover:bg-md-error/90 active:bg-md-error/80 hover:shadow-md',
  'danger-outlined': 'border border-md-error/50 text-md-error hover:bg-md-error/5 active:bg-md-error/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-5 text-label-md',
  md: 'h-10 px-6 text-label-md',
  lg: 'h-12 px-8 text-body-md',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] ' +
  'transition-all duration-300 ease-md3 active:scale-95 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-primary ' +
  'disabled:pointer-events-none disabled:opacity-50';

type Props = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = 'filled',
  size = 'md',
  className,
  children,
  ...rest
}: Props & ComponentProps<'button'>) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'filled',
  size = 'md',
  className,
  children,
  ...rest
}: Props & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {children}
    </Link>
  );
}
