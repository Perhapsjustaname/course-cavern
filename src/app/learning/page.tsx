import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/dal';
import { listMyLearning, type LearningRow } from '@/lib/learning';
import { formatDate, plural, relativeDays } from '@/lib/format';
import { ButtonLink } from '@/components/button';
import { CourseThumb } from '@/components/course-thumb';
import { ProgressBar } from '@/components/learn/progress-bar';

export const metadata: Metadata = { title: 'My learning | Course Cavern' };

export default async function MyLearningPage() {
  const user = await requireUser('/learning');
  const rows = await listMyLearning(user.id);
  const finished = (r: LearningRow) => r.lesson_count > 0 && r.done_count >= r.lesson_count;
  const going = rows.filter((r) => !finished(r));
  const done = rows.filter(finished);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-label-md font-medium text-md-primary">My learning</p>
          <h1 className="mt-1 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">
            Hi {user.name.split(' ')[0]}
          </h1>
        </div>
        <ButtonLink href="/courses" variant="tonal" size="lg">
          Browse courses
        </ButtonLink>
      </div>

      {rows.length ? (
        <>
          <section className="mt-10">
            <h2 className="text-title-lg">In progress</h2>
            {going.length ? (
              <ul className="mt-4 flex flex-col gap-4">
                {going.map((r) => (
                  <LearningCard key={r.enrolment_id} row={r} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-body-md text-md-on-surface-variant">Nothing on the go. Everything you started is finished.</p>
            )}
          </section>
          {done.length ? (
            <section className="mt-12">
              <h2 className="text-title-lg">Finished</h2>
              <ul className="mt-4 flex flex-col gap-4">
                {done.map((r) => (
                  <LearningCard key={r.enrolment_id} row={r} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-md3-2xl bg-md-surface-container px-6 py-16 text-center">
          <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-md3-lg bg-md-secondary-container text-md-on-secondary-container">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5v-14Z" />
              <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3M8 8h7M8 11.5h5" />
            </svg>
          </span>
          <h2 className="mt-5 text-title-lg">You have not enrolled in anything yet</h2>
          <p className="mt-2 max-w-sm text-body-md text-md-on-surface-variant">
            Find a course, try its free preview lessons, then enrol. Your progress is saved as you go.
          </p>
          <ButtonLink href="/courses" size="lg" className="mt-6">
            Browse courses
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function LearningCard({ row }: { row: LearningRow }) {
  const complete = row.lesson_count > 0 && row.done_count >= row.lesson_count;
  return (
    <li className="overflow-hidden rounded-md3-lg bg-md-surface-container shadow-sm sm:flex">
      <Link href={`/courses/${row.slug}`} className="block shrink-0 sm:w-56" tabIndex={-1} aria-hidden="true">
        {/* Side by side, the image fills its slot. At 16:9 it would be wider than the slot and run under the title. */}
        <CourseThumb
          courseId={row.course_id}
          thumbnailKey={row.thumbnail_key}
          updatedAt={row.updated_at}
          className="h-full w-full sm:aspect-auto"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-title-lg leading-snug break-words">
            <Link href={`/courses/${row.slug}`} className="hover:text-md-primary">
              {row.title}
            </Link>
          </h3>
          <p className="text-label-md text-md-on-surface-variant">{row.instructor_name}</p>
          {row.live ? (
            <>
              <ProgressBar done={row.done_count} total={row.lesson_count} className="mt-4 max-w-sm" />
              <p className="mt-2 text-label-sm text-md-on-surface-variant">
                {complete
                  ? `All ${plural(row.lesson_count, 'lesson')} done${row.completed_at ? `, finished ${formatDate(row.completed_at)}` : ''}`
                  : `${row.done_count} of ${plural(row.lesson_count, 'lesson')} done  ·  last opened ${relativeDays(row.last_active_at)}`}
              </p>
              {!complete && row.last_lesson_title ? (
                <p className="mt-1 truncate text-label-sm text-md-on-surface-variant">Up to: {row.last_lesson_title}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 inline-block rounded-full bg-md-tertiary-container px-3 py-1 text-label-sm font-medium text-md-on-tertiary-container">
              Being updated by the instructor
            </p>
          )}
        </div>
        {row.live ? (
          <ButtonLink href={`/learn/${row.slug}`} variant={complete ? 'outlined' : 'filled'} size="md" className="shrink-0 self-start sm:self-center">
            {complete ? 'Look back through it' : row.done_count ? 'Continue' : 'Start'}
          </ButtonLink>
        ) : null}
      </div>
    </li>
  );
}
