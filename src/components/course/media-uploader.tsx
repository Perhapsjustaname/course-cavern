'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { removeLessonMedia } from '@/app/actions/courses';
import { ConfirmDelete } from '@/components/course/controls';
import { fileHead, uploadFile } from '@/components/course/upload';
import { LESSON_MAX_BYTES, MEDIA_RULES, bytesMatch, canonicalType, formatLimit, type MediaKind } from '@/lib/media';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/cn';

type Current = { url: string; name: string; size: number | null } | null;

/** How long a video or audio file runs, read from its own metadata. Null if it cannot tell. */
function readDuration(file: File, kind: MediaKind): Promise<number | null> {
  if (kind === 'pdf') return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement(kind === 'video' ? 'video' : 'audio');
    const url = URL.createObjectURL(file);
    const finish = (value: number | null) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 8000);
    el.preload = 'metadata';
    el.onloadedmetadata = () => finish(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => finish(null);
    el.src = url;
  });
}

const NOUN: Record<MediaKind, string> = { video: 'video', audio: 'audio file', pdf: 'PDF' };

export function MediaUploader({
  lessonId,
  kind,
  current,
  editable,
}: {
  lessonId: string;
  kind: MediaKind;
  current: Current;
  editable: boolean;
}) {
  const router = useRouter();
  const rule = MEDIA_RULES[kind];
  const input = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'uploading'>('idle');
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Leaving mid-upload would throw the upload away. Ask first.
  useEffect(() => {
    if (phase !== 'uploading') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  async function pick(file: File | undefined) {
    if (!file || phase !== 'idle') return;
    setError(null);
    setPhase('checking');
    const type = canonicalType(file.type, file.name);
    if (!rule.types[type]) {
      setPhase('idle');
      setError(`That file type will not work here. ${rule.hint}`);
      return;
    }
    if (file.size > LESSON_MAX_BYTES) {
      setPhase('idle');
      setError(`That file is ${formatBytes(file.size)}. The limit is ${formatLimit(LESSON_MAX_BYTES)}.`);
      return;
    }
    if (!bytesMatch(type, await fileHead(file))) {
      setPhase('idle');
      setError(`That file does not look like a real ${NOUN[kind]}, even though its name says it is.`);
      return;
    }
    const seconds = await readDuration(file, kind);

    setPicked({ name: file.name, size: file.size });
    setProgress(0);
    setPhase('uploading');
    const headers: Record<string, string> = { 'Content-Type': type, 'X-File-Name': encodeURIComponent(file.name) };
    if (seconds) headers['X-Duration-Seconds'] = String(Math.round(seconds));
    const { promise, cancel } = uploadFile(`/api/lessons/${lessonId}/media`, file, headers, setProgress);
    cancelRef.current = cancel;
    const result = await promise;
    cancelRef.current = null;
    setPhase('idle');
    setPicked(null);
    if (!result.ok) {
      if (!result.cancelled) setError(result.message);
      return;
    }
    setReplacing(false);
    router.refresh();
  }

  const showPlayer = current && !replacing;

  return (
    <div>
      {showPlayer ? (
        <div className="space-y-3">
          {kind === 'video' ? (
            <video key={current.url} controls preload="metadata" src={current.url} className="aspect-video w-full rounded-md3-md bg-black" />
          ) : kind === 'audio' ? (
            <audio key={current.url} controls preload="metadata" src={current.url} className="w-full" />
          ) : (
            <iframe key={current.url} src={current.url} title="PDF preview" className="h-[28rem] w-full rounded-md3-md border border-md-outline/20 bg-white" />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md3-md bg-md-surface-container-low/60 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-body-md font-medium" title={current.name}>
                {current.name}
              </p>
              {current.size ? <p className="text-label-sm text-md-on-surface-variant">{formatBytes(current.size)}</p> : null}
            </div>
            <div className="flex items-center gap-1">
              {kind === 'pdf' ? (
                <a href={current.url} target="_blank" rel="noopener" className="rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary hover:bg-md-primary/10">
                  Open
                </a>
              ) : null}
              {editable ? (
                <>
                  <button
                    type="button"
                    onClick={() => setReplacing(true)}
                    className="rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary transition-all duration-200 ease-md3 hover:bg-md-primary/10 active:scale-95"
                  >
                    Replace
                  </button>
                  <ConfirmDelete action={removeLessonMedia.bind(null, lessonId)} what={NOUN[kind]} />
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : phase === 'uploading' && picked ? (
        <div className="rounded-md3-lg bg-md-primary-container/50 p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-body-md font-medium" title={picked.name}>
                {picked.name}
              </p>
              <p className="text-label-sm text-md-on-surface-variant tabular-nums">
                {formatBytes(Math.round(picked.size * progress))} of {formatBytes(picked.size)}
              </p>
            </div>
            <span className="text-title-lg text-md-primary tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-md-surface-container-low">
            <div className="h-full rounded-full bg-md-primary transition-[width] duration-300 ease-md3" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-label-sm text-md-on-surface-variant">Keep this page open until it finishes.</p>
            <button
              type="button"
              onClick={() => cancelRef.current?.()}
              className="rounded-full px-3 py-1.5 text-label-md font-medium text-md-on-surface-variant transition-colors duration-200 hover:bg-md-error/10 hover:text-md-error"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : editable ? (
        <div>
          <button
            type="button"
            disabled={phase !== 'idle'}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void pick(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-3 rounded-md3-lg border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ease-md3',
              error
                ? 'border-md-error bg-md-error-container/30'
                : dragging
                  ? 'border-md-primary bg-md-primary/10'
                  : 'border-md-outline/40 hover:border-md-primary/60 hover:bg-md-primary/5',
            )}
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-md-secondary-container text-md-on-secondary-container">
              {phase === 'checking' ? (
                <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15.5V4m0 0L7.5 8.5M12 4l4.5 4.5M5 19.5h14" />
                </svg>
              )}
            </span>
            <span className="text-body-md font-medium">
              {phase === 'checking' ? 'Checking the file' : `Choose the ${NOUN[kind]} or drop it here`}
            </span>
            <span className="text-label-sm text-md-on-surface-variant">
              {rule.hint} Up to {formatLimit(LESSON_MAX_BYTES)}.
            </span>
          </button>
          {replacing ? (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setReplacing(false);
                  setError(null);
                }}
                className="rounded-full px-3 py-1.5 text-label-md font-medium text-md-on-surface-variant hover:bg-md-primary/10"
              >
                Keep the current {NOUN[kind]}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-md3-md bg-md-surface-container-low px-4 py-6 text-center text-body-md text-md-on-surface-variant">
          No {NOUN[kind]} uploaded.
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={rule.accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error ? (
        <p role="alert" className="mt-2 px-1 text-label-md text-md-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
