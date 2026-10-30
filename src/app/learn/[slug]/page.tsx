import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/dal';
import { getOutline } from '@/lib/courses';
import { getCourseBySlug, getDoneLessonIds, getEnrolment, isStaff } from '@/lib/learning';

type Props = { params: Promise<{ slug: string }> };

/** "Continue": straight back to the lesson they were on, or the first one not done. */
export default async function ResumePage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getCurrentUser();
  const staff = isStaff(course, user);
  const enrolment = user ? await getEnrolment(user.id, course.id) : null;
  if (!enrolment && !staff) redirect(`/courses/${slug}`);

  const lessons = (await getOutline(course.id)).flatMap((s) => s.lessons);
  if (!lessons.length) {
    return (
      <p className="rounded-md3-xl bg-md-surface-container px-6 py-12 text-center text-body-md text-md-on-surface-variant">
        This course has no lessons yet.
      </p>
    );
  }
  let target = lessons[0]!;
  if (enrolment) {
    const done = await getDoneLessonIds(enrolment.id);
    target =
      lessons.find((l) => l.id === enrolment.last_lesson_id) ?? lessons.find((l) => !done.has(l.id)) ?? lessons[0]!;
  }
  redirect(`/learn/${slug}/${target.id}`);
}
