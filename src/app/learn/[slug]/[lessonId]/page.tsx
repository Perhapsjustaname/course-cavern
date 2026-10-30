import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/dal';
import { getOutline } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { lessonHasContent } from '@/lib/lessons';
import {
  getAttemptSummary,
  getCourseBySlug,
  getDoneLessonIds,
  getEnrolment,
  getQuizForStudent,
  isStaff,
} from '@/lib/learning';
import { LESSON_KINDS } from '@/lib/constants';
import { formatBytes, formatMinutes, plural } from '@/lib/format';
import { RichText } from '@/components/rich-text';
import { Notice } from '@/components/notice';
import { ButtonLink } from '@/components/button';
import { KindIcon } from '@/components/course/controls';
import { EnrolPanel } from '@/components/learn/enrol-panel';
import { DoneToggle, LessonMedia, VisitRecorder } from '@/components/learn/lesson-controls';
import { QuizRunner } from '@/components/learn/quiz-runner';

const KIND_LABEL: Record<string, string> = Object.fromEntries(LESSON_KINDS.map((k) => [k.value, k.label]));

type Props = { params: Promise<{ slug: string; lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourseBySlug((await params).slug);
  return { title: course?.live ? `${course.title} | Course Cavern` : 'Course | Course Cavern' };
}

/**
 * staff     the course's instructor or an admin: everything, nothing saved
 * enrolled  everything, with progress
 * preview   a free preview lesson, for anyone
 * locked    not enrolled, and not a preview
 * offline   enrolled, but the course is being updated
 */
type Access = 'staff' | 'enrolled' | 'preview' | 'locked' | 'offline';

export default async function LessonPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  if (!course || !isUuid(lessonId)) notFound();
  const user = await getCurrentUser();
  const staff = isStaff(course, user);
  const enrolment = user ? await getEnrolment(user.id, course.id) : null;
  if (!course.live && !staff && !enrolment) notFound();

  const outline = await getOutline(course.id);
  const sectionIndex = outline.findIndex((s) => s.lessons.some((l) => l.id === lessonId));
  if (sectionIndex < 0) notFound();
  const section = outline[sectionIndex]!;
  const lesson = section.lessons.find((l) => l.id === lessonId)!;
  const all = outline.flatMap((s) => s.lessons);
  const at = all.findIndex((l) => l.id === lesson.id);
  const prev = all[at - 1];
  const next = all[at + 1];

  const access: Access = staff
    ? 'staff'
    : !course.live
      ? 'offline'
      : enrolment
        ? 'enrolled'
        : lesson.is_preview
          ? 'preview'
          : 'locked';
  const open = access === 'staff' || access === 'enrolled' || access === 'preview';

  const done = enrolment ? await getDoneLessonIds(enrolment.id) : new Set<string>();
  const isDone = done.has(lesson.id);
  const finishedCourse = enrolment !== null && all.length > 0 && all.every((l) => done.has(l.id));
  const [questions, attempts] = await Promise.all([
    open && lesson.kind === 'quiz' ? getQuizForStudent(lesson.id) : Promise.resolve([]),
    access === 'enrolled' && lesson.kind === 'quiz' ? getAttemptSummary(enrolment!.id, lesson.id) : Promise.resolve(null),
  ]);
  const src = `/api/lessons/${lesson.id}/media?v=${new Date(lesson.updated_at).getTime()}`;
  const hasContent = lessonHasContent(lesson);

  return (
    <article className="flex flex-col gap-6">
      {access === 'enrolled' ? <VisitRecorder lessonId={lesson.id} /> : null}

      <header className="rounded-md3-xl bg-md-surface-container p-5 shadow-sm sm:p-7">
        <p className="text-label-md text-md-on-surface-variant">
          Section {sectionIndex + 1}: {section.title}
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2">
          <KindIcon kind={lesson.kind} />
          <h1 className="min-w-0 flex-1 text-[1.5rem] leading-snug font-medium tracking-tight break-words sm:text-headline-md">
            {lesson.title}
          </h1>
        </div>
        <p className="mt-2 text-label-md text-md-on-surface-variant">
          {[`Lesson ${at + 1} of ${all.length}`, KIND_LABEL[lesson.kind], formatMinutes(lesson.duration_minutes ?? 0)]
            .filter(Boolean)
            .join('  ·  ')}
        </p>
        <RichText html={lesson.description} className="mt-4 text-md-on-surface-variant" />
      </header>

      {access === 'staff' ? (
        <Notice tone="info">
          You are seeing this as {user?.id === course.owner_user_id ? 'its instructor' : 'an admin'}. Nothing you do here counts as progress.
        </Notice>
      ) : null}
      {access === 'preview' ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md3-xl bg-md-secondary-container px-5 py-4 text-md-on-secondary-container">
          <p className="text-body-md">
            This is a free preview. Enrol to open all {plural(all.length, 'lesson')}.
          </p>
          <ButtonLink href={`/courses/${slug}`} variant="inverse" size="sm">
            See the course
          </ButtonLink>
        </div>
      ) : null}

      <section className="rounded-md3-xl bg-md-surface-container p-5 shadow-sm sm:p-7">
        {access === 'locked' ? (
          <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
            <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-md-secondary-container text-md-on-secondary-container">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="10.5" width="14" height="10" rx="2" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <h2 className="mt-4 text-title-lg">This lesson is for enrolled students</h2>
            <p className="mt-2 text-body-md text-md-on-surface-variant">Enrol in the course to open it, and every other lesson.</p>
            <div className="mt-6 w-full max-w-xs text-left">
              <EnrolPanel course={course} viewer={user ? 'student' : 'signed-out'} live={course.live} />
            </div>
          </div>
        ) : access === 'offline' ? (
          <div className="mx-auto max-w-md py-8 text-center">
            <h2 className="text-title-lg">The instructor is updating this course</h2>
            <p className="mt-2 text-body-md text-md-on-surface-variant">
              Lessons are closed until the changes have been reviewed. Your progress is saved, and you can pick up where you left off once it is back.
            </p>
            <ButtonLink href="/learning" variant="tonal" size="md" className="mt-6">
              Back to my learning
            </ButtonLink>
          </div>
        ) : !hasContent ? (
          <p className="py-8 text-center text-body-md text-md-on-surface-variant">Nothing has been added to this lesson yet.</p>
        ) : (lesson.kind === 'video' || lesson.kind === 'audio') ? (
          <LessonMedia kind={lesson.kind} src={src} lessonId={lesson.id} autoComplete={access === 'enrolled' && !isDone} />
        ) : lesson.kind === 'pdf' ? (
          <div className="space-y-3">
            <iframe src={src} title={lesson.title} className="h-[70vh] min-h-[28rem] w-full rounded-md3-md border border-md-outline/20 bg-white" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-label-sm text-md-on-surface-variant">
                {lesson.file_name}
                {lesson.size_bytes ? `, ${formatBytes(lesson.size_bytes)}` : ''}
              </p>
              <a href={src} target="_blank" rel="noopener" className="rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary hover:bg-md-primary/10">
                Open in a new tab
              </a>
            </div>
          </div>
        ) : lesson.kind === 'text' ? (
          <RichText html={lesson.body} className="mx-auto max-w-2xl text-body-lg" />
        ) : (
          <QuizRunner
            lessonId={lesson.id}
            questions={questions}
            passMark={lesson.pass_percent ?? 80}
            best={attempts ? { score: attempts.best, passed: attempts.passed, attempts: attempts.attempts } : null}
            saving={access === 'enrolled'}
          />
        )}
      </section>

      {access === 'enrolled' && hasContent ? (
        <div className="flex flex-wrap items-center justify-between gap-4 px-1">
          {lesson.kind === 'quiz' ? (
            <p className="text-label-md text-md-on-surface-variant">
              {isDone ? 'Passed. This lesson is ticked off.' : `Pass the quiz to tick this lesson off.`}
            </p>
          ) : (
            <DoneToggle lessonId={lesson.id} done={isDone} />
          )}
        </div>
      ) : null}

      {finishedCourse && !next ? (
        <div className="rounded-md3-xl bg-md-primary p-6 text-md-on-primary shadow-sm sm:p-8">
          <p className="text-label-md font-medium opacity-80">Course finished</p>
          <p className="mt-1 text-headline-md font-medium tracking-tight">You have done every lesson in {course.title}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/learning" variant="inverse" size="md">
              Back to my learning
            </ButtonLink>
            <Link
              href="/courses"
              className="inline-flex h-10 items-center rounded-full px-6 text-label-md font-medium text-md-on-primary ring-1 ring-md-on-primary/40 transition-colors duration-200 hover:bg-md-on-primary/10"
            >
              Find another course
            </Link>
          </div>
        </div>
      ) : null}

      <nav aria-label="Lesson" className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/learn/${slug}/${prev.id}`}
            className="group rounded-md3-lg bg-md-surface-container px-5 py-4 shadow-sm transition-all duration-200 ease-md3 hover:shadow-md"
          >
            <span className="block text-label-sm text-md-on-surface-variant">Previous</span>
            <span className="block truncate text-label-md font-medium group-hover:text-md-primary">{prev.title}</span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? (
          <Link
            href={`/learn/${slug}/${next.id}`}
            className="group rounded-md3-lg bg-md-surface-container px-5 py-4 text-right shadow-sm transition-all duration-200 ease-md3 hover:shadow-md"
          >
            <span className="block text-label-sm text-md-on-surface-variant">Next</span>
            <span className="block truncate text-label-md font-medium group-hover:text-md-primary">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
