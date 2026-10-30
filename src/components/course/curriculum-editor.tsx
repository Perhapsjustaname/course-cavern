'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addLesson,
  addSection,
  deleteLesson,
  deleteSection,
  reorderLessons,
  reorderSections,
  updateSection,
  type FormState,
} from '@/app/actions/courses';
import { useFormAction } from '@/components/form/use-form-action';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { TextField } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Button } from '@/components/button';
import { ArrowDown, ArrowUp, ConfirmDelete, KindIcon, Pencil } from '@/components/course/controls';
import { useSortable } from '@/components/course/use-sortable';
import { LESSON_KINDS } from '@/lib/constants';
import { lessonHasContent, MISSING_CONTENT, type LessonKind } from '@/lib/lessons';
import type { Lesson, Section } from '@/lib/courses';
import { formatMinutes, plural } from '@/lib/format';
import { cn } from '@/lib/cn';

const KIND_LABEL = Object.fromEntries(LESSON_KINDS.map((k) => [k.value, k.label])) as Record<LessonKind, string>;

export function CurriculumEditor({
  courseId,
  sections,
  editable,
}: {
  courseId: string;
  sections: Section[];
  editable: boolean;
}) {
  const persist = useCallback((ids: string[]) => reorderSections(courseId, ids), [courseId]);
  const { order, move, rowProps, handleProps, draggingId } = useSortable(sections, persist);

  const lessons = sections.flatMap((s) => s.lessons);
  const minutes = lessons.reduce((m, l) => m + (l.duration_minutes ?? 0), 0);
  const empty = lessons.filter((l) => !lessonHasContent(l)).length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-label-md text-md-on-surface-variant">
          {[plural(sections.length, 'section'), plural(lessons.length, 'lesson'), formatMinutes(minutes)].filter(Boolean).join('  ·  ')}
        </p>
        {empty ? (
          <p className="text-label-md text-md-on-tertiary-container">
            {plural(empty, 'lesson')} still {empty === 1 ? 'needs' : 'need'} content
          </p>
        ) : null}
      </div>

      {order.length ? (
        <ol className="mt-5 flex flex-col gap-5">
          {order.map((s, i) => (
            <SectionCard
              key={s.id}
              courseId={courseId}
              section={s}
              index={i}
              total={order.length}
              editable={editable}
              dragging={draggingId === s.id}
              rowProps={rowProps(s.id)}
              handleProps={handleProps(s.id)}
              onMove={(d) => move(s.id, d)}
            />
          ))}
        </ol>
      ) : (
        <div className="mt-5 rounded-md3-lg border-2 border-dashed border-md-outline/30 px-6 py-12 text-center">
          <p className="text-title-lg">Start with the chapters</p>
          <p className="mx-auto mt-2 max-w-md text-body-md text-md-on-surface-variant">
            Sections group your lessons. Most courses have between three and eight. Add the first one below,
            then the lessons inside it.
          </p>
        </div>
      )}

      {editable ? <AddSection courseId={courseId} startOpen={order.length === 0} /> : null}
    </div>
  );
}

// --------------------------------------------------------------- section --

type DragRow = ReturnType<ReturnType<typeof useSortable>['rowProps']>;
type DragHandle = ReturnType<ReturnType<typeof useSortable>['handleProps']>;

