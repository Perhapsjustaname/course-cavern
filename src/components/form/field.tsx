import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * MD3 filled text field: tonal fill, rounded top, square bottom, and a 2px
 * indicator line that turns primary on focus and error-red when invalid. The
 * label sits inside the container, as the spec draws it.
 */
const CONTAINER =
  'relative block rounded-t-md3-sm border-b-2 bg-md-surface-container-low px-4 pt-2.5 pb-2 ' +
  'transition-colors duration-200 ease-md3 hover:bg-md-surface-container-low/80';

const LABEL = 'block text-label-sm font-medium transition-colors duration-200';
const CONTROL =
  'mt-0.5 block w-full bg-transparent text-body-md text-md-on-surface outline-none ' +
  'placeholder:text-md-on-surface-variant/50 disabled:cursor-not-allowed';

type Base = {
  label: string;
  name: string;
  error?: string[] | string;
  hint?: ReactNode;
  className?: string;
};

function firstError(e: Base['error']) {
  return Array.isArray(e) ? e[0] : e;
}

function Frame({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('group', className)}>
      <label
        htmlFor={id}
        className={cn(
          CONTAINER,
          error
            ? 'border-md-error'
            : 'border-md-outline focus-within:border-md-primary',
        )}
      >
        <span
          className={cn(
            LABEL,
            error ? 'text-md-error' : 'text-md-on-surface-variant group-focus-within:text-md-primary',
          )}
        >
          {label}
        </span>
        {children}
      </label>
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 px-4 text-label-sm text-md-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1.5 px-4 text-label-sm text-md-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  name,
  error,
  hint,
  className,
  ...input
}: Base & Omit<ComponentProps<'input'>, 'name'>) {
  const id = input.id ?? `f-${name}`;
  const msg = firstError(error);
  return (
    <Frame id={id} label={label} error={msg} hint={hint} className={className}>
      <input
        id={id}
        name={name}
        aria-invalid={msg ? true : undefined}
        aria-describedby={msg || hint ? `${id}-msg` : undefined}
        className={CONTROL}
        {...input}
      />
    </Frame>
  );
}

export function TextAreaField({
  label,
  name,
  error,
  hint,
  className,
  ...area
}: Base & Omit<ComponentProps<'textarea'>, 'name'>) {
  const id = area.id ?? `f-${name}`;
  const msg = firstError(error);
  return (
    <Frame id={id} label={label} error={msg} hint={hint} className={className}>
      <textarea
        id={id}
        name={name}
        rows={area.rows ?? 5}
        aria-invalid={msg ? true : undefined}
        aria-describedby={msg || hint ? `${id}-msg` : undefined}
        className={cn(CONTROL, 'resize-y leading-relaxed')}
        {...area}
      />
    </Frame>
  );
}

export function SelectField({
  label,
  name,
  error,
  hint,
  className,
  options,
  placeholder,
  ...select
}: Base &
  Omit<ComponentProps<'select'>, 'name'> & {
    options: ReadonlyArray<{ value: string; label: string } | string>;
    placeholder?: string;
  }) {
  const id = select.id ?? `f-${name}`;
  const msg = firstError(error);
  return (
    <Frame id={id} label={label} error={msg} hint={hint} className={className}>
      <span className="relative block">
        <select
          id={id}
          name={name}
          aria-invalid={msg ? true : undefined}
          aria-describedby={msg || hint ? `${id}-msg` : undefined}
          className={cn(CONTROL, 'cursor-pointer appearance-none pr-8')}
          {...select}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-0 h-5 w-5 -translate-y-1/2 fill-md-on-surface-variant"
        >
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-md-on-surface-variant" />
        </svg>
      </span>
    </Frame>
  );
}
