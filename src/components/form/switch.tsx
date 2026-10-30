import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** MD3 switch. A real checkbox underneath, so forms submit "on" when it is set. */
export function Switch({
  name,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  description?: ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span>
        <span className="block text-body-md font-medium text-md-on-surface">{label}</span>
        {description ? <span className="mt-0.5 block text-label-md text-md-on-surface-variant">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          role="switch"
          name={name}
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'block h-8 w-[3.25rem] rounded-full border-2 border-md-outline bg-md-surface-container-low transition-colors duration-200 ease-md3',
            'peer-checked:border-md-primary peer-checked:bg-md-primary',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-md-primary',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 rounded-full bg-md-outline transition-all duration-200 ease-md3',
            'peer-checked:left-[1.6rem] peer-checked:h-6 peer-checked:w-6 peer-checked:bg-md-on-primary',
          )}
        />
      </span>
    </label>
  );
}
