'use client';

import { useRef, useState, useTransition } from 'react';
import { submitQuiz, type QuizResult } from '@/app/actions/learning';
import { Button } from '@/components/button';
import type { StudentQuestion } from '@/lib/learning';
import { cn } from '@/lib/cn';

type Marked = Extract<QuizResult, { ok: true }>;

export function QuizRunner({
  lessonId,
  questions,
  passMark,
  best,
  saving,
}: {
  lessonId: string;
  questions: StudentQuestion[];
  passMark: number;
  /** Earlier attempts by this student, if any. */
  best: { score: number; passed: boolean; attempts: number } | null;
  /** False for previews and staff: answers are marked but not kept. */
  saving: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Marked | null>(null);
  const [problem, setProblem] = useState<{ message: string; missing: string[] } | null>(null);
  const [pending, start] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  const check = () =>
    start(async () => {
      const r = await submitQuiz(lessonId, answers);
      if (!r.ok) {
        setProblem({ message: r.message, missing: r.missing ?? [] });
        return;
      }
      setProblem(null);
      setResult(r);
      top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

  const again = () => {
    setAnswers({});
    setResult(null);
    setProblem(null);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={top} className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label-md text-md-on-surface-variant">
          {questions.length} {questions.length === 1 ? 'question' : 'questions'}  ·  pass mark {passMark}%
        </p>
        {best ? (
          <p className="text-label-md text-md-on-surface-variant">
            Best so far: <span className="font-medium text-md-on-surface">{best.score}%</span>
            {best.passed ? ', passed' : ''}
          </p>
        ) : null}
      </div>
      {!saving ? (
        <p className="rounded-md3-md bg-md-surface-container-low px-4 py-3 text-label-md text-md-on-surface-variant">
          Your answers will be marked, but not saved.
        </p>
      ) : null}

      <div aria-live="polite">{result ? <Score result={result} onAgain={again} /> : null}</div>

      <ol className="space-y-4">
        {questions.map((q, i) => {
          const fb = result?.feedback[q.id];
          const missing = problem?.missing.includes(q.id);
          return (
            <li key={q.id}>
              <fieldset
                className={cn(
                  'rounded-md3-lg bg-md-background p-5 ring-1 transition-shadow duration-200',
                  missing ? 'ring-2 ring-md-error' : 'ring-md-outline/15',
                )}
              >
                <legend className="sr-only">Question {i + 1}</legend>
                <p className="text-label-sm font-medium text-md-on-surface-variant">
                  Question {i + 1} of {questions.length}
                </p>
                <div className="rich-text mt-1 text-body-lg" dangerouslySetInnerHTML={{ __html: q.prompt }} />
                <div className="mt-4 flex flex-col gap-2">
                  {q.options.map((o) => {
                    const picked = answers[q.id] === o.id;
                    const chosen = fb?.chosen === o.id;
                    const isAnswer = fb?.answer === o.id;
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          'flex items-start gap-3 rounded-md3-md px-4 py-3 ring-1 transition-colors duration-200',
                          result ? 'cursor-default' : 'cursor-pointer hover:bg-md-primary/5',
                          fb
                            ? chosen && fb.right
                              ? 'bg-md-primary-container ring-md-primary/40'
                              : chosen
                                ? 'bg-md-error-container ring-md-error/40'
                                : isAnswer
                                  ? 'ring-2 ring-md-primary'
                                  : 'ring-md-outline/15'
                            : picked
                              ? 'bg-md-secondary-container ring-md-primary/40'
                              : 'ring-md-outline/15',
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={o.id}
                          checked={picked}
                          disabled={Boolean(result) || pending}
                          onChange={() => {
                            setAnswers((a) => ({ ...a, [q.id]: o.id }));
                            if (missing) setProblem((p) => (p ? { ...p, missing: p.missing.filter((id) => id !== q.id) } : p));
                          }}
                          className="mt-1 h-4 w-4 shrink-0 accent-md-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-body-md break-words">{o.text}</span>
                          {fb && chosen ? (
                            <span className={cn('mt-1 block text-label-md font-medium', fb.right ? 'text-md-on-primary-container' : 'text-md-on-error-container')}>
                              {fb.right ? 'Right' : 'Not this one'}
                            </span>
                          ) : null}
                          {fb && !chosen && isAnswer ? (
                            <span className="mt-1 block text-label-md font-medium text-md-primary">The right answer</span>
                          ) : null}
                          {fb && chosen && fb.explanation ? (
                            <span className="mt-1 block text-label-md text-md-on-surface-variant">{fb.explanation}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {missing ? <p className="mt-3 text-label-md text-md-error">Pick an answer for this one.</p> : null}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {result ? null : (
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" size="lg" onClick={check} disabled={pending} aria-busy={pending || undefined}>
            {pending ? 'Marking' : 'Check my answers'}
          </Button>
          {problem ? (
            <p role="alert" className="text-label-md text-md-error">
              {problem.message}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Score({ result, onAgain }: { result: Marked; onAgain: () => void }) {
  return (
    <div
      className={cn(
        'rounded-md3-xl p-6 sm:p-7',
        result.passed ? 'bg-md-primary-container text-md-on-primary-container' : 'bg-md-tertiary-container text-md-on-tertiary-container',
      )}
    >
      <p className="text-label-md font-medium">{result.passed ? 'Passed' : 'Not passed yet'}</p>
      <p className="mt-1 text-headline-md font-medium tracking-tight">
        {result.correct} of {result.total} right, {result.score}%
      </p>
      <p className="mt-2 text-body-md opacity-90">
        {result.passed
          ? result.courseDone
            ? 'That was the last lesson. You have finished the course.'
            : result.saved
              ? 'This lesson is ticked off.'
              : `The pass mark is ${result.passMark}%.`
          : `You need ${result.passMark}% to pass. Have another look at the ones marked wrong, then try again.`}
      </p>
      <Button type="button" variant={result.passed ? 'outlined' : 'filled'} size="md" onClick={onAgain} className="mt-5">
        {result.passed ? 'Take it again' : 'Try again'}
      </Button>
    </div>
  );
}
