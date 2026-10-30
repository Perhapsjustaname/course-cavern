import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/dal';
import { getOutline } from '@/lib/courses';
import { getCourseBySlug, getDoneLessonIds, getEnrolment, isStaff } from '@/lib/learning';
import { formatDate } from '@/lib/format';
import { LessonNav } from '@/components/learn/lesson-nav';
import { ProgressBar } from '@/components/learn/progress-bar';

type Props = { children: ReactNode; params: Promise<{ slug: string }> };

export default async function LearnLayout({ children, params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getCurrentUser();
  const staff = isStaff(course, user);
  const enrolment = user ? await getEnrolment(user.id, course.id) : null;
  // Free previews are open to anyone while the course is live. The pages
  // below check each lesson again; this only decides whether to show the shell.
  if (!course.live && !staff && !enrolment) notFound();

  const [outline, done] = await Promise.all([
    getOutline(course.id),
    enrolment ? getDoneLessonIds(enrolment.id) : Promise.resolve(new Set<string>()),
  ]);
  const lessons = outline.flatMap((s) => s.lessons);
  const doneCount = lessons.filter((l) => done.has(l.id)).length;
  const finished = lessons.length > 0 && doneCount === lessons.length;

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <Link href={`/courses/${slug}`} className="inline-flex items-center gap-1 rounded-full text-label-md font-medium text-md-primary hover:underline">
            <span aria-hidden="true">←</span> Course page
          </Link>
          <p className="mt-2 text-title-lg leading-snug break-words">{course.title}</p>
        </div>
        {enrolment ? (
          <div className="w-full sm:w-72">
            <p className="text-label-md text-md-on-surface-variant">
              {finished
                ? `Finished${enrolment.completed_at ? ` ${formatDate(enrolment.completed_at)}` : ''}`
                : `${doneCount} of ${lessons.length} lessons done`}
            </p>
            <ProgressBar done={doneCount} total={lessons.length} className="mt-2" />
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <div className="order-last lg:sticky lg:top-24 lg:order-none lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:rounded-md3-xl">
          <LessonNav
            base={`/learn/${slug}`}
            sections={outline.map((s) => ({
              id: s.id,
              title: s.title,
              lessons: s.lessons.map((l) => ({
                id: l.id,
                title: l.title,
                kind: l.kind,
                duration_minutes: l.duration_minutes,
                is_preview: l.is_preview,
              })),
            }))}
            done={[...done]}
            locked={!enrolment && !staff}
          />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
