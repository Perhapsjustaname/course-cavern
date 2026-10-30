import { RichText } from '@/components/rich-text';
import { KindIcon } from '@/components/course/controls';
import { LESSON_KINDS } from '@/lib/constants';
import { lessonHasContent, MISSING_CONTENT } from '@/lib/lessons';
import type { Lesson, QuizQuestion, Section } from '@/lib/courses';
import { formatBytes, formatMinutes, plural } from '@/lib/format';

const KIND_LABEL = Object.fromEntries(LESSON_KINDS.map((k) => [k.value, k.label]));

/**
 * The whole course, read-only, the way a reviewer needs it: every video and
 * audio file playable, every reading readable, every quiz with its answers.
 */
export function CourseContent({ sections, quizzes }: { sections: Section[]; quizzes: Record<string, QuizQuestion[]> }) {
  if (!sections.length) {
    return <p className="text-body-md text-md-on-surface-variant">No sections.</p>;
  }
  return (
    <ol className="flex flex-col gap-6">
      {sections.map((s, i) => (
        <li key={s.id} className="rounded-md3-lg bg-md-surface-container p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-md-primary text-label-md font-bold text-md-on-primary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <h3 className="text-title-lg leading-snug break-words">{s.title}</h3>
              <p className="text-label-sm text-md-on-surface-variant">{plural(s.lessons.length, 'lesson')}</p>
            </div>
          </div>
          <RichText html={s.description} className="mt-3 text-md-on-surface-variant sm:ml-12" />
          <ol className="mt-4 flex flex-col gap-2 sm:ml-12">
            {s.lessons.map((l, j) => (
              <LessonBlock key={l.id} lesson={l} index={j} questions={quizzes[l.id] ?? []} />
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function LessonBlock({ lesson, index, questions }: { lesson: Lesson; index: number; questions: QuizQuestion[] }) {
  const ready = lessonHasContent(lesson);
  const meta = [
    KIND_LABEL[lesson.kind],
    formatMinutes(lesson.duration_minutes ?? 0),
    lesson.kind === 'quiz' && lesson.pass_percent !== null ? `pass at ${lesson.pass_percent}%` : null,
    lesson.is_preview ? 'Free preview' : null,
  ].filter(Boolean);

  return (
    <li>
      <details className="group rounded-md3-md bg-md-background/70 open:bg-md-background">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md3-md px-3 py-2.5 transition-colors duration-200 hover:bg-md-background [&::-webkit-details-marker]:hidden">
          <span className="w-5 shrink-0 text-right text-label-sm text-md-on-surface-variant tabular-nums">{index + 1}</span>
          <KindIcon kind={lesson.kind} />
          <span className="min-w-0 flex-1">
            <span className="block text-body-md break-words">{lesson.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-label-sm text-md-on-surface-variant">{meta.join('  ·  ')}</span>
              {!ready ? (
                <span className="rounded-full bg-md-error-container px-2 py-0.5 text-label-sm font-medium text-md-on-error-container">
                  {MISSING_CONTENT[lesson.kind]}
                </span>
              ) : null}
            </span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-md-on-surface-variant transition-transform duration-300 ease-md3 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
          </svg>
        </summary>
        <div className="space-y-4 px-4 pt-1 pb-4">
          <RichText html={lesson.description} className="text-md-on-surface-variant" />
          <LessonBody lesson={lesson} questions={questions} />
        </div>
      </details>
    </li>
  );
}

function LessonBody({ lesson, questions }: { lesson: Lesson; questions: QuizQuestion[] }) {
  const src = `/api/lessons/${lesson.id}/media?v=${new Date(lesson.updated_at).getTime()}`;
  const fileLine = lesson.file_name ? (
    <p className="text-label-sm text-md-on-surface-variant">
      {lesson.file_name}
      {lesson.size_bytes ? `, ${formatBytes(lesson.size_bytes)}` : ''}
    </p>
  ) : null;

  if (lesson.kind === 'video' && lesson.content_key) {
    return (
      <div className="space-y-2">
        <video controls preload="metadata" src={src} className="aspect-video w-full rounded-md3-md bg-black" />
        {fileLine}
      </div>
    );
  }
  if (lesson.kind === 'audio' && lesson.content_key) {
    return (
      <div className="space-y-2">
        <audio controls preload="metadata" src={src} className="w-full" />
        {fileLine}
      </div>
    );
  }
  if (lesson.kind === 'pdf' && lesson.content_key) {
    return (
      <div className="space-y-2">
        <iframe src={src} title={lesson.title} className="h-[32rem] w-full rounded-md3-md border border-md-outline/20 bg-white" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {fileLine}
          <a href={src} target="_blank" rel="noopener" className="text-label-md font-medium text-md-primary hover:underline">
            Open in a new tab
          </a>
        </div>
      </div>
    );
  }
  if (lesson.kind === 'text' && lesson.body) {
    return <RichText html={lesson.body} className="rounded-md3-md bg-md-surface-container-low/50 px-4 py-3" />;
  }
  if (lesson.kind === 'quiz' && questions.length) {
    return (
      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-md3-md bg-md-surface-container-low/50 p-4">
            <p className="text-label-sm font-medium text-md-on-surface-variant">Question {i + 1}</p>
            <RichText html={q.prompt} className="mt-1" />
            <ul className="mt-3 space-y-2">
              {q.options.map((o) => (
                <li key={o.id} className={o.is_correct ? 'rounded-md3-sm bg-md-primary-container/70 px-3 py-2' : 'px-3 py-2'}>
                  <p className="flex items-start gap-2 text-body-md">
                    <span aria-hidden="true" className={o.is_correct ? 'text-md-primary' : 'text-md-outline'}>
                      {o.is_correct ? '●' : '○'}
                    </span>
                    <span className="min-w-0 break-words">
                      {o.text}
                      {o.is_correct ? <span className="sr-only"> (correct answer)</span> : null}
                    </span>
                  </p>
                  {o.explanation ? <p className="mt-1 ml-5 text-label-md text-md-on-surface-variant">{o.explanation}</p> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    );
  }
  return null;
}
