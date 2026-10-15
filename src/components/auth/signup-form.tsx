'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signup, type AuthState } from '@/app/actions/auth';
import { TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Notice } from '@/components/notice';

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signup, undefined);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state?.message ? <Notice tone="error">{state.message}</Notice> : null}

      <TextField
        label="Full name"
        name="name"
        autoComplete="name"
        required
        defaultValue={state?.values?.name}
        error={state?.errors?.name}
      />
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
        autoComplete="new-password"
        required
        hint="At least 10 characters."
        error={state?.errors?.password}
      />

      <SubmitButton pendingLabel="Creating account" className="mt-2 w-full sm:w-auto sm:self-start">
        Create account
      </SubmitButton>

      <p className="text-body-md text-md-on-surface-variant">
        Already have one?{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-md-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
