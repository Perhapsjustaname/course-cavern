import type { Metadata } from 'next';
import Link from 'next/link';
import { requireInstructor } from '@/lib/dal';
import { NewCourseForm } from '@/components/course/course-forms';

export const metadata: Metadata = { title: 'New course | Course Cavern' };

export default async function NewCoursePage() {
  const { instructor } = await requireInstructor('/instructor/courses/new');

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Link
        href="/instructor"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary transition-colors duration-200 hover:bg-md-primary/10"
      >
        <span aria-hidden="true">←</span> Your courses
      </Link>

      <h1 className="mt-4 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">New course</h1>
      <p className="mt-3 max-w-2xl text-body-lg text-md-on-surface-variant">
        Start with the basics. You will build the outline on the next screen, and all of it can
        change until you send it for review.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="rounded-md3-2xl bg-md-surface-container p-6 shadow-sm sm:p-8">
          <NewCourseForm />
        </div>
        <aside className="space-y-4 text-label-md leading-relaxed text-md-on-surface-variant">
          {instructor.status !== 'approved' ? (
            <div className="rounded-md3-lg bg-md-secondary-container/60 p-5 text-md-on-secondary-container">
              <p className="font-medium">Your application is still being reviewed</p>
              <p className="mt-1 opacity-85">
                Build as much as you like now. Sending a course for review unlocks once you are approved.
              </p>
            </div>
          ) : null}
          <div className="rounded-md3-lg bg-md-surface-container p-5">
            <p className="font-medium text-md-on-surface">On pricing</p>
            <p className="mt-1">
              Look at what a day of in-person training costs in your trade. A course that replaces part
              of that is usually worth a fraction of it.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
