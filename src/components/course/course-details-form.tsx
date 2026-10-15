'use client';

import { useActionState, useMemo } from 'react';
import { createCourse, updateCourse, type FormState } from '@/app/actions/courses';
import { SelectField, TextAreaField, TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Notice } from '@/components/notice';
import { INDUSTRIES, LEVELS } from '@/lib/constants';

export type CourseDefaults = {
  title: string;
  summary: string;
  description: string;
  industry: string;
  level: string;
  price: string;
};

export function CourseDetailsForm({
  courseId,
  defaults,
  editable = true,
}: {
  /** Omit to create a new course. */
  courseId?: string;
  defaults: CourseDefaults;
  editable?: boolean;
}) {
  const action = useMemo(() => (courseId ? updateCourse.bind(null, courseId) : createCourse), [courseId]);
  const [state, dispatch] = useActionState<FormState, FormData>(action, undefined);

  // After an error, show what was typed. After a save, the page re-renders with
  // the stored values, so fall back to those.
  const v = (k: keyof CourseDefaults) => (state?.ok ? defaults[k] : (state?.values?.[k] ?? defaults[k]));
  const disabled = !editable;

  return (
    <form action={dispatch} noValidate className="flex flex-col gap-5">
      {state?.message && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}

      <TextField
        label="Course title"
        name="title"
        defaultValue={v('title')}
        placeholder="e.g. Residential wiring, from panel to outlet"
        error={state?.errors?.title}
        disabled={disabled}
      />
      <TextAreaField
        label="Summary"
        name="summary"
        rows={3}
        defaultValue={v('summary')}
        hint="One or two sentences. This is what shows in the catalogue."
        error={state?.errors?.summary}
        disabled={disabled}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          label="Industry"
          name="industry"
          options={INDUSTRIES}
          defaultValue={v('industry')}
          placeholder="Choose one"
          error={state?.errors?.industry}
          disabled={disabled}
        />
        <SelectField
          label="Level"
          name="level"
          options={LEVELS}
          defaultValue={v('level')}
          placeholder="Choose one"
          error={state?.errors?.level}
          disabled={disabled}
        />
        <TextField
          label="Price (CAD)"
          name="price"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          defaultValue={v('price')}
          placeholder="0 for free"
          error={state?.errors?.price}
          disabled={disabled}
        />
      </div>
      <TextAreaField
        label="Full description (optional)"
        name="description"
        rows={6}
        defaultValue={v('description')}
        hint="Who it is for, what they need to know first, and what they will be able to do after."
        error={state?.errors?.description}
        disabled={disabled}
      />

      {editable ? (
        <div className="flex items-center gap-4">
          <SubmitButton pendingLabel="Saving" size="lg">
            {courseId ? 'Save details' : 'Create course'}
          </SubmitButton>
          {state?.ok ? (
            <span role="status" className="text-label-md font-medium text-md-primary">
              {state.message ?? 'Saved.'}
            </span>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
