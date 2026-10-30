'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteQuestion, reorderQuestions, saveQuestion, type FormState } from '@/app/actions/courses';
import { useFormAction } from '@/components/form/use-form-action';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { SubmitButton } from '@/components/form/submit-button';
import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { ArrowDown, ArrowUp, ConfirmDelete, Pencil } from '@/components/course/controls';
import { useSortable } from '@/components/course/use-sortable';
import { MAX_OPTIONS, MIN_OPTIONS } from '@/lib/validation';
import type { QuizQuestion } from '@/lib/courses';
import { cn } from '@/lib/cn';

export function QuizBuilder({ lessonId, questions, editable }: { lessonId: string; questions: QuizQuestion[]; editable: boolean }) {
  const persist = useCallback((ids: string[]) => reorderQuestions(lessonId, ids), [lessonId]);
  const { order, move, rowProps, handleProps, draggingId } = useSortable(questions, persist);
  const [editing, setEditing] = useState<string | 'new' | null>(questions.length === 0 && editable ? 'new' : null);
  const close = useCallback(() => setEditing(null), []);

  return (
    <div>
      {order.length ? (
        <ol className="flex flex-col gap-3">
          {order.map((q, i) =>
            editing === q.id ? (
              <li key={q.id}>
                <QuestionForm lessonId={lessonId} question={q} number={i + 1} onDone={close} />
              </li>
            ) : (
              <li
                key={q.id}
                {...rowProps(q.id)}
                className={cn(
                  'group rounded-md3-md bg-md-surface-container-low/60 p-4 transition-all duration-200',
                  draggingId === q.id && 'opacity-40',
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  {editable ? (
                    <span
                      {...handleProps(q.id)}
                      title="Drag to reorder questions"
                      className="hidden h-8 w-6 shrink-0 cursor-grab place-items-center rounded-md3-xs text-md-on-surface-variant/60 hover:bg-md-primary/10 hover:text-md-primary active:cursor-grabbing sm:grid"
                    >
                      <svg viewBox="0 0 12 20" className="h-5 w-3" fill="currentColor">
                        {[4, 10, 16].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.4" />, <circle key={`b${y}`} cx="9" cy={y} r="1.4" />])}
                      </svg>
                    </span>
                  ) : null}
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-md-secondary-container text-label-sm font-bold text-md-on-secondary-container">
                    {i + 1}
                  </span>
                  <div className="min-w-[10rem] flex-1">
                    <div className="rich-text text-body-md" dangerouslySetInnerHTML={{ __html: q.prompt }} />
                    <ul className="mt-3 space-y-1.5">
                      {q.options.map((o) => (
                        <li key={o.id} className={cn('rounded-md3-sm px-3 py-2', o.is_correct && 'bg-md-primary-container/70')}>
                          <p className="flex items-start gap-2 text-label-md">
                            <span aria-hidden="true" className={o.is_correct ? 'text-md-primary' : 'text-md-outline'}>
                              {o.is_correct ? '●' : '○'}
                            </span>
                            <span className="min-w-0 break-words">
                              {o.text}
                              {o.is_correct ? <span className="sr-only"> (correct answer)</span> : null}
                            </span>
                          </p>
                          {o.explanation ? <p className="mt-0.5 ml-5 text-label-sm text-md-on-surface-variant">{o.explanation}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {editable ? (
                    <div className="-mr-1 flex w-full shrink-0 items-center justify-end transition-opacity duration-200 sm:w-auto sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:has-[[data-armed]]:opacity-100">
                      <button
                        type="button"
                        aria-label="Move question up"
                        title="Move question up"
                        disabled={i === 0}
                        onClick={() => move(q.id, -1)}
                        className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 hover:bg-md-primary/10 hover:text-md-primary active:scale-90 disabled:opacity-30"
                      >
                        <ArrowUp />
                      </button>
                      <button
                        type="button"
                        aria-label="Move question down"
                        title="Move question down"
                        disabled={i === order.length - 1}
                        onClick={() => move(q.id, 1)}
                        className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 hover:bg-md-primary/10 hover:text-md-primary active:scale-90 disabled:opacity-30"
                      >
                        <ArrowDown />
                      </button>
                      <button
                        type="button"
                        aria-label="Edit question"
                        title="Edit question"
                        onClick={() => setEditing(q.id)}
                        className="grid h-9 w-9 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 hover:bg-md-primary/10 hover:text-md-primary active:scale-90"
                      >
                        <Pencil />
                      </button>
                      <ConfirmDelete action={deleteQuestion.bind(null, lessonId, q.id)} what="question" />
                    </div>
                  ) : null}
                </div>
              </li>
            ),
          )}
        </ol>
      ) : !editable ? (
        <p className="rounded-md3-md bg-md-surface-container-low px-4 py-6 text-center text-body-md text-md-on-surface-variant">
          No questions.
        </p>
      ) : null}

      {editable ? (
        editing === 'new' ? (
          <div className={order.length ? 'mt-4' : ''}>
            <QuestionForm lessonId={lessonId} number={order.length + 1} onDone={close} canCancel={order.length > 0} />
          </div>
        ) : (
          <Button type="button" variant="tonal" className="mt-4" onClick={() => setEditing('new')} disabled={editing !== null}>
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add a question
          </Button>
        )
      ) : null}
    </div>
  );
}

type Row = { id: number; text: string; explanation: string };

function QuestionForm({
  lessonId,
  question,
  number,
  onDone,
  canCancel = true,
}: {
  lessonId: string;
  question?: QuizQuestion;
  number: number;
  onDone: () => void;
  canCancel?: boolean;
}) {
  const action = useMemo(() => saveQuestion.bind(null, lessonId, question?.id ?? null), [lessonId, question?.id]);
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);

  // Rows keep an id for their lifetime, so removing the second answer cannot
  // move an error message or the "correct" mark onto a different one. Ids are
  // made in one initialiser rather than from a counter, because React runs
  // initialisers twice in development and a counter would drift.
  const [initial] = useState(() => {
    const opts = question?.options ?? [];
    const source = opts.length ? opts.map((o) => ({ text: o.text, explanation: o.explanation ?? '' })) : [0, 1, 2, 3].map(() => ({ text: '', explanation: '' }));
    const rows: Row[] = source.map((r, i) => ({ id: i, ...r }));
    const correctAt = Math.max(0, opts.findIndex((o) => o.is_correct));
    return { rows, correctId: rows[correctAt]?.id ?? 0 };
  });
  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [correctId, setCorrectId] = useState<number>(initial.correctId);
  const nextId = useRef(initial.rows.length);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const err = (k: string) => state?.errors?.[k]?.[0];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-md3-lg bg-md-background p-5 ring-1 ring-md-primary/25">
      <p className="text-title-lg">{question ? `Edit question ${number}` : `Question ${number}`}</p>
      {state?.message && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}

      <RichTextEditor
        name="prompt"
        label="Question"
        defaultValue={question?.prompt}
        placeholder="e.g. What should you do before touching a conductor?"
        maxLength={1000}
        size="sm"
        error={state?.errors?.prompt}
      />

      <fieldset>
        <legend className="text-label-md font-medium text-md-on-surface-variant">
          Answers. Pick the right one, and say why each is right or wrong if it helps.
        </legend>
        <div role="radiogroup" className="mt-3 flex flex-col gap-3">
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={cn(
                'rounded-md3-md p-3 transition-colors duration-200',
                correctId === r.id ? 'bg-md-primary-container/60 ring-1 ring-md-primary/40' : 'bg-md-surface-container-low/60',
              )}
            >
              <div className="flex items-start gap-3">
                <label className="mt-3 flex shrink-0 cursor-pointer items-center" title="This is the right answer">
                  <input
                    type="radio"
                    name="correct"
                    value={r.id}
                    checked={correctId === r.id}
                    onChange={() => setCorrectId(r.id)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="grid h-6 w-6 place-items-center rounded-full border-2 border-md-outline transition-colors duration-200 peer-checked:border-md-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-md-primary"
                  >
                    <span className={cn('h-3 w-3 rounded-full bg-md-primary transition-transform duration-200 ease-md3', correctId === r.id ? 'scale-100' : 'scale-0')} />
                  </span>
                  <span className="sr-only">Answer {i + 1} is correct</span>
                </label>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    name={`option.${r.id}.text`}
                    defaultValue={r.text}
                    aria-label={`Answer ${i + 1}`}
                    aria-invalid={err(`option.${r.id}.text`) ? true : undefined}
                    placeholder={`Answer ${i + 1}`}
                    className={cn(
                      'w-full rounded-t-md3-xs border-b-2 bg-md-background/70 px-3 py-2.5 text-body-md outline-none transition-colors duration-200',
                      err(`option.${r.id}.text`) ? 'border-md-error' : 'border-md-outline/50 focus:border-md-primary',
                    )}
                  />
                  {err(`option.${r.id}.text`) ? <p className="px-1 text-label-sm text-md-error">{err(`option.${r.id}.text`)}</p> : null}
                  <input
                    name={`option.${r.id}.explanation`}
                    defaultValue={r.explanation}
                    aria-label={`Why answer ${i + 1} is right or wrong`}
                    placeholder="Why it is right or wrong (optional)"
                    className="w-full rounded-md3-xs bg-transparent px-3 py-1.5 text-label-md text-md-on-surface-variant outline-none placeholder:text-md-on-surface-variant/50 focus:bg-md-background/60"
                  />
                  {err(`option.${r.id}.explanation`) ? (
                    <p className="px-1 text-label-sm text-md-error">{err(`option.${r.id}.explanation`)}</p>
                  ) : null}
                </div>
                {rows.length > MIN_OPTIONS ? (
                  <button
                    type="button"
                    aria-label={`Remove answer ${i + 1}`}
                    title="Remove this answer"
                    onClick={() => {
                      const remaining = rows.filter((x) => x.id !== r.id);
                      setRows(remaining);
                      if (correctId === r.id) setCorrectId(remaining[0]!.id);
                    }}
                    className="mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-md-on-surface-variant transition-all duration-200 hover:bg-md-error/10 hover:text-md-error active:scale-90"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">×</span>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {state?.errors?.options ? <p className="mt-2 px-1 text-label-sm text-md-error">{state.errors.options[0]}</p> : null}
        {state?.errors?.correct ? <p className="mt-2 px-1 text-label-sm text-md-error">{state.errors.correct[0]}</p> : null}
        {rows.length < MAX_OPTIONS ? (
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { id: nextId.current++, text: '', explanation: '' }])}
            className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-md font-medium text-md-primary transition-all duration-200 hover:bg-md-primary/10 active:scale-95"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Add an answer
          </button>
        ) : null}
      </fieldset>

      <div className="flex gap-2">
        <SubmitButton size="md" pending={pending} pendingLabel="Saving">
          {question ? 'Save question' : 'Add question'}
        </SubmitButton>
        {canCancel ? (
          <Button type="button" variant="text" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
