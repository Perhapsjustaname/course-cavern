import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import { queryOne } from '@/lib/db';
import { getCourse, getCourseDecisions, getOutline, getQuizzesForCourse } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { CourseContent } from '@/components/course/course-content';
import { RichText } from '@/components/rich-text';
import { DecisionForm } from '@/components/admin/decision-form';
import { StatusChip } from '@/components/status-chip';
import { LEVELS } from '@/lib/constants';
import { formatDateTime, formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Review course | Course Cavern' };

const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

export default async function ReviewCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const course = await getCourse(id);
  // Drafts are private to their instructor, admins included.
  if (!course || course.status === 'draft') notFound();

  const [outline, decisions, quizzes, instructor] = await Promise.all([
    getOutline(id),
    getCourseDecisions(id),
    getQuizzesForCourse(id),
    queryOne<{ display_name: string; headline: string | null; status: string; application_id: string | null }>(
      `SELECT p.display_name, p.headline, p.status, a.id AS application_id
         FROM instructor_profile p LEFT JOIN application a ON a.instructor_id = p.id
        WHERE p.id = $1`,
      [course.instructor_id],
    ),
  ]);

  return (
    <>
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary transition-colors duration-200 hover:bg-md-primary/10"
      >
        <span aria-hidden="true">←</span> Courses
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[2rem] leading-tight font-medium tracking-tight break-words sm:text-headline-lg">{course.title}</h1>
          {instructor ? (
            <p className="mt-2 text-body-lg text-md-on-surface-variant">
              by{' '}
              {instructor.application_id ? (
                <Link href={`/admin/applications/${instructor.application_id}`} className="font-medium text-md-primary hover:underline">
                  {instructor.display_name}
                </Link>
              ) : (
                instructor.display_name
              )}
              {instructor.headline ? `, ${instructor.headline}` : ''}
            </p>
          ) : null}
        </div>
        <StatusChip status={course.status} className="mt-2" />
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="overflow-hidden rounded-md3-2xl bg-md-surface-container shadow-sm">
            {course.thumbnail_key ? (
              // Plain <img>: the image optimiser fetches without the viewer's
              // cookies, so it could not load a private draft thumbnail.
              <img
                src={`/api/courses/${course.id}/thumbnail?v=${new Date(course.updated_at).getTime()}`}
                alt=""
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="grid aspect-video w-full place-items-center bg-md-error-container/50 text-label-md text-md-on-error-container">
                No thumbnail
              </div>
            )}
            <div className="p-6 sm:p-8">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
                <div>
                  <dt className="text-label-sm text-md-on-surface-variant">Industry</dt>
                  <dd className="text-body-md">{course.industry}</dd>
                </div>
                <div>
                  <dt className="text-label-sm text-md-on-surface-variant">Level</dt>
                  <dd className="text-body-md">{course.level ? LEVEL[course.level] : 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-label-sm text-md-on-surface-variant">Price</dt>
                  <dd className="text-body-md">{formatPrice(course.price_cents, course.currency)}</dd>
                </div>
              </dl>
              <h2 className="mt-8 text-label-md font-medium text-md-on-surface-variant">Summary</h2>
              <p className="mt-2 text-body-md leading-relaxed">{course.summary}</p>
              {course.description ? (
                <>
                  <h2 className="mt-6 text-label-md font-medium text-md-on-surface-variant">Description</h2>
                  <RichText html={course.description} className="mt-2" />
                </>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-[1.5rem] font-medium tracking-tight">Content</h2>
            <p className="mt-1 text-label-md text-md-on-surface-variant">
              Open a lesson to play its media, read it, or see the quiz with its answers marked.
            </p>
            <div className="mt-4">
              <CourseContent sections={outline} quizzes={quizzes} />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          {course.status === 'in_review' ? (
            <div className="rounded-md3-2xl bg-md-surface-container p-6 shadow-sm">
              <h2 className="text-title-lg">Your decision</h2>
              {course.submitted_at ? (
                <p className="mt-1 text-label-md text-md-on-surface-variant">Sent {formatDateTime(course.submitted_at)}</p>
              ) : null}
              <div className="mt-5">
                <DecisionForm kind="course" id={course.id} />
              </div>
            </div>
          ) : (
            <div className="rounded-md3-lg bg-md-surface-container p-6 text-body-md text-md-on-surface-variant">
              {course.status === 'published'
                ? 'Published. It is locked, so students get what was reviewed.'
                : 'Sent back to the instructor. It returns here when they resubmit.'}
            </div>
          )}

          {decisions.length ? (
            <div className="rounded-md3-lg bg-md-surface-container p-6">
              <p className="text-title-lg">History</p>
              <ol className="mt-4 space-y-4">
                {decisions.map((d) => (
                  <li key={d.id} className="border-l-2 border-md-outline/20 pl-4">
                    <StatusChip status={d.decision === 'approved' ? 'published' : 'changes_requested'} />
                    <p className="mt-1.5 text-label-sm text-md-on-surface-variant">
                      {d.admin_name}, {formatDateTime(d.decided_at)}
                    </p>
                    {d.note ? <p className="mt-1 text-label-md whitespace-pre-line">{d.note}</p> : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
