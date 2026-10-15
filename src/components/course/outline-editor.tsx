'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import {
  addLesson,
  addSection,
  deleteLesson,
  deleteSection,
  moveLesson,
  moveSection,
  renameSection,
  updateLesson,
  type FormState,
} from '@/app/actions/courses';
import { SelectField, TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Button } from '@/components/button';
import { ArrowDown, ArrowUp, ConfirmDelete, IconSubmit, KindIcon, Pencil } from '@/components/course/controls';
import { LESSON_KINDS } from '@/lib/constants';
import type { Lesson, Section } from '@/lib/courses';
import { formatMinutes, plural } from '@/lib/format';

const KIND_LABEL = Object.fromEntries(LESSON_KINDS.map((k) => [k.value, k.label]));

export function OutlineEditor({
  courseId,
  sections,
  editable,
}: {
  courseId: string;
  sections: Section[];
  editable: boolean;
}) {
  const lessons = sections.reduce((n, s) => n + s.lessons.length, 0);
  const minutes = sections.reduce((n, s) => n + s.lessons.reduce((m, l) => m + (l.duration_minutes ?? 0), 0), 0);
  const summary = [plural(sections.length, 'section'), plural(lessons, 'lesson'), formatMinutes(minutes)]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div>
      <p className="text-label-md text-md-on-surface-variant">{summary}</p>

      {sections.length ? (
        <ol className="mt-5 flex flex-col gap-5">
          {sections.map((s, i) => (
            <SectionCard key={s.id} section={s} index={i} total={sections.length} editable={editable} />
          ))}
        </ol>
      ) : (
        <div className="mt-5 rounded-md3-lg border-2 border-dashed border-md-outline/30 px-6 py-10 text-center">
          <p className="text-body-md font-medium">No sections yet</p>
          <p className="mx-auto mt-1 max-w-sm text-label-md text-md-on-surface-variant">
            Sections are the chapters of the course. Most courses have between three and eight.
          </p>
        </div>
      )}

      {editable ? <AddSection courseId={courseId} first={sections.length === 0} /> : null}
    </div>
  );
}

