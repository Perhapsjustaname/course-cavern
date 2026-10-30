import { cn } from '@/lib/cn';

/** A course's thumbnail at 16:9, or a placeholder when it has none. */
export function CourseThumb({
  courseId,
  thumbnailKey,
  updatedAt,
  className,
  zoomOnHover = false,
}: {
  courseId: string;
  thumbnailKey: string | null;
  updatedAt: Date;
  className?: string;
  zoomOnHover?: boolean;
}) {
  return (
    <div className={cn('relative aspect-video overflow-hidden bg-md-secondary-container/60', className)}>
      {thumbnailKey ? (
        // Plain <img>: the image optimiser fetches without cookies, so it
        // could not load a draft's thumbnail.
        <img
          src={`/api/courses/${courseId}/thumbnail?v=${new Date(updatedAt).getTime()}`}
          alt=""
          loading="lazy"
          className={cn(
            'h-full w-full object-cover',
            zoomOnHover && 'transition-transform duration-500 ease-md3 group-hover:scale-105',
          )}
        />
      ) : (
        <div aria-hidden="true" className="grid h-full w-full place-items-center text-md-on-secondary-container/50">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m21 15.5-5-4.5-8.5 8" />
          </svg>
        </div>
      )}
    </div>
  );
}
