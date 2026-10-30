import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/dal';
import { getOutline } from '@/lib/courses';
import { getCourseBySlug, getDoneLessonIds, getEnrolment, getVerifiedCredentials, isStaff } from '@/lib/learning';
import { LESSON_KINDS, LEVELS } from '@/lib/constants';
import { formatDate, formatMinutes, plural } from '@/lib/format';
import { CourseThumb } from '@/components/course-thumb';
import { RichText } from '@/components/rich-text';
import { Notice } from '@/components/notice';
import { KindIcon } from '@/components/course/controls';
import { EnrolPanel, type Viewer } from '@/components/learn/enrol-panel';
import { InstructorCard } from '@/components/learn/instructor-card';
import { ProgressBar } from '@/components/learn/progress-bar';
import { VerifiedTick } from '@/components/learn/catalogue-card';

const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));
const KIND_LABEL: Record<string, string> = Object.fromEntries(LESSON_KINDS.map((k) => [k.value, k.label]));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourseBySlug((await params).slug);
  if (!course?.live) return { title: 'Course | Course Cavern' };
  return { title: `${course.title} | Course Cavern`, description: course.summary ?? undefined };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getCurrentUser();
  const staff = isStaff(course, user);
  const enrolment = user ? await getEnrolment(user.id, course.id) : null;
  // Off the catalogue: only its staff, and students already enrolled, can still see the page.
  if (!course.live && !staff && !enrolment) notFound();

  const [outline, credentials, done] = await Promise.all([
    getOutline(course.id),
    getVerifiedCredentials(course.instructor_id),
    enrolment ? getDoneLessonIds(enrolment.id) : Promise.resolve(new Set<string>()),
  ]);
  const lessons = outline.flatMap((s) => s.lessons);
  const minutes = lessons.reduce((m, l) => m + (l.duration_minutes ?? 0), 0);
  const quizzes = lessons.filter((l) => l.kind === 'quiz').length;
  const previews = lessons.filter((l) => l.is_preview).length;
  const doneCount = lessons.filter((l) => done.has(l.id)).length;

  const viewer: Viewer = !user
    ? 'signed-out'
    : user.id === course.owner_user_id
      ? 'owner'
      : staff
        ? 'admin'
        : enrolment
          ? 'enrolled'
          : 'student';
  const canOpen = (isPreview: boolean) => course.live && (Boolean(enrolment) || isPreview || staff);
  const meta = [course.level && LEVEL[course.level], course.industry].filter(Boolean).join('  ·  ');

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/courses" className="inline-flex items-center gap-1 rounded-full text-label-md font-medium text-md-primary hover:underline">
        <span aria-hidden="true">←</span> All courses
      </Link>

      {!course.live && staff ? (
        <Notice tone="info" className="mt-6">
          This course is not in the catalogue right now. This is how its page looks to students once it is published.
        </Notice>
      ) : null}

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          {meta ? <p className="text-label-md font-medium text-md-primary">{meta}</p> : null}
          <h1 className="mt-2 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">{course.title}</h1>
          {course.summary ? <p className="mt-4 max-w-2xl text-body-lg text-md-on-surface-variant">{course.summary}</p> : null}
          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md">
            <span className="text-md-on-surface-variant">Taught by</span>
            <Link href={`/instructors/${course.instructor_id}`} className="inline-flex items-center gap-1.5 font-medium text-md-on-surface hover:text-md-primary">
              {course.instructor_name}
              <VerifiedTick />
            </Link>
            {course.instructor_headline ? (
              <>
                <span aria-hidden="true" className="text-md-on-surface-variant">·</span>
                <span className="text-md-on-surface-variant">{course.instructor_headline}</span>
              </>
            ) : null}
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {[
              plural(lessons.length, 'lesson'),
              formatMinutes(minutes),
              quizzes ? plural(quizzes, 'quiz', 'quizzes') : null,
              course.student_count ? plural(course.student_count, 'student') : null,
              `Updated ${formatDate(course.updated_at)}`,
            ]
              .filter(Boolean)
              .map((fact) => (
                <li key={fact} className="rounded-full bg-md-surface-container px-3 py-1.5 text-label-md text-md-on-surface-variant">
                  {fact}
                </li>
              ))}
          </ul>
        </div>

        <aside className="overflow-hidden rounded-md3-xl bg-md-surface-container shadow-sm lg:sticky lg:top-24 lg:row-span-2">
          <CourseThumb courseId={course.id} thumbnailKey={course.thumbnail_key} updatedAt={course.updated_at} />
          <div className="space-y-5 p-6">
            {enrolment ? (
              <div>
                <p className="text-label-md text-md-on-surface-variant">
                  {lessons.length && doneCount === lessons.length
                    ? `Finished${enrolment.completed_at ? ` ${formatDate(enrolment.completed_at)}` : ''}`
                    : `${doneCount} of ${plural(lessons.length, 'lesson')} done`}
                </p>
                <ProgressBar done={doneCount} total={lessons.length} className="mt-2" />
              </div>
            ) : null}
            <EnrolPanel course={course} viewer={viewer} live={course.live} />
            {!enrolment && previews && course.live ? (
              <p className="text-label-md text-md-on-surface-variant">
                {previews === 1 ? 'One lesson is' : `${previews} lessons are`} free to watch first. Look for Preview below.
              </p>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          {course.description ? (
            <section>
              <h2 className="text-[1.5rem] font-medium tracking-tight">About this course</h2>
              <RichText html={course.description} className="mt-4 max-w-2xl" />
            </section>
          ) : null}

          <section>
            <h2 className="text-[1.5rem] font-medium tracking-tight">What is inside</h2>
            <p className="mt-1 text-label-md text-md-on-surface-variant">
              {[plural(outline.length, 'section'), plural(lessons.length, 'lesson'), formatMinutes(minutes)].filter(Boolean).join('  ·  ')}
            </p>
            <ol className="mt-5 flex flex-col gap-4">
              {outline.map((s, i) => (
                <li key={s.id} className="rounded-md3-lg bg-md-surface-container p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-md-primary text-label-md font-bold text-md-on-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="text-title-lg leading-snug break-words">{s.title}</h3>
                      <RichText html={s.description} className="mt-1 text-md-on-surface-variant" />
                    </div>
                  </div>
                  <ol className="mt-4 flex flex-col gap-1 sm:ml-11">
                    {s.lessons.map((l) => {
                      const open = canOpen(l.is_preview);
                      const row = (
                        <>
                          {done.has(l.id) ? (
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-md-primary text-md-on-primary">
                              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Done">
                                <path d="m5.5 10.5 3 3 6-7" />
                              </svg>
                            </span>
                          ) : (
                            <KindIcon kind={l.kind} />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-body-md break-words">{l.title}</span>
                            <span className="block text-label-sm text-md-on-surface-variant">
                              {[KIND_LABEL[l.kind], formatMinutes(l.duration_minutes ?? 0)].filter(Boolean).join('  ·  ')}
                            </span>
                          </span>
                          {l.is_preview && !enrolment ? (
                            <span className="shrink-0 rounded-full bg-md-secondary-container px-3 py-1 text-label-sm font-medium text-md-on-secondary-container">
                              Preview
                            </span>
                          ) : null}
                        </>
                      );
                      return (
                        <li key={l.id}>
                          {open ? (
                            <Link
                              href={`/learn/${course.slug}/${l.id}`}
                              className="flex items-center gap-3 rounded-md3-md px-2 py-2 transition-colors duration-200 hover:bg-md-primary/5"
                            >
                              {row}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3 px-2 py-2">{row}</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-[1.5rem] font-medium tracking-tight">Your instructor</h2>
            <div className="mt-4 max-w-2xl">
              <InstructorCard
                instructor={{
                  name: course.instructor_name,
                  headline: course.instructor_headline,
                  years: course.instructor_years,
                  verifiedAt: course.instructor_verified_at,
                }}
                credentials={credentials}
                profileHref={`/instructors/${course.instructor_id}`}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
