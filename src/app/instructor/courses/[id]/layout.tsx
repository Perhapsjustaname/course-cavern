import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/dal';
import { getOwnedCourse } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { CourseTabs } from '@/components/course/course-tabs';
import { StatusChip } from '@/components/status-chip';

/**
 * Shared frame for every course editor page. Checks ownership itself so no
 * page under it can forget to; each page still checks again, since a layout
 * is not re-run on every navigation.
 */
export default async function CourseEditorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { instructor } = await requireInstructor(`/instructor/courses/${id}`);
  if (!isUuid(id)) notFound();
  const course = await getOwnedCourse(id, instructor.id);
  if (!course) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href="/instructor"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary transition-colors duration-200 hover:bg-md-primary/10"
      >
        <span aria-hidden="true">←</span> Your courses
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <h1 className="max-w-3xl text-[1.75rem] leading-tight font-medium tracking-tight break-words sm:text-headline-md">
          {course.title}
        </h1>
        <StatusChip status={course.status} className="mt-1.5" />
      </div>
      <div className="mt-6">
        <CourseTabs courseId={course.id} />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