function Grip(props: DragHandle & { label: string }) {
  const { label, ...handle } = props;
  return (
    <span
      {...handle}
      title={label}
      className="hidden h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md3-xs text-md-on-surface-variant/60 transition-colors duration-200 hover:bg-md-primary/10 hover:text-md-primary active:cursor-grabbing sm:grid"
    >
      <svg viewBox="0 0 12 20" className="h-5 w-3" fill="currentColor">
        {[4, 10, 16].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.4" />, <circle key={`b${y}`} cx="9" cy={y} r="1.4" />])}
      </svg>
    </span>
  );
}

function MoveButtons({ index, total, onMove, what }: { index: number; total: number; onMove: (d: -1 | 1) => void; what: string }) {
  return (
    <>
      <button
        type="button"
        aria-label={`Move ${what} up`}
        title={`Move ${what} up`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3 hover:bg-md-primary/10 hover:text-md-primary active:scale-90 disabled:pointer-events-none disabled:opacity-30"
      >
        <ArrowUp />
      </button>
      <button
        type="button"
        aria-label={`Move ${what} down`}
        title={`Move ${what} down`}
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3 hover:bg-md-primary/10 hover:text-md-primary active:scale-90 disabled:pointer-events-none disabled:opacity-30"
      >
        <ArrowDown />
      </button>
    </>
  );
}

function SectionCard({
  courseId,
  section,
  index,
  total,
  editable,
  dragging,
  rowProps,
  handleProps,
  onMove,
}: {
  courseId: string;
  section: Section;
  index: number;
  total: number;
  editable: boolean;
  dragging: boolean;
  rowProps: DragRow;
  handleProps: DragHandle;
  onMove: (d: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const minutes = section.lessons.reduce((m, l) => m + (l.duration_minutes ?? 0), 0);

  return (
    <li
      {...rowProps}
      className={cn(
        'rounded-md3-lg bg-md-surface-container shadow-sm transition-all duration-300 ease-md3',
        dragging ? 'scale-[0.99] opacity-50 shadow-none' : 'hover:shadow-md',
      )}
    >
      <div className="flex flex-wrap items-start gap-x-2 gap-y-2 p-4 sm:p-5">
        {editable ? <Grip {...handleProps} label="Drag to reorder sections" /> : null}
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-md-primary text-label-md font-bold text-md-on-primary">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="group min-w-[10rem] flex-1 rounded-md3-xs px-1 text-left"
        >
          <span className="flex items-start gap-2">
            <span className="text-title-lg leading-snug break-words group-hover:text-md-primary">{section.title}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className={cn('mt-1.5 h-5 w-5 shrink-0 text-md-on-surface-variant transition-transform duration-300 ease-md3', open ? 'rotate-180' : '')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
            </svg>
          </span>
          <span className="mt-0.5 block text-label-sm text-md-on-surface-variant">
            {[plural(section.lessons.length, 'lesson'), formatMinutes(minutes)].filter(Boolean).join('  ·  ')}
          </span>
        </button>

        {editable && !editing ? (
          <div className="-mr-1 flex w-full shrink-0 items-center justify-end sm:w-auto">
            <MoveButtons index={index} total={total} onMove={onMove} what="section" />
            <button
              type="button"
              aria-label="Edit section"
              title="Edit section"
              onClick={() => {
                setEditing(true);
                setOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3 hover:bg-md-primary/10 hover:text-md-primary active:scale-90"
            >
              <Pencil />
            </button>
            <ConfirmDelete action={deleteSection.bind(null, section.id)} what="section" />
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {editing ? (
            <SectionForm
              mode={{ kind: 'edit', sectionId: section.id }}
              defaults={{ title: section.title, description: section.description }}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : section.description ? (
            <div
              className="rich-text mb-4 rounded-md3-md bg-md-background/60 px-4 py-3 text-label-md text-md-on-surface-variant sm:ml-[4.25rem]"
              dangerouslySetInnerHTML={{ __html: section.description }}
            />
          ) : null}

          <LessonList courseId={courseId} section={section} editable={editable} />
          {editable ? <AddLesson sectionId={section.id} /> : null}
        </div>
      ) : null}
    </li>
  );
}

function SectionForm({
  mode,
  defaults,
  onSaved,
  onCancel,
  cancelLabel = 'Cancel',
}: {
  mode: { kind: 'add'; courseId: string } | { kind: 'edit'; sectionId: string };
  defaults?: { title: string; description: string | null };
  onSaved?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const isAdd = mode.kind === 'add';
  const targetId = mode.kind === 'add' ? mode.courseId : mode.sectionId;
  const action = useMemo(
    () => (isAdd ? addSection.bind(null, targetId) : updateSection.bind(null, targetId)),
    [isAdd, targetId],
  );
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);

  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-md3-lg bg-md-background p-4 sm:p-5">
      <TextField
        label="Section name"
        name="title"
        defaultValue={defaults?.title}
        placeholder="e.g. Safety and the service panel"
        error={state?.errors?.title ?? (state?.ok ? undefined : state?.message)}
        autoFocus
      />
      <RichTextEditor
        name="description"
        label="What this section covers (optional)"
        defaultValue={defaults?.description}
        placeholder="A line or two that sets up the lessons inside."
        maxLength={1000}
        size="sm"
        error={state?.errors?.description}
      />
      <div className="flex gap-2">
        <SubmitButton size="md" pending={pending} pendingLabel="Saving">
          {mode.kind === 'add' ? 'Add section' : 'Save section'}
        </SubmitButton>
        {onCancel ? (
          <Button type="button" variant="text" onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function AddSection({ courseId, startOpen }: { courseId: string; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  // Each added section remounts the form, clearing it for the next.
  const [round, setRound] = useState(0);
  const saved = useCallback(() => setRound((r) => r + 1), []);
  const close = () => {
    setOpen(false);
    setRound(0);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-5 flex w-full items-center justify-center gap-2 rounded-md3-lg border-2 border-dashed border-md-outline/30 py-6 text-label-md font-medium text-md-on-surface-variant transition-all duration-300 ease-md3 hover:border-md-primary/50 hover:bg-md-primary/5 hover:text-md-primary active:scale-[0.99]"
      >
        <span aria-hidden="true" className="text-xl leading-none transition-transform duration-300 ease-md3 group-hover:rotate-90">
          +
        </span>
        Add a section
      </button>
    );
  }
  return (
    <div className="mt-5">
      {/* A course with no sections keeps the form open, so there is nothing to cancel. */}
      <SectionForm
        key={round}
        mode={{ kind: 'add', courseId }}
        onSaved={saved}
        onCancel={startOpen ? undefined : close}
        cancelLabel={round > 0 ? 'Done' : 'Cancel'}
      />
    </div>
  );
}

// ---------------------------------------------------------------- lessons --

function LessonList({ courseId, section, editable }: { courseId: string; section: Section; editable: boolean }) {
  const persist = useCallback((ids: string[]) => reorderLessons(section.id, ids), [section.id]);
  const { order, move, rowProps, handleProps, draggingId } = useSortable(section.lessons, persist);

  if (!order.length) {
    return (
      <p className="rounded-md3-md bg-md-tertiary-container/50 px-4 py-3 text-label-md text-md-on-tertiary-container sm:ml-[4.25rem]">
        No lessons in this section yet. Every section needs at least one before the course can go to review.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2 sm:ml-[4.25rem]">
      {order.map((l, i) => (
        <LessonRow
          key={l.id}
          courseId={courseId}
          lesson={l}
          index={i}
          total={order.length}
          editable={editable}
          dragging={draggingId === l.id}
          rowProps={rowProps(l.id)}
          handleProps={handleProps(l.id)}
          onMove={(d) => move(l.id, d)}
        />
      ))}
    </ol>
  );
}

function LessonRow({
  courseId,
  lesson,
  index,
  total,
  editable,
  dragging,
  rowProps,
  handleProps,
  onMove,
}: {
  courseId: string;
  lesson: Lesson;
  index: number;
  total: number;
  editable: boolean;
  dragging: boolean;
  rowProps: DragRow;
  handleProps: DragHandle;
  onMove: (d: -1 | 1) => void;
}) {
  const ready = lessonHasContent(lesson);
  const href = `/instructor/courses/${courseId}/lessons/${lesson.id}`;
  const meta = [
    KIND_LABEL[lesson.kind],
    lesson.kind === 'quiz' && lesson.question_count ? plural(lesson.question_count, 'question') : null,
    formatMinutes(lesson.duration_minutes ?? 0),
    lesson.is_preview ? 'Free preview' : null,
  ].filter(Boolean);

  return (
    <li
      {...rowProps}
      className={cn(
        'group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md3-md bg-md-background/70 px-3 py-2.5 transition-all duration-200 hover:bg-md-background',
        dragging && 'opacity-40',
      )}
    >
      {editable ? <Grip {...handleProps} label="Drag to reorder lessons" /> : null}
      <span className="w-5 shrink-0 text-right text-label-sm text-md-on-surface-variant tabular-nums">{index + 1}</span>
      <KindIcon kind={lesson.kind} />
      <Link href={href} className="min-w-[8rem] flex-1 rounded-md3-xs">
        <span
          className="line-clamp-2 text-body-md break-words text-md-on-surface group-hover:text-md-primary sm:line-clamp-none sm:truncate"
          title={lesson.title}
        >
          {lesson.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-label-sm text-md-on-surface-variant">{meta.join('  ·  ')}</span>
          {!ready ? (
            <span className="rounded-full bg-md-tertiary-container px-2 py-0.5 text-label-sm font-medium text-md-on-tertiary-container">
              {MISSING_CONTENT[lesson.kind]}
            </span>
          ) : null}
        </span>
      </Link>
      {editable ? (
        <div className="-mr-1 flex w-full shrink-0 items-center justify-end transition-opacity duration-200 sm:w-auto sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:has-[[data-armed]]:opacity-100">
          <MoveButtons index={index} total={total} onMove={onMove} what="lesson" />
          <Link
            href={href}
            aria-label={`Edit ${lesson.title}`}
            title="Edit lesson"
            className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 ease-md3 hover:bg-md-primary/10 hover:text-md-primary active:scale-90"
          >
            <Pencil />
          </Link>
          <ConfirmDelete action={deleteLesson.bind(null, lesson.id)} what="lesson" />
        </div>
      ) : null}
    </li>
  );
}

function AddLesson({ sectionId }: { sectionId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LessonKind>('video');
  const [round, setRound] = useState(0);
  const action = useMemo(() => addLesson.bind(null, sectionId), [sectionId]);
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);

  // Clear the title for the next one; keep the kind, since lessons often come in runs.
  useEffect(() => {
    if (state?.ok) setRound((r) => r + 1);
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-md font-medium text-md-primary transition-all duration-200 ease-md3 hover:bg-md-primary/10 active:scale-95 sm:ml-[4.25rem]"
      >
        <span aria-hidden="true" className="text-base leading-none">+</span>
        Add a lesson
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-4 rounded-md3-md bg-md-background p-4 sm:ml-[4.25rem]">
      <fieldset>
        <legend className="text-label-md font-medium text-md-on-surface-variant">What kind of lesson</legend>
        <div role="radiogroup" className="mt-2 flex flex-wrap gap-2">
          {LESSON_KINDS.map((k) => (
            <label
              key={k.value}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-label-md font-medium transition-all duration-200 ease-md3 active:scale-95',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-md-primary',
                kind === k.value
                  ? 'border-transparent bg-md-secondary-container text-md-on-secondary-container'
                  : 'border-md-outline/40 text-md-on-surface-variant hover:bg-md-primary/5',
              )}
            >
              <input
                type="radio"
                name="kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
                className="sr-only"
              />
              <KindIcon kind={k.value} />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField
        key={round}
        label="Lesson title"
        name="title"
        placeholder="e.g. Testing for voltage without getting hurt"
        error={state?.errors?.title ?? (state?.ok ? undefined : state?.message)}
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton size="sm" pending={pending} pendingLabel="Adding">
          Add lesson
        </SubmitButton>
        <Button type="button" variant="text" size="sm" onClick={() => setOpen(false)}>
          Done
        </Button>
        {state?.ok ? <span role="status" className="text-label-sm text-md-primary">Added. Open it to add the content.</span> : null}
      </div>
    </form>
  );
}
