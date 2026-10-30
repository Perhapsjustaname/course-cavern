import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/dal';
import { getOutline, getOwnedLesson, getQuiz, isEditable } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { isMediaKind } from '@/lib/media';
import { lessonHasContent, MISSING_CONTENT } from '@/lib/lessons';
import { LESSON_KINDS } from '@/lib/constants';
import { deleteLessonAndReturn } from '@/app/actions/courses';
import { KindIcon, ConfirmDelete } from '@/components/course/controls';
import { MediaUploader } from '@/components/course/media-uploader';
import { QuizBuilder } from '@/components/course/quiz-builder';
import { LessonDetailsForm, ReadingForm } from '@/components/course/lesson-forms';
import { Notice } from '@/components/notice';

export const metadata: Metadata = { title: 'Edit lesson | Course Cavern' };

const KIND_LABEL = Object.fromEntries(LESSON_KINDS.map((k) => [k.value, k.label]));

const CONTENT_TITLE: Record<string, string> = {
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  text: 'Reading',
  quiz: 'Questions',
};

const TIPS: Record<string, { title: string; body: string }[]> = {
  video: [
    { title: 'Film the work, not the room', body: 'Get close enough that someone could copy what your hands are doing.' },
    { title: 'Shorter beats longer', body: 'Five to fifteen minutes per video keeps people watching. Split anything longer.' },
  ],
  audio: [
    { title: 'A quiet room matters more than the microphone', body: 'Soft furnishings soak up echo. A closet full of clothes works.' },
  ],
  pdf: [
    { title: 'Make it worth downloading', body: 'Checklists, diagrams and reference tables people will keep beside them on the job.' },
  ],
  text: [
    { title: 'Write like you talk to an apprentice', body: 'Short paragraphs. Number the steps. Say why, not just what.' },
    { title: 'Headings help people come back', body: 'Most people return to a reading to find one thing. Make it easy to find.' },
  ],
  quiz: [
    { title: 'Test the judgement call', body: 'The best questions are the ones people get wrong on site, not trivia.' },
    { title: 'Explain the wrong answers', body: 'Saying why an answer is wrong teaches more than the right one does.' },
  ],
};

type Props = { params: Promise<{ id: string; lessonId: string }> };