function AddSection({ courseId, first }: { courseId: string; first: boolean }) {
  const action = useMemo(() => addSection.bind(null, courseId), [courseId]);
  const [state, dispatch] = useActionState<FormState, FormData>(action, undefined);
  const [open, setOpen] = useState(first);

  if (!open) {
    return (
      <Button variant="tonal" className="mt-5" onClick={() => setOpen(true)}>
        <span aria-hidden="true" className="text-lg leading-none">+</span>
        Add a section
      </Button>
    );
  }
  return (
    <form action={dispatch} noValidate className="mt-5 flex flex-col gap-3 rounded-md3-lg bg-md-surface-container p-5 sm:flex-row sm:items-start">
      <TextField
        label="Section name"
        name="title"
        placeholder="e.g. Safety and the service panel"
        defaultValue={state?.ok ? '' : state?.values?.title}
        error={state?.errors?.title ?? (state?.ok ? undefined : state?.message)}
        className="flex-1"
        autoFocus={!first}
      />
      <div className="flex gap-2 sm:pt-1.5">
        <SubmitButton size="md" pendingLabel="Adding">
          Add section
        </SubmitButton>
        {!first ? (
          <Button type="button" variant="text" onClick={() => setOpen(false)}>
            Done
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function SectionCard({
  section,
  index,
  total,
  editable,
}: {
  section: Section;
  index: number;
  total: number;
  editable: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const rename = useMemo(() => renameSection.bind(null, section.id), [section.id]);
  const [state, dispatch] = useActionState<FormState, FormData>(rename, undefined);

  useEffect(() => {
    if (state?.ok) setRenaming(false);
  }, [state]);

  return (
    <li className="rounded-md3-lg bg-md-surface-container p-4 shadow-sm transition-shadow duration-300 ease-md3 hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-md-primary text-label-md font-bold text-md-on-primary">
          {index + 1}
        </span>

        {renaming ? (
          <form action={dispatch} noValidate className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start">
            <TextField
              label="Section name"
              name="title"
              defaultValue={state?.values?.title ?? section.title}
              error={state?.errors?.title ?? state?.message}
              className="flex-1"
              autoFocus
            />
            <div className="flex gap-2 sm:pt-1.5">
              <SubmitButton size="md" pendingLabel="Saving">Save</SubmitButton>
              <Button type="button" variant="text" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="min-w-[10rem] flex-1 pt-1.5">
            <h3 className="text-title-lg leading-snug break-words">{section.title}</h3>
            <p className="text-label-sm text-md-on-surface-variant">{plural(section.lessons.length, 'lesson')}</p>
          </div>
        )}

        {editable && !renaming ? (
          <div className="-mr-1 flex w-full shrink-0 items-center justify-end sm:w-auto">
            <form action={moveSection.bind(null, section.id, 'up')}>
              <IconSubmit label="Move section up" disabled={index === 0}>
                <ArrowUp />
              </IconSubmit>
            </form>
            <form action={moveSection.bind(null, section.id, 'down')}>
              <IconSubmit label="Move section down" disabled={index === total - 1}>
                <ArrowDown />
              </IconSubmit>
            </form>
            <button
              type="button"
              aria-label="Rename section"
              title="Rename section"
              onClick={() => setRenaming(true)}
              className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3 hover:bg-md-primary/10 hover:text-md-primary active:scale-90"
            >
              <Pencil />
            </button>
            <ConfirmDelete action={deleteSection.bind(null, section.id)} what="section" />
          </div>
        ) : null}
      </div>

      {section.lessons.length ? (
        <ol className="mt-4 flex flex-col gap-2 sm:pl-12">
          {section.lessons.map((l, i) => (
            <LessonItem key={l.id} lesson={l} index={i} total={section.lessons.length} editable={editable} />
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-md3-md bg-md-tertiary-container/50 px-4 py-3 text-label-md text-md-on-tertiary-container sm:ml-12">
          This section has no lessons yet. Every section needs at least one before the course can go to review.
        </p>
      )}

      {editable ? <AddLesson sectionId={section.id} /> : null}
    </li>
  );
}

function LessonItem({
  lesson,
  index,
  total,
  editable,
}: {
  lesson: Lesson;
  index: number;
  total: number;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const update = useMemo(() => updateLesson.bind(null, lesson.id), [lesson.id]);
  const [state, dispatch] = useActionState<FormState, FormData>(update, undefined);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <li className="rounded-md3-md bg-md-background p-4 ring-1 ring-md-primary/30">
        <LessonFields
          action={dispatch}
          state={state}
          defaults={{
            title: lesson.title,
            kind: lesson.kind,
            durationMinutes: lesson.duration_minutes?.toString() ?? '',
          }}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md3-md bg-md-background/70 px-3 py-2.5 transition-colors duration-200 hover:bg-md-background">
      <span className="w-5 shrink-0 text-right text-label-sm text-md-on-surface-variant tabular-nums">{index + 1}</span>
      <KindIcon kind={lesson.kind} />
      <div className="min-w-[8rem] flex-1">
        <p className="line-clamp-2 text-body-md break-words text-md-on-surface sm:line-clamp-none sm:truncate" title={lesson.title}>{lesson.title}</p>
        <p className="text-label-sm text-md-on-surface-variant">
          {KIND_LABEL[lesson.kind]}
          {lesson.duration_minutes ? `  ·  ${formatMinutes(lesson.duration_minutes)}` : ''}
        </p>
      </div>
      {editable ? (
        // On phones the controls take their own line, so the title keeps the
        // full width; four 36px buttons beside it would leave room for two letters.
        // Always visible on touch screens; revealed on hover where there is a pointer.
        <div className="-mr-1 flex w-full shrink-0 items-center justify-end transition-opacity duration-200 sm:w-auto sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:has-[[data-armed]]:opacity-100">
          <form action={moveLesson.bind(null, lesson.id, 'up')}>
            <IconSubmit label="Move lesson up" disabled={index === 0}>
              <ArrowUp />
            </IconSubmit>
          </form>
          <form action={moveLesson.bind(null, lesson.id, 'down')}>
            <IconSubmit label="Move lesson down" disabled={index === total - 1}>
              <ArrowDown />
            </IconSubmit>
          </form>
          <button
            type="button"
            aria-label={`Edit lesson ${lesson.title}`}
            title="Edit lesson"
            onClick={() => setEditing(true)}
            className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3 hover:bg-md-primary/10 hover:text-md-primary active:scale-90"
          >
            <Pencil />
          </button>
          <ConfirmDelete action={deleteLesson.bind(null, lesson.id)} what="lesson" />
        </div>
      ) : null}
    </li>
  );
}

function AddLesson({ sectionId }: { sectionId: string }) {
  const action = useMemo(() => addLesson.bind(null, sectionId), [sectionId]);
  const [state, dispatch] = useActionState<FormState, FormData>(action, undefined);
  const [open, setOpen] = useState(false);
  // Each successful add remounts the fields: title cleared and focused, ready
  // for the next one. Every action result is a new object, so this fires once
  // per add even when two adds look identical.
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (state?.ok) setRound((r) => r + 1);
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-md font-medium text-md-primary transition-all duration-200 ease-md3 hover:bg-md-primary/10 active:scale-95 sm:ml-12"
      >
        <span aria-hidden="true" className="text-base leading-none">+</span>
        Add a lesson
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-md3-md bg-md-background p-4 sm:ml-12">
      <LessonFields
        key={round}
        action={dispatch}
        state={state}
        // Keep the type between adds, so a run of videos does not mean
        // re-picking "Video" every time.
        defaults={{
          title: state?.ok ? '' : (state?.values?.title ?? ''),
          kind: state?.values?.kind ?? 'video',
          durationMinutes: state?.ok ? '' : (state?.values?.durationMinutes ?? ''),
        }}
        submitLabel="Add lesson"
        onCancel={() => setOpen(false)}
        cancelLabel="Done"
        autoFocus
      />
    </div>
  );
}

function LessonFields({
  action,
  state,
  defaults,
  submitLabel,
  onCancel,
  cancelLabel = 'Cancel',
  autoFocus,
}: {
  action: (form: FormData) => void;
  state: FormState;
  defaults: { title: string; kind: string; durationMinutes: string };
  submitLabel: string;
  onCancel: () => void;
  cancelLabel?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_8rem]">
        <TextField
          label="Lesson title"
          name="title"
          defaultValue={defaults.title}
          error={state?.errors?.title}
          autoFocus={autoFocus}
        />
        <SelectField label="Type" name="kind" options={LESSON_KINDS} defaultValue={defaults.kind} error={state?.errors?.kind} />
        <TextField
          label="Minutes"
          name="durationMinutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          defaultValue={defaults.durationMinutes}
          error={state?.errors?.durationMinutes}
        />
      </div>
      {state?.message && !state.ok ? <p className="px-1 text-label-sm text-md-error">{state.message}</p> : null}
      <div className="flex gap-2">
        <SubmitButton size="sm" pendingLabel="Saving">{submitLabel}</SubmitButton>
        <Button type="button" variant="text" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}
