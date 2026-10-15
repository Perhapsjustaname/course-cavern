'use client';

import { startTransition, useActionState, useMemo, useState, type FormEvent } from 'react';
import { decideApplication, decideCourse, type DecisionState } from '@/app/actions/admin';
import { TextAreaField } from '@/components/form/field';
import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { cn } from '@/lib/cn';

type Option = { value: string; label: string; button: string; noteHint: string; tone: 'primary' | 'tertiary' | 'error' };

const APPLICATION: Option[] = [
  { value: 'approved', label: 'Approve', button: 'Approve applicant', noteHint: 'Optional. Visible to the applicant.', tone: 'primary' },
  { value: 'more_info', label: 'Ask for more', button: 'Send the request', noteHint: 'Say exactly what is missing. They see this note.', tone: 'tertiary' },
  { value: 'rejected', label: 'Turn down', button: 'Turn down', noteHint: 'Explain why. They see this note.', tone: 'error' },
];

const COURSE: Option[] = [
  { value: 'approved', label: 'Approve and publish', button: 'Publish course', noteHint: 'Optional. Visible to the instructor.', tone: 'primary' },
  { value: 'changes_requested', label: 'Request changes', button: 'Send it back', noteHint: 'List what needs to change. They see this note.', tone: 'tertiary' },
];

const SELECTED: Record<Option['tone'], string> = {
  primary: 'bg-md-primary text-md-on-primary shadow-md',
  tertiary: 'bg-md-tertiary text-md-on-tertiary shadow-md',
  error: 'bg-md-error text-md-on-error shadow-md',
};

export function DecisionForm({ kind, id }: { kind: 'application' | 'course'; id: string }) {
  const options = kind === 'application' ? APPLICATION : COURSE;
  const action = useMemo(
    () => (kind === 'application' ? decideApplication.bind(null, id) : decideCourse.bind(null, id)),
    [kind, id],
  );
  const [state, dispatch, pending] = useActionState<DecisionState, FormData>(action, undefined);
  const [choice, setChoice] = useState<string | null>(null);
  const current = options.find((o) => o.value === choice);

  // Dispatched by hand so an error (say, no outcome picked) does not trigger
  // React's post-action form reset and throw away a long reviewer note.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {state?.message ? <Notice tone="error">{state.message}</Notice> : null}

      <fieldset>
        <legend className="text-label-md font-medium text-md-on-surface-variant">Outcome</legend>
        <div role="radiogroup" className="mt-2 flex flex-col gap-2">
          {options.map((o) => {
            const on = choice === o.value;
            return (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-full px-4 py-3 text-label-md font-medium transition-all duration-200 ease-md3 active:scale-[0.98]',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-md-primary',
                  on ? SELECTED[o.tone] : 'bg-md-surface-container-low text-md-on-surface hover:bg-md-primary/10',
                )}
              >
                <input
                  type="radio"
                  name="decision"
                  value={o.value}
                  className="sr-only"
                  checked={on}
                  onChange={() => setChoice(o.value)}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200',
                    on ? 'border-current' : 'border-md-outline',
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full bg-current transition-transform duration-200 ease-md3', on ? 'scale-100' : 'scale-0')} />
                </span>
                {o.label}
              </label>
            );
          })}
        </div>
        {state?.errors?.decision ? <p className="mt-1.5 px-4 text-label-sm text-md-error">{state.errors.decision[0]}</p> : null}
      </fieldset>

      <TextAreaField
        label="Note"
        name="note"
        rows={5}
        hint={current?.noteHint ?? 'Pick an outcome first.'}
        error={state?.errors?.note}
      />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        aria-busy={pending || undefined}
        className="self-start"
        variant={current?.tone === 'error' ? 'outlined' : 'filled'}
      >
        {pending ? 'Saving' : (current?.button ?? 'Record decision')}
      </Button>
    </form>
  );
}
