import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';
import { countApplications, listApplications } from '@/lib/applications';
import { countCourses, listCoursesForReview } from '@/lib/courses';
import { ApplicantRow } from '@/components/admin/applicant-row';
import { CourseCard } from '@/components/course-card';
import { BlurField } from '@/components/blur-field';
import { relativeDays } from '@/lib/format';

export const metadata: Metadata = { title: 'Review queue | Course Cavern' };

function Stat({ href, n, label, sub, tone }: { href: string; n: number; label: string; sub: string; tone: 'primary' | 'tonal' }) {
  return (
    <Link
      href={href}
      className={
        tone === 'primary'
          ? 'group relative overflow-hidden rounded-md3-2xl bg-md-primary p-7 text-md-on-primary shadow-lg transition-all duration-300 ease-md3 hover:scale-[1.02] hover:shadow-xl'
          : 'group relative overflow-hidden rounded-md3-2xl bg-md-secondary-container p-7 text-md-on-secondary-container shadow-sm transition-all duration-300 ease-md3 hover:scale-[1.02] hover:shadow-md'
      }
    >
      {tone === 'primary' ? <BlurField className="opacity-50" /> : null}
      <div className="relative">
        <p className="text-[3.5rem] leading-none font-medium tracking-tight tabular-nums">{n}</p>
        <p className="mt-3 text-title-lg">{label}</p>
        <p className="mt-1 text-label-md opacity-80">{sub}</p>
      </div>
    </Link>
  );
}

export default async function AdminOverview() {
  await requireAdmin();
  const [apps, courses, pending, inReview] = await Promise.all([
    countApplications(),
    countCourses(),
    listApplications('pending'),
    listCoursesForReview('in_review'),
  ]);
  const oldestApp = pending[0];
  const oldestCourse = inReview[0];

  return (
    <>
      <h1 className="text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">Review queue</h1>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Stat
          href="/admin/applications"
          n={apps.pending ?? 0}
          label={(apps.pending ?? 0) === 1 ? 'Application waiting' : 'Applications waiting'}
          sub={oldestApp ? `Oldest sent ${relativeDays(oldestApp.submitted_at)}` : 'Nothing waiting'}
          tone="primary"
        />
        <Stat
          href="/admin/courses"
          n={courses.in_review ?? 0}
          label={(courses.in_review ?? 0) === 1 ? 'Course waiting' : 'Courses waiting'}
          sub={oldestCourse?.submitted_at ? `Oldest sent ${relativeDays(oldestCourse.submitted_at)}` : 'Nothing waiting'}
          tone="tonal"
        />
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-title-lg">Waiting longest</h2>
            <Link href="/admin/applications" className="text-label-md font-medium text-md-primary hover:underline">
              All applications
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {pending.length ? (
              pending.slice(0, 4).map((r) => <ApplicantRow key={r.id} row={r} />)
            ) : (
              <p className="rounded-md3-lg bg-md-surface-container px-5 py-8 text-center text-body-md text-md-on-surface-variant">
                No applications waiting.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-title-lg">Courses to review</h2>
            <Link href="/admin/courses" className="text-label-md font-medium text-md-primary hover:underline">
              All courses
            </Link>
          </div>
          <div className="mt-4 grid gap-4">
            {inReview.length ? (
              inReview.slice(0, 3).map((c) => (
                <CourseCard key={c.id} course={c} href={`/admin/courses/${c.id}`} byline={`by ${c.instructor_name}`} />
              ))
            ) : (
              <p className="rounded-md3-lg bg-md-surface-container px-5 py-8 text-center text-body-md text-md-on-surface-variant">
                No courses waiting.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
