'use client';

import { startTransition, useActionState, useRef, useState, type FormEvent } from 'react';
import { submitApplication, type ApplyState } from '@/app/actions/apply';
import { SelectField, TextAreaField, TextField } from '@/components/form/field';
import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { CredentialRow } from '@/components/apply/credential-row';
import { INDUSTRIES, MAX_CREDENTIALS_PER_SUBMIT } from '@/lib/constants';

type Defaults = {
  displayName: string;
  headline: string;
  industry: string;
  yearsExperience: string;
  bio: string;
};

export function ApplicationForm({
  defaults,
  hasExistingDocuments,
  resubmitting,
}: {
  defaults: Defaults;
  hasExistingDocuments: boolean;
  resubmitting: boolean;
}) {
  const [state, dispatch, pending] = useActionState<ApplyState, FormData>(submitApplication, undefined);
  const [rows, setRows] = useState<number[]>([0]);
  const nextId = useRef(1);
  const [blocked, setBlocked] = useState<string | null>(null);

  // Submitted by hand rather than through <form action>, because React resets a
  // form after an action runs and a file input cannot be refilled. One typo in
  // the bio should not cost someone their three attached documents.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const badFile = form.querySelector<HTMLInputElement>('input[type=file][data-file-error="true"]');
    if (badFile) {
      setBlocked('One of the files cannot be uploaded. Fix the marked document first.');
      badFile.closest('fieldset')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBlocked(null);
    const data = new FormData(form);
    startTransition(() => dispatch(data));
  }

  const minRows = hasExistingDocuments ? 0 : 1;
  const message = blocked ?? state?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      {message ? <Notice tone="error">{message}</Notice> : null}

      <section aria-labelledby="about-heading">
        <h2 id="about-heading" className="text-title-lg">
          About you
        </h2>
        <p className="mt-1 text-body-md text-md-on-surface-variant">
          This is what students will see on your profile once you are approved.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField
            label="Name shown to students"
            name="displayName"
            defaultValue={defaults.displayName}
            error={state?.errors?.displayName}
          />
          <SelectField
            label="Industry"
            name="industry"
            options={INDUSTRIES}
            defaultValue={defaults.industry}
            placeholder="Choose one"
            error={state?.errors?.industry}
          />
          <TextField
            label="Headline"
            name="headline"
            defaultValue={defaults.headline}
            placeholder="e.g. Master electrician, residential and light commercial"
            error={state?.errors?.headline}
            className="sm:col-span-2"
          />
          <TextField
            label="Years working in this field"
            name="yearsExperience"
            type="number"
            inputMode="numeric"
            min={0}
            max={80}
            defaultValue={defaults.yearsExperience}
            error={state?.errors?.yearsExperience}
          />
          <div className="hidden sm:block" />
          <TextAreaField
            label="Your background"
            name="bio"
            rows={6}
            defaultValue={defaults.bio}
            hint="Where you have worked, what you specialise in, and anything that would help a reviewer place your documents."
            error={state?.errors?.bio}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="text-title-lg">
          {resubmitting ? 'Add documents' : 'Your evidence'}
        </h2>
        <p className="mt-1 text-body-md text-md-on-surface-variant">
          {resubmitting
            ? 'Anything you sent before is still on file. Add whatever the reviewer asked for.'
            : 'At least one document. Licences and certifications carry the most weight.'}
        </p>

        <div className="mt-6 flex flex-col gap-5">
          {rows.map((id, position) => (
            <CredentialRow
              key={id}
              rowId={id}
              position={position}
              errors={state?.credentialErrors?.[id]}
              onRemove={rows.length > minRows ? () => setRows((r) => r.filter((x) => x !== id)) : undefined}
            />
          ))}
        </div>

        {rows.length < MAX_CREDENTIALS_PER_SUBMIT ? (
          <Button
            type="button"
            variant="tonal"
            className="mt-5"
            onClick={() => setRows((r) => [...r, nextId.current++])}
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add another document
          </Button>
        ) : (
          <p className="mt-5 text-label-md text-md-on-surface-variant">
            That is the most you can send at once. You can add more later if a reviewer asks.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-4 rounded-md3-lg bg-md-surface-container p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-body-md text-md-on-surface-variant">
          Sending this puts your application in the review queue. You can start drafting courses
          straight away.
        </p>
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined} className="shrink-0">
          {pending ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              Uploading
            </>
          ) : resubmitting ? (
            'Send it back for review'
          ) : (
            'Send application'
          )}
        </Button>
      </div>
    </form>
  );
}
