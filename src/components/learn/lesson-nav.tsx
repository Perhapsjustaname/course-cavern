'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KindIcon } from '@/components/course/controls';
import { LESSON_KINDS } from '@/lib/constants';
import { formatMinutes } from '@/lib/format';
import { cn } from '@/lib/cn';

const KIND_LABEL: Record<string, string> = Object.fromEntries(LESSON_KINDS.map((k) => [k.value, k.label]));

export type NavSection = {
  id: string;
  title: string;
  lessons: { id: string; title: string; kind: string; duration_minutes: number | null; is_preview: boolean }[];
};

/** Every lesson in the course, with what is done and what is still locked. */
export function LessonNav({
  base,
  sections,
  done,
  locked,
}: {
  base: string;
  sections: NavSection[];
  done: string[];
  /** Not enrolled: only free previews open. */
  locked: boolean;
}) {
  const path = usePathname();
  const finished = new Set(done);

  return (
    <nav aria-label="Lessons" className="rounded-md3-xl bg-md-surface-container p-3 shadow-sm">
      <ol className="flex flex-col gap-4">
        {sections.map((s, i) => (
          <li key={s.id}>
            <p className="px-3 pt-2 pb-1 text-label-sm font-medium tracking-[0.02em] text-md-on-surface-variant">
              Section {i + 1}
            </p>
            <p className="px-3 pb-2 text-label-md font-medium text-md-on-surface">{s.title}</p>
            <ol className="flex flex-col gap-0.5">
              {s.lessons.map((l) => {
                const href = `${base}/${l.id}`;
                const active = path === href;
                const isDone = finished.has(l.id);
                const isLocked = locked && !l.is_preview;
                return (
                  <li key={l.id}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-start gap-3 rounded-md3-md px-3 py-2.5 transition-colors duration-200',
                        active ? 'bg-md-secondary-container text-md-on-secondary-container' : 'hover:bg-md-primary/5',
                      )}
                    >
                      {isDone ? (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-md-primary text-md-on-primary">
                          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Done">
                            <path d="m5.5 10.5 3 3 6-7" />
                          </svg>
                        </span>
                      ) : isLocked ? (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-md-surface-container-low text-md-on-surface-variant">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Locked">
                            <rect x="5" y="10.5" width="14" height="10" rx="2" />
                            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
                          </svg>
                        </span>
                      ) : (
                        <KindIcon kind={l.kind} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-label-md leading-snug break-words', active && 'font-medium')}>{l.title}</span>
                        <span className="mt-0.5 block text-label-sm text-md-on-surface-variant">
                          {[KIND_LABEL[l.kind], formatMinutes(l.duration_minutes ?? 0), locked && l.is_preview ? 'Free preview' : null]
                            .filter(Boolean)
                            .join('  ·  ')}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
