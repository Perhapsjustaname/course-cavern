'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, type AuthState } from '@/app/actions/auth';
import { TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Notice } from '@/components/notice';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(login, undefined);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state?.message ? <Notice tone="error">{state.message}</Notice> : null}

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state?.values?.email}
        error={state?.errors?.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state?.errors?.password}
      />

      <SubmitButton pendingLabel="Signing in" className="mt-2 w-full sm:w-auto sm:self-start">
        Sign in
      </SubmitButton>

      <p className="text-body-md text-md-on-surface-variant">
        No account yet?{' '}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
          className="font-medium text-md-primary underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
