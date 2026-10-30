'use client';

import { useMemo } from 'react';
import { saveReading, updateLesson, type FormState } from '@/app/actions/courses';
import { useFormAction } from '@/components/form/use-form-action';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { SelectField, TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Switch } from '@/components/form/switch';
import { Notice } from '@/components/notice';
import { isMediaKind } from '@/lib/media';
import type { LessonKind } from '@/lib/lessons';

function Saved({ state }: { state: FormState }) {
  return state?.ok ? (
    <span role="status" className="text-label-md font-medium text-md-primary">
      {state.message ?? 'Saved.'}
    </span>
  ) : null;
}

export function LessonDetailsForm({
  lesson,
  sections,
  editable,
}: {
  lesson: {
    id: string;
    kind: LessonKind;
    title: string;
    description: string | null;
    section_id: string;
    duration_minutes: number | null;
    pass_percent: number | null;
    is_preview: boolean;
  };
  sections: { id: string; title: string }[];
  editable: boolean;
}) {
  const action = useMemo(() => updateLesson.bind(null, lesson.id), [lesson.id]);
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);
  const disabled = !editable;
  const media = isMediaKind(lesson.kind);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {state?.message && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}
      <TextField label="Lesson title" name="title" defaultValue={lesson.title} error={state?.errors?.title} disabled={disabled} />
      <RichTextEditor
        name="description"
        label="Summary (optional)"
        defaultValue={lesson.description}
        placeholder="A line or two shown in the course outline, before someone opens the lesson."
        maxLength={2000}
        size="sm"
        error={state?.errors?.description}
        disabled={disabled}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Section"
          name="sectionId"
          options={sections.map((s, i) => ({ value: s.id, label: `${i + 1}. ${s.title}` }))}
          defaultValue={lesson.section_id}
          hint="Pick another to move the lesson there."
          error={state?.errors?.sectionId}
          disabled={disabled}
        />
        <TextField
          label="Length in minutes"
          name="durationMinutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          defaultValue={lesson.duration_minutes ?? ''}
          hint={media && lesson.kind !== 'pdf' ? 'Filled in from the file when you upload it.' : 'Roughly how long it takes to get through.'}
          error={state?.errors?.durationMinutes}
          disabled={disabled}
        />
        {lesson.kind === 'quiz' ? (
          <TextField
            label="Pass mark (%)"
            name="passPercent"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            defaultValue={lesson.pass_percent ?? 80}
            hint="The score a student needs to pass this quiz."
            error={state?.errors?.passPercent}
            disabled={disabled}
          />
        ) : null}
      </div>
      <div className="rounded-md3-md bg-md-surface-container-low/60 p-4">
        <Switch
          name="isPreview"
          label="Free preview"
          description="Anyone can open this lesson before buying. Good for a first lesson that shows how you teach."
          defaultChecked={lesson.is_preview}
          disabled={disabled}
        />
      </div>
      {editable ? (
        <div className="flex items-center gap-4">
          <SubmitButton size="lg" pending={pending} pendingLabel="Saving">
            Save lesson
          </SubmitButton>
          <Saved state={state} />
        </div>
      ) : null}
    </form>
  );
}

export function ReadingForm({ lessonId, body, editable }: { lessonId: string; body: string | null; editable: boolean }) {
  const action = useMemo(() => saveReading.bind(null, lessonId), [lessonId]);
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <RichTextEditor
        name="body"
        label="Reading"
        defaultValue={body}
        placeholder="Write the lesson. Use headings to break it up and lists for steps."
        maxLength={50_000}
        toolbar="full"
        size="lg"
        error={state?.errors?.body}
        disabled={!editable}
      />
      {editable ? (
        <div className="flex items-center gap-4">
          <SubmitButton size="lg" pending={pending} pendingLabel="Saving">
            Save reading
          </SubmitButton>
          <Saved state={state} />
        </div>
      ) : null}
    </form>
  );
}
