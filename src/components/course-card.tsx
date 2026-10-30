import Link from "next/link";
import { StatusChip } from "@/components/status-chip";
import { LEVELS } from "@/lib/constants";
import type { CourseCard as Row } from "@/lib/courses";
import { formatMinutes, formatPrice, plural, relativeDays } from "@/lib/format";

const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

export function CourseCard({
  course,
  href,
  byline,
}: {
  course: Row;
  href: string;
  byline?: string;
}) {
  const meta = [course.level && LEVEL[course.level], course.industry]
    .filter(Boolean)
    .join("  ·  ");
  const shape = [
    plural(course.section_count, "section"),
    plural(course.lesson_count, "lesson"),
    formatMinutes(course.total_minutes),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-md3-lg bg-md-surface-container shadow-sm transition-all duration-300 ease-md3 hover:scale-[1.02] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-primary active:scale-[0.99]"
    >
      <div className="relative aspect-video overflow-hidden bg-md-secondary-container/60">
        {course.thumbnail_key ? (
          // Plain <img>: the image optimiser fetches without cookies, so it
          // could not load a draft's thumbnail.
          <img
            src={`/api/courses/${course.id}/thumbnail?v=${new Date(course.updated_at).getTime()}`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-md3 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center text-md-on-secondary-container/50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="m21 15.5-5-4.5-8.5 8" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <StatusChip status={course.status} />
          <span className="text-label-md font-medium text-md-on-surface-variant">
            {formatPrice(course.price_cents, course.currency)}
          </span>
        </div>
        <h3 className="mt-4 text-title-lg leading-snug text-md-on-surface transition-colors duration-200 group-hover:text-md-primary">
          {course.title}
        </h3>
        {byline ? (
          <p className="mt-1 text-label-md text-md-on-surface-variant">
            {byline}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-2 text-label-md text-md-on-surface-variant">
            {meta}
          </p>
        ) : null}
        <div className="mt-auto pt-6">
          <p className="text-label-sm text-md-on-surface-variant">{shape}</p>
          <p className="mt-1 text-label-sm text-md-on-surface-variant/80">
            Updated {relativeDays(course.updated_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}
