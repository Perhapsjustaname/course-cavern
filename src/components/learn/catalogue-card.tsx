import Link from 'next/link';
import { CourseThumb } from '@/components/course-thumb';
import { LEVELS } from '@/lib/constants';
import type { CatalogueCourse } from '@/lib/learning';
import { formatMinutes, formatPrice, plural } from '@/lib/format';
import { cn } from '@/lib/cn';

const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

/** Shown beside an instructor's name: their credentials were checked by a person. */
export function VerifiedTick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('h-4 w-4 shrink-0 text-md-primary', className)} role="img" aria-label="Verified">
      <circle cx="10" cy="10" r="9" className="fill-md-primary-container" />
      <path d="m6 10.2 2.6 2.6L14 7.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CatalogueCard({ course }: { course: CatalogueCourse }) {
  const meta = [course.level && LEVEL[course.level], course.industry].filter(Boolean).join('  ·  ');
  const shape = [plural(course.lesson_count, 'lesson'), formatMinutes(course.total_minutes)].filter(Boolean).join('  ·  ');

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-md3-lg bg-md-surface-container shadow-sm transition-all duration-300 ease-md3 hover:scale-[1.02] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-primary active:scale-[0.99]"
    >
      <CourseThumb courseId={course.id} thumbnailKey={course.thumbnail_key} updatedAt={course.updated_at} zoomOnHover />
      <div className="flex flex-1 flex-col p-6">
        {meta ? <p className="text-label-sm font-medium text-md-primary">{meta}</p> : null}
        <h3 className="mt-2 text-title-lg leading-snug text-md-on-surface transition-colors duration-200 group-hover:text-md-primary">
          {course.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-label-md text-md-on-surface-variant">
          <VerifiedTick />
          {course.instructor_name}
        </p>
        {course.summary ? <p className="mt-3 line-clamp-2 text-body-md text-md-on-surface-variant">{course.summary}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-6">
          <p className="text-label-sm text-md-on-surface-variant">{shape}</p>
          <p className="text-body-md font-medium whitespace-nowrap text-md-on-surface">
            {formatPrice(course.price_cents, course.currency)}
          </p>
        </div>
      </div>
    </Link>
  );
}
