'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/** MD3 primary tabs. Each tab is a real URL, so back and refresh behave. */
export function CourseTabs({ courseId }: { courseId: string }) {
  const path = usePathname();
  const base = `/instructor/courses/${courseId}`;
  const tabs = [
    { href: base, label: 'Curriculum', active: path === base || path.startsWith(`${base}/lessons`) },
    { href: `${base}/details`, label: 'Details', active: path === `${base}/details` },
    { href: `${base}/pricing`, label: 'Pricing', active: path === `${base}/pricing` },
  ];
  return (
    <nav aria-label="Course" className="-mx-1 flex overflow-x-auto border-b border-md-outline/15 [scrollbar-width:none]">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'relative shrink-0 rounded-t-md3-xs px-5 py-3.5 text-label-md font-medium whitespace-nowrap transition-colors duration-200 ease-md3 hover:bg-md-primary/5',
            t.active ? 'text-md-primary' : 'text-md-on-surface-variant hover:text-md-on-surface',
          )}
        >
          {t.label}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-md-primary transition-transform duration-300 ease-md3',
              t.active ? 'scale-x-100' : 'scale-x-0',
            )}
          />
        </Link>
      ))}
    </nav>
  );
}
