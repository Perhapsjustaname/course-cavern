'use client';

import { useEffect, useRef } from 'react';
import { changePassword, updateName, type AccountState } from '@/app/actions/account';
import { useFormAction } from '@/components/form/use-form-action';
import { TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';

function Saved({ state }: { state: AccountState }) {
  return state?.ok ? (
    <span role="status" className="text-label-md font-medium text-md-primary">
      {state.message}
    </span>
  ) : null;
}

export function NameForm({ name }: { name: string }) {
  const { state, pending, onSubmit } = useFormAction<AccountState>(updateName, undefined);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField label="Full name" name="name" autoComplete="name" defaultValue={name} error={state?.errors?.name} />
      <div className="flex items-center gap-4">
        <SubmitButton size="md" pending={pending} pendingLabel="Saving">
          Save name
        </SubmitButton>
        <Saved state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { state, pending, onSubmit } = useFormAction<AccountState>(changePassword, undefined);
  const form = useRef<HTMLFormElement>(null);
  // Clear the fields once it has worked; leave them alone after an error.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField
        label="Current password"
        name="current"
        type="password"
        autoComplete="current-password"
        error={state?.errors?.current}
      />
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        error={state?.errors?.password}
      />
      <TextField label="New password again" name="confirm" type="password" autoComplete="new-password" error={state?.errors?.confirm} />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton size="md" pending={pending} pendingLabel="Changing">
          Change password
        </SubmitButton>
        <Saved state={state} />
      </div>
    </form>
  );
}
