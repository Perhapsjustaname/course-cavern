'use client';

import { useMemo } from 'react';
import { createCourse, updateCourseDetails, updateCoursePrice, type FormState } from '@/app/actions/courses';
import { useFormAction } from '@/components/form/use-form-action';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { SelectField, TextAreaField, TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Notice } from '@/components/notice';
import { INDUSTRIES, LEVELS } from '@/lib/constants';

function Saved({ state }: { state: FormState }) {
  return state?.ok ? (
    <span role="status" className="text-label-md font-medium text-md-primary">
      {state.message ?? 'Saved.'}
    </span>
  ) : null;
}

export function NewCourseForm() {
  const { state, pending, onSubmit } = useFormAction<FormState>(createCourse, undefined);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {state?.message ? <Notice tone="error">{state.message}</Notice> : null}
      <TextField label="Course title" name="title" placeholder="e.g. Residential wiring, from panel to outlet" error={state?.errors?.title} />
      <TextAreaField
        label="Summary"
        name="summary"
        rows={3}
        hint="One or two sentences. This is what shows in the catalogue."
        error={state?.errors?.summary}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField label="Industry" name="industry" options={INDUSTRIES} defaultValue="" placeholder="Choose one" error={state?.errors?.industry} />
        <SelectField label="Level" name="level" options={LEVELS} defaultValue="" placeholder="Choose one" error={state?.errors?.level} />
        <TextField
          label="Price (CAD)"
          name="price"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0 for free"
          error={state?.errors?.price}
        />
      </div>
      <div>
        <SubmitButton size="lg" pending={pending} pendingLabel="Creating">
          Create course
        </SubmitButton>
      </div>
    </form>
  );
}

export function DetailsForm({
  courseId,
  editable,
  defaults,
}: {
  courseId: string;
  editable: boolean;
  defaults: { title: string; summary: string; description: string | null; industry: string; level: string };
}) {
  const action = useMemo(() => updateCourseDetails.bind(null, courseId), [courseId]);
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);
  const disabled = !editable;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {state?.message && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}
      <TextField label="Course title" name="title" defaultValue={defaults.title} error={state?.errors?.title} disabled={disabled} />
      <TextAreaField
        label="Summary"
        name="summary"
        rows={3}
        defaultValue={defaults.summary}
        hint="One or two sentences. This is what shows in the catalogue."
        error={state?.errors?.summary}
        disabled={disabled}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Industry"
          name="industry"
          options={INDUSTRIES}
          defaultValue={defaults.industry}
          placeholder="Choose one"
          error={state?.errors?.industry}
          disabled={disabled}
        />
        <SelectField
          label="Level"
          name="level"
          options={LEVELS}
          defaultValue={defaults.level}
          placeholder="Choose one"
          error={state?.errors?.level}
          disabled={disabled}
        />
      </div>
      <RichTextEditor
        name="description"
        label="Full description"
        defaultValue={defaults.description}
        placeholder="Who it is for, what they need to know first, and what they will be able to do after."
        maxLength={5000}
        toolbar="full"
        size="lg"
        error={state?.errors?.description}
        disabled={disabled}
      />
      {editable ? (
        <div className="flex items-center gap-4">
          <SubmitButton size="lg" pending={pending} pendingLabel="Saving">
            Save details
          </SubmitButton>
          <Saved state={state} />
        </div>
      ) : null}
    </form>
  );
}

export function PriceForm({ courseId, editable, price }: { courseId: string; editable: boolean; price: string }) {
  const action = useMemo(() => updateCoursePrice.bind(null, courseId), [courseId]);
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {state?.message && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}
      <TextField
        label="Price in Canadian dollars"
        name="price"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        defaultValue={price}
        hint="Enter 0 to make it free."
        error={state?.errors?.price}
        disabled={!editable}
        className="max-w-xs"
      />
      {editable ? (
        <div className="flex items-center gap-4">
          <SubmitButton size="lg" pending={pending} pendingLabel="Saving">
            Save price
          </SubmitButton>
          <Saved state={state} />
        </div>
      ) : null}
    </form>
  );
}
