import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/dal';
import { getOwnedCourse, isEditable } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { PriceForm } from '@/components/course/course-forms';
import { Notice } from '@/components/notice';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Pricing | Course Cavern' };

export default async function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { instructor } = await requireInstructor(`/instructor/courses/${id}/pricing`);
  if (!isUuid(id)) notFound();
  const course = await getOwnedCourse(id, instructor.id);
  if (!course) notFound();
  const editable = isEditable(course.status);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-md3-2xl bg-md-surface-container p-6 shadow-sm sm:p-8">
        <p className="text-label-md text-md-on-surface-variant">Current price</p>
        <p className="mt-1 text-[2.75rem] leading-none font-medium tracking-tight tabular-nums">
          {formatPrice(course.price_cents, course.currency)}
        </p>
        <div className="mt-8">
          {!editable ? (
            <Notice tone="info" className="mb-6">
              The price is locked while the course is {course.status === 'published' ? 'live' : 'with a reviewer'}.
            </Notice>
          ) : null}
          <PriceForm courseId={course.id} editable={editable} price={(course.price_cents / 100).toFixed(2)} />
        </div>
      </section>
      <aside className="space-y-4 text-label-md leading-relaxed text-md-on-surface-variant">
        <div className="rounded-md3-lg bg-md-secondary-container/60 p-5 text-md-on-secondary-container">
          <p className="font-medium">How the money works</p>
          <p className="mt-1 opacity-85">
            Course Cavern keeps a share of each sale and the rest is paid out to you. Payouts are being set up
            and are not switched on yet.
          </p>
        </div>
        <div className="rounded-md3-lg bg-md-surface-container p-5">
          <p className="font-medium text-md-on-surface">Setting a price</p>
          <p className="mt-1">
            Think about what a day of in-person training costs in your trade. A course that covers part of that
            is usually worth a fraction of it.
          </p>
        </div>
      </aside>
    </div>
  );
}
