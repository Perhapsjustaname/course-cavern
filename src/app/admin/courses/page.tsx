import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/dal';
import { countCourses, listCoursesForReview, type CourseStatus } from '@/lib/courses';
import { CourseCard } from '@/components/course-card';
import { FilterTabs } from '@/components/admin/filter-tabs';
import { Notice } from '@/components/notice';

export const metadata: Metadata = { title: 'Courses | Course Cavern' };

const STATUSES = ['in_review', 'changes_requested', 'published'] as const;
const SAVED: Record<string, string> = {
  approved: 'Published. It is live now.',
  changes_requested: 'Sent back with your notes.',
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCoursesPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as CourseStatus) : null;
  const current = sp.status === 'all' ? 'all' : (status ?? 'in_review');

  const [rows, counts] = await Promise.all([
    listCoursesForReview(current === 'all' ? null : (status ?? 'in_review')),
    countCourses(),
  ]);
  const saved = typeof sp.saved === 'string' ? SAVED[sp.saved] : undefined;
  const allNonDraft = (counts.in_review ?? 0) + (counts.changes_requested ?? 0) + (counts.published ?? 0);

  return (
    <>
      <h1 className="text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">Courses</h1>
      {saved ? (
        <Notice tone="success" className="mt-6">
          {saved}
        </Notice>
      ) : null}

      <div className="mt-6">
        <FilterTabs
          base="/admin/courses"
          current={current}
          tabs={[
            { value: 'in_review', label: 'Waiting', count: counts.in_review ?? 0 },
            { value: 'changes_requested', label: 'Sent back', count: counts.changes_requested ?? 0 },
            { value: 'published', label: 'Published', count: counts.published ?? 0 },
            { value: 'all', label: 'All', count: allNonDraft },
          ]}
        />
      </div>
      <p className="mt-3 text-label-sm text-md-on-surface-variant">
        Drafts stay private to their instructor and are not listed here.
      </p>

      {rows.length ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <CourseCard key={c.id} course={c} href={`/admin/courses/${c.id}`} byline={`by ${c.instructor_name}`} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-md3-lg bg-md-surface-container px-5 py-12 text-center text-body-md text-md-on-surface-variant">
          {current === 'in_review' ? 'No courses waiting for review.' : 'No courses here.'}
        </p>
      )}
    </>
  );
}
