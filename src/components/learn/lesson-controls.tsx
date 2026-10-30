'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { recordVisit, setLessonDone } from '@/app/actions/learning';
import { Button } from '@/components/button';

/** Remembers this lesson as the one to come back to. Renders nothing. */
export function VisitRecorder({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    void recordVisit(lessonId);
  }, [lessonId]);
  return null;
}

/**
 * Ticks the lesson off when the video or audio plays to the end. Students can
 * still tick it by hand; plenty of people skim a video they already know.
 */
export function LessonMedia({
  kind,
  src,
  lessonId,
  autoComplete,
}: {
  kind: 'video' | 'audio';
  src: string;
  lessonId: string;
  autoComplete: boolean;
}) {
  const sent = useRef(false);
  const [, start] = useTransition();
  const onEnded = () => {
    if (!autoComplete || sent.current) return;
    sent.current = true;
    start(async () => {
      await setLessonDone(lessonId, true);
    });
  };
  return kind === 'video' ? (
    <video controls preload="metadata" playsInline src={src} onEnded={onEnded} className="aspect-video w-full rounded-md3-lg bg-black" />
  ) : (
    <audio controls preload="metadata" src={src} onEnded={onEnded} className="w-full" />
  );
}

export function DoneToggle({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () =>
    start(async () => {
      setError(null);
      const r = await setLessonDone(lessonId, !done);
      if (!r.ok) setError(r.message);
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {done ? (
        <>
          <span className="inline-flex items-center gap-2 rounded-full bg-md-primary-container px-4 py-2 text-label-md font-medium text-md-on-primary-container">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5.5 10.5 3 3 6-7" />
            </svg>
            Done
          </span>
          <Button type="button" variant="text" size="sm" onClick={toggle} disabled={pending}>
            {pending ? 'Saving' : 'Mark as not done'}
          </Button>
        </>
      ) : (
        <Button type="button" variant="tonal" onClick={toggle} disabled={pending} aria-busy={pending || undefined}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5.5 10.5 3 3 6-7" />
          </svg>
          {pending ? 'Saving' : 'Mark as done'}
        </Button>
      )}
      {error ? (
        <p role="alert" className="w-full text-label-md text-md-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