export default async function LessonEditorPage({ params }: Props) {
  const { id, lessonId } = await params;
  const { instructor } = await requireInstructor(`/instructor/courses/${id}/lessons/${lessonId}`);
  if (!isUuid(id) || !isUuid(lessonId)) notFound();
  const lesson = await getOwnedLesson(lessonId, instructor.id);
  // The lesson must belong to the course in the URL, not just to this instructor.
  if (!lesson || lesson.course_id !== id) notFound();

  const [outline, questions] = await Promise.all([
    getOutline(id),
    lesson.kind === 'quiz' ? getQuiz(lessonId) : Promise.resolve([]),
  ]);
  const editable = isEditable(lesson.course_status);
  const ready = lessonHasContent(lesson);

  const all = outline.flatMap((s) => s.lessons);
  const at = all.findIndex((l) => l.id === lesson.id);
  const prev = all[at - 1];
  const next = all[at + 1];
  const sectionNumber = outline.findIndex((s) => s.id === lesson.section_id) + 1;
  const base = `/instructor/courses/${id}`;
  const mediaUrl = `/api/lessons/${lesson.id}/media?v=${new Date(lesson.updated_at).getTime()}`;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-label-md text-md-on-surface-variant">
        <Link href={base} className="rounded-full px-2 py-1 font-medium text-md-primary hover:bg-md-primary/10">
          Curriculum
        </Link>
        <span aria-hidden="true">/</span>
        <span className="px-1">
          Section {sectionNumber}: {lesson.section_title}
        </span>
      </nav>

      <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2">
        <KindIcon kind={lesson.kind} />
        <h2 className="min-w-0 flex-1 text-title-lg leading-snug break-words">{lesson.title}</h2>
        <span
          className={
            ready
              ? 'rounded-full bg-md-primary-container px-3 py-1 text-label-sm font-medium text-md-on-primary-container'
              : 'rounded-full bg-md-tertiary-container px-3 py-1 text-label-sm font-medium text-md-on-tertiary-container'
          }
        >
          {ready ? `${KIND_LABEL[lesson.kind]} ready` : MISSING_CONTENT[lesson.kind]}
        </span>
      </div>

      {!editable ? (
        <Notice tone="info" className="mt-6">
          The course is {lesson.course_status === 'published' ? 'live' : 'with a reviewer'}, so this lesson is locked.
        </Notice>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="rounded-md3-2xl bg-md-surface-container p-5 shadow-sm sm:p-7">
            <h3 className="text-title-lg">{CONTENT_TITLE[lesson.kind]}</h3>
            <div className="mt-5">
              {isMediaKind(lesson.kind) ? (
                <MediaUploader
                  lessonId={lesson.id}
                  kind={lesson.kind}
                  editable={editable}
                  current={lesson.content_key ? { url: mediaUrl, name: lesson.file_name ?? 'file', size: lesson.size_bytes } : null}
                />
              ) : lesson.kind === 'text' ? (
                <ReadingForm lessonId={lesson.id} body={lesson.body} editable={editable} />
              ) : (
                <QuizBuilder lessonId={lesson.id} questions={questions} editable={editable} />
              )}
            </div>
          </section>

          <section className="rounded-md3-2xl bg-md-surface-container p-5 shadow-sm sm:p-7">
            <h3 className="text-title-lg">Lesson details</h3>
            <div className="mt-5">
              <LessonDetailsForm
                editable={editable}
                sections={outline.map((s) => ({ id: s.id, title: s.title }))}
                lesson={{
                  id: lesson.id,
                  kind: lesson.kind,
                  title: lesson.title,
                  description: lesson.description,
                  section_id: lesson.section_id,
                  duration_minutes: lesson.duration_minutes,
                  pass_percent: lesson.pass_percent,
                  is_preview: lesson.is_preview,
                }}
              />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          <div className="rounded-md3-lg bg-md-surface-container p-5">
            <p className="text-label-md text-md-on-surface-variant">
              Lesson {at + 1} of {all.length}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {prev ? (
                <Link
                  href={`${base}/lessons/${prev.id}`}
                  className="group rounded-md3-md bg-md-background/60 px-4 py-3 transition-all duration-200 ease-md3 hover:bg-md-background hover:shadow-sm"
                >
                  <span className="block text-label-sm text-md-on-surface-variant">Previous</span>
                  <span className="block truncate text-label-md font-medium group-hover:text-md-primary">{prev.title}</span>
                </Link>
              ) : null}
              {next ? (
                <Link
                  href={`${base}/lessons/${next.id}`}
                  className="group rounded-md3-md bg-md-background/60 px-4 py-3 transition-all duration-200 ease-md3 hover:bg-md-background hover:shadow-sm"
                >
                  <span className="block text-label-sm text-md-on-surface-variant">Next</span>
                  <span className="block truncate text-label-md font-medium group-hover:text-md-primary">{next.title}</span>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-md3-lg bg-md-secondary-container/60 p-5 text-md-on-secondary-container">
            <ul className="space-y-4">
              {(TIPS[lesson.kind] ?? []).map((t) => (
                <li key={t.title}>
                  <p className="text-label-md font-medium">{t.title}</p>
                  <p className="mt-1 text-label-md leading-relaxed opacity-80">{t.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {editable ? (
            <div className="flex items-center justify-between gap-3 rounded-md3-lg border border-md-error/25 px-5 py-4">
              <p className="text-label-md text-md-on-surface-variant">Delete this lesson</p>
              <ConfirmDelete action={deleteLessonAndReturn.bind(null, lesson.id)} what="lesson" />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
