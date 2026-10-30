'use client';

import { useMemo } from 'react';
import { submitCourse, unpublishCourse, withdrawCourse, type FormState } from '@/app/actions/courses';
import { SubmitButton } from '@/components/form/submit-button';
import { Notice } from '@/components/notice';
import { PasswordConfirm } from '@/components/course/password-confirm';
import { useFormAction } from '@/components/form/use-form-action';
import type { Check, CourseStatus } from '@/lib/courses';
import { cn } from '@/lib/cn';

function Tick({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors duration-300',
        done ? 'bg-md-primary text-md-on-primary' : 'bg-md-surface-container-low ring-1 ring-md-outline/40',
      )}
    >
      {done ? (
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 10.5 3.2 3.2L15 7" />
        </svg>
      ) : null}
    </span>
  );
}

export function SubmitPanel({
  courseId,
  status,
  checks,
  submittedLabel,
  publishedLabel,
}: {
  courseId: string;
  status: CourseStatus;
  checks: Check[];
  submittedLabel?: string;
  publishedLabel?: string;
}) {
  const action = useMemo(() => submitCourse.bind(null, courseId), [courseId]);
  const { state, pending, onSubmit } = useFormAction<FormState>(action, undefined);
  const unpublish = useMemo(() => unpublishCourse.bind(null, courseId), [courseId]);
  const done = checks.filter((c) => c.done).length;
  const ready = done === checks.length;

  if (status === 'published') {
    return (
      <div className="rounded-md3-lg bg-md-primary-container p-6 text-md-on-primary-container">
        <p className="text-title-lg">Published</p>
        <p className="mt-2 text-body-md opacity-85">
          It is locked so students always get what was reviewed. To change something, take it offline. It
          goes back to draft and needs another review before it is live again.
        </p>
        {publishedLabel ? <p className="mt-3 text-label-sm opacity-75">{publishedLabel}</p> : null}
        <div className="mt-5">
          <PasswordConfirm
            action={unpublish}
            triggerLabel="Take offline to edit"
            title="Take this course offline?"
            confirmLabel="Take it offline"
            tone="warning"
          >
            It disappears from the catalogue straight away and goes back to draft. You will need to send it
            for review again before anyone can buy it.
          </PasswordConfirm>
        </div>
      </div>
    );
  }

  if (status === 'in_review') {
    return (
      <div className="rounded-md3-lg bg-md-secondary-container p-6 text-md-on-secondary-container">
        <p className="text-title-lg">With a reviewer</p>
        <p className="mt-2 text-body-md opacity-85">
          It is locked while they look at it. Pull it back if you need to change something; it will go to
          the back of the queue when you resend it.
        </p>
        {submittedLabel ? <p className="mt-3 text-label-sm opacity-75">{submittedLabel}</p> : null}
        <form action={withdrawCourse.bind(null, courseId)} className="mt-5">
          <SubmitButton variant="outlined" size="md" pendingLabel="Withdrawing">
            Withdraw from review
          </SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-md3-lg bg-md-surface-container p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-title-lg">Ready for review?</p>
        <span className="text-label-md text-md-on-surface-variant tabular-nums">
          {done} of {checks.length}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-md-surface-container-low" aria-hidden="true">
        <div
          className="h-full rounded-full bg-md-primary transition-all duration-500 ease-md3"
          style={{ width: `${(done / checks.length) * 100}%` }}
        />
      </div>
      <ul className="mt-5 space-y-3.5">
        {checks.map((c) => (
          <li key={c.key} className="flex gap-3">
            <Tick done={c.done} />
            <div>
              <p className={cn('text-body-md', c.done ? 'text-md-on-surface' : 'text-md-on-surface-variant')}>{c.label}</p>
              {!c.done && c.hint ? <p className="text-label-sm text-md-on-surface-variant">{c.hint}</p> : null}
            </div>
          </li>
        ))}
      </ul>

      {state?.message && !state.ok ? (
        <Notice tone="error" className="mt-5">
          {state.message}
        </Notice>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6">
        {ready ? (
          <SubmitButton size="lg" pending={pending} pendingLabel="Sending" className="w-full">
            {status === 'changes_requested' ? 'Send it back for review' : 'Send for review'}
          </SubmitButton>
        ) : (
          <p className="rounded-md3-md bg-md-surface-container-low px-4 py-3 text-label-md text-md-on-surface-variant">
            Tick everything above and the button to send it appears here.
          </p>
        )}
      </form>
    </div>
  );
}
