'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { FormState } from '@/app/actions/courses';
import { Dialog } from '@/components/dialog';
import { TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Button } from '@/components/button';
import { useFormAction } from '@/components/form/use-form-action';

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/**
 * For actions that are hard to take back. Asks for the password again rather
 * than trusting that whoever is at the keyboard is the account holder.
 */
export function PasswordConfirm({
  action,
  triggerLabel,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  triggerVariant = 'outlined',
}: {
  action: Action;
  triggerLabel: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'warning';
  triggerVariant?: 'outlined' | 'tonal' | 'text';
}) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button
        type="button"
        variant={tone === 'danger' ? 'danger-outlined' : triggerVariant}
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={title}
        tone={tone}
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="10.5" width="14" height="10" rx="2" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
        }
      >
        <div className="text-body-md text-md-on-surface-variant">{children}</div>
        {/* Keyed so each opening starts with an empty field and no old error. */}
        <PasswordForm key={round} action={action} confirmLabel={confirmLabel} tone={tone} onDone={close} />
      </Dialog>
    </>
  );
}

function PasswordForm({
  action,
  confirmLabel,
  tone,
  onDone,
}: {
  action: Action;
  confirmLabel: string;
  tone: 'danger' | 'warning';
  onDone: () => void;
}) {
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
      <TextField
        label="Your password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        error={state?.errors?.password ?? (state?.ok ? undefined : state?.message)}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="text" onClick={onDone}>
          Keep it
        </Button>
        <SubmitButton size="md" variant={tone === 'danger' ? 'danger' : 'filled'} pending={pending} pendingLabel="Checking">
          {confirmLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
