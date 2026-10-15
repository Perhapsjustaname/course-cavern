import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/dal';
import { getCourseDecisions, getOutline, getOwnedCourse, isEditable } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { CourseDetailsForm } from '@/components/course/course-details-form';
import { OutlineEditor } from '@/components/course/outline-editor';
import { SubmitPanel } from '@/components/course/submit-panel';
import { ConfirmDelete } from '@/components/course/controls';
import { deleteCourse } from '@/app/actions/courses';
import { StatusChip } from '@/components/status-chip';
import { Notice } from '@/components/notice';
import { formatDate, formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Edit course | Course Cavern' };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CourseEditorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { instructor } = await requireInstructor(`/instructor/courses/${id}`);
  if (!isUuid(id)) notFound();

  const course = await getOwnedCourse(id, instructor.id);
  if (!course) notFound();

  const [outline, decisions, sp] = await Promise.all([getOutline(id), getCourseDecisions(id), searchParams]);
  const editable = isEditable(course.status);
  const latest = decisions[0];

  const lessonCount = outline.reduce((n, s) => n + s.lessons.length, 0);
  const checks = [
    { label: 'Title, summary, industry and level filled in', done: Boolean(course.summary && course.industry && course.level) },
    { label: 'At least one section', done: outline.length > 0, hint: 'Add one in the outline.' },
    {
      label: 'A lesson in every section',
      done: outline.length > 0 && outline.every((s) => s.lessons.length > 0),
      hint: lessonCount ? 'Fill or remove the empty sections.' : 'Add lessons to your sections.',
    },
    {
      label: 'Your application is approved',
      done: instructor.status === 'approved',
      hint: 'Still with a reviewer. You can keep building meanwhile.',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Link
        href="/instructor"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary transition-colors duration-200 hover:bg-md-primary/10"
      >
        <span aria-hidden="true">←</span> Your courses
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="max-w-3xl text-[2rem] leading-tight font-medium tracking-tight break-words sm:text-headline-lg">
          {course.title}
        </h1>
        <StatusChip status={course.status} className="mt-2" />
      </div>

      {sp.created === '1' ? (
        <Notice tone="success" title="Course created" className="mt-6">
          Now give it some shape. Add a section for each chapter, then the lessons inside it.
        </Notice>
      ) : null}

      {course.status === 'changes_requested' && latest?.note ? (
        <Notice tone="warning" title={`Changes requested by ${latest.admin_name}, ${formatDate(latest.decided_at)}`} className="mt-6">
          <p className="whitespace-pre-line">{latest.note}</p>
        </Notice>
      ) : null}

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="rounded-md3-2xl bg-md-surface-container-low/50 p-5 sm:p-7">
            <h2 className="text-[1.5rem] font-medium tracking-tight">Outline</h2>
            <div className="mt-2">
              <OutlineEditor courseId={course.id} sections={outline} editable={editable} />
            </div>
          </section>

          <section className="rounded-md3-2xl bg-md-surface-container p-5 shadow-sm sm:p-7">
            <h2 className="text-[1.5rem] font-medium tracking-tight">Details</h2>
            <div className="mt-6">
              <CourseDetailsForm
                courseId={course.id}
                editable={editable}
                defaults={{
                  title: course.title,
                  summary: course.summary ?? '',
                  description: course.description ?? '',
                  industry: course.industry ?? '',
                  level: course.level ?? '',
                  price: (course.price_cents / 100).toFixed(2),
                }}
              />
            </div>
          </section>

          {editable ? (
            <section className="flex flex-col gap-4 rounded-md3-lg border border-md-error/20 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-body-md font-medium">Delete this course</p>
                <p className="text-label-md text-md-on-surface-variant">The outline and details go with it. This cannot be undone.</p>
              </div>
              <ConfirmDelete action={deleteCourse.bind(null, course.id)} what="course" />
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <SubmitPanel
            courseId={course.id}
            status={course.status}
            checks={checks}
            submittedLabel={course.submitted_at ? `Sent ${formatDateTime(course.submitted_at)}` : undefined}
            publishedLabel={course.published_at ? `Went live ${formatDate(course.published_at)}` : undefined}
          />

          {decisions.length ? (
            <div className="rounded-md3-lg bg-md-surface-container p-6">
              <p className="text-title-lg">Review history</p>
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
    </div>
  );
}
