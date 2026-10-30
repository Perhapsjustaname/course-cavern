import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/dal';
import { countStudents, getCourseDecisions, getOutline, getOwnedCourse, isEditable, readinessChecks } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { CurriculumEditor } from '@/components/course/curriculum-editor';
import { SubmitPanel } from '@/components/course/submit-panel';
import { StatusChip } from '@/components/status-chip';
import { Notice } from '@/components/notice';
import { formatDate, formatDateTime, plural } from '@/lib/format';

export const metadata: Metadata = { title: 'Curriculum | Course Cavern' };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CurriculumPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { instructor } = await requireInstructor(`/instructor/courses/${id}`);
  if (!isUuid(id)) notFound();
  const course = await getOwnedCourse(id, instructor.id);
  if (!course) notFound();

  const [outline, decisions, students, sp] = await Promise.all([
    getOutline(id),
    getCourseDecisions(id),
    countStudents(id),
    searchParams,
  ]);
  const editable = isEditable(course.status);
  const checks = readinessChecks(course, outline, instructor.status === 'approved');
  const latest = decisions[0];

  return (
    <>
      {sp.created === '1' ? (
        <Notice tone="success" title="Course created" className="mb-8">
          Now give it some shape. Add a section for each chapter, then the lessons inside it. Open a lesson to
          upload its video, write its reading or build its quiz.
        </Notice>
      ) : null}
      {course.status === 'changes_requested' && latest?.note ? (
        <Notice tone="warning" title={`Changes requested by ${latest.admin_name}, ${formatDate(latest.decided_at)}`} className="mb-8">
          <p className="whitespace-pre-line">{latest.note}</p>
        </Notice>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Curriculum" className="min-w-0">
          <CurriculumEditor courseId={course.id} sections={outline} editable={editable} />
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <SubmitPanel
            courseId={course.id}
            status={course.status}
            checks={checks}
            submittedLabel={course.submitted_at ? `Sent ${formatDateTime(course.submitted_at)}` : undefined}
            publishedLabel={course.published_at ? `Went live ${formatDate(course.published_at)}` : undefined}
            students={students}
          />
          {course.status === 'published' ? (
            <Link
              href={`/courses/${course.slug}`}
              className="group rounded-md3-lg bg-md-surface-container px-5 py-4 transition-all duration-200 ease-md3 hover:shadow-md"
            >
              <span className="block text-label-sm text-md-on-surface-variant">{plural(students, 'student')} enrolled</span>
              <span className="block text-label-md font-medium text-md-primary group-hover:underline">See the page students see</span>
            </Link>
          ) : null}
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
    </>
  );
}
