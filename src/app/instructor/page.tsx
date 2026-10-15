import type { Metadata } from 'next';
import Link from 'next/link';
import { requireInstructor } from '@/lib/dal';
import { getApplication, getCredentials, getDecisions } from '@/lib/applications';
import { listCoursesForInstructor } from '@/lib/courses';
import { ButtonLink } from '@/components/button';
import { CourseCard } from '@/components/course-card';
import { CredentialList } from '@/components/credential-list';
import { BlurField } from '@/components/blur-field';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Your dashboard | Course Cavern' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function InstructorDashboard({ searchParams }: Props) {
  const { user, instructor } = await requireInstructor();
  const justSubmitted = (await searchParams).submitted === '1';

  const application = await getApplication(instructor.id);
  const [courses, credentials, decisions] = await Promise.all([
    listCoursesForInstructor(instructor.id),
    getCredentials(instructor.id),
    application ? getDecisions(application.id) : Promise.resolve([]),
  ]);
  const latest = decisions[0];
  const status = instructor.status;

  const panel = {
    pending: {
      tone: 'bg-md-secondary-container text-md-on-secondary-container',
      title: 'Your application is with a reviewer',
      body: `Sent ${formatDate(application?.submitted_at)}. Most are looked at within a few working days. You can draft courses while you wait; they just cannot go to review until you are approved.`,
    },
    more_info: {
      tone: 'bg-md-tertiary-container text-md-on-tertiary-container',
      title: 'A reviewer needs a bit more from you',
      body: 'Your application is paused until you answer. Their note is below.',
    },
    approved: {
      tone: 'bg-md-primary-container text-md-on-primary-container',
      title: 'You are approved to teach',
      body: 'Courses you finish can be sent for review. Once a reviewer signs one off, it goes live.',
    },
    rejected: {
      tone: 'bg-md-error-container text-md-on-error-container',
      title: 'Your application was not approved',
      body: 'The reviewer explained why below. A reviewer can reopen the decision if something was missed.',
    },
    draft: {
      tone: 'bg-md-surface-container-low text-md-on-surface',
      title: 'Your application is not finished',
      body: 'Finish it to get in the review queue.',
    },
  }[status];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-label-md font-medium text-md-primary">Instructor</p>
          <h1 className="mt-1 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">
            {instructor.displayName}
          </h1>
        </div>
        <ButtonLink href="/instructor/courses/new" size="lg">
          <span aria-hidden="true" className="text-xl leading-none">+</span>
          New course
        </ButtonLink>
      </div>

      <section className={cn('relative mt-8 overflow-hidden rounded-md3-2xl p-7 sm:p-9', panel.tone)}>
        {status === 'approved' ? <BlurField className="opacity-50" /> : null}
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-title-lg">
              {justSubmitted && status === 'pending' ? 'Application sent. It is with a reviewer now' : panel.title}
            </h2>
            <p className="mt-2 text-body-md opacity-85">{panel.body}</p>
            {latest?.note && (status === 'more_info' || status === 'rejected') ? (
              <blockquote className="mt-5 rounded-md3-md bg-md-background/60 px-5 py-4 text-body-md">
                <p className="whitespace-pre-line">{latest.note}</p>
                <footer className="mt-2 text-label-sm opacity-75">
                  {latest.admin_name}, {formatDate(latest.decided_at)}
                </footer>
              </blockquote>
            ) : null}
          </div>
          {status === 'more_info' || status === 'draft' ? (
            <ButtonLink href="/apply" size="lg" className="shrink-0">
              {status === 'more_info' ? 'Update your application' : 'Finish applying'}
            </ButtonLink>
          ) : null}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[1.75rem] font-medium tracking-tight sm:text-headline-md">Your courses</h2>
          {courses.length ? (
            <span className="text-label-md text-md-on-surface-variant">{courses.length} total</span>
          ) : null}
        </div>

        {courses.length ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} href={`/instructor/courses/${c.id}`} />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-md3-2xl bg-md-surface-container px-6 py-16 text-center">
            <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-md3-lg bg-md-secondary-container text-md-on-secondary-container">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5v-14Z" />
                <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3M8 8h7M8 11.5h5" />
              </svg>
            </span>
            <h3 className="mt-5 text-title-lg">No courses yet</h3>
            <p className="mt-2 max-w-sm text-body-md text-md-on-surface-variant">
              Start with an outline: a title, a few sections, and the lessons in each. You can fill in
              the content later.
            </p>
            <ButtonLink href="/instructor/courses/new" variant="tonal" size="lg" className="mt-6">
              Start your first course
            </ButtonLink>
          </div>
        )}
      </section>

      {credentials.length ? (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-title-lg">Documents on file</h2>
            {status === 'approved' || status === 'pending' ? null : (
              <Link href="/apply" className="text-label-md font-medium text-md-primary hover:underline">
                Add more
              </Link>
            )}
          </div>
          <div className="mt-4 max-w-3xl">
            <CredentialList credentials={credentials} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
