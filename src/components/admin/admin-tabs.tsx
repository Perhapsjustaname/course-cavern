'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export function AdminTabs({ counts }: { counts: { applications: number; courses: number } }) {
  const path = usePathname();
  const tabs = [
    { href: '/admin', label: 'Overview', active: path === '/admin' },
    { href: '/admin/applications', label: 'Applications', count: counts.applications, active: path.startsWith('/admin/applications') },
    { href: '/admin/courses', label: 'Courses', count: counts.courses, active: path.startsWith('/admin/courses') },
  ];
  return (
    <nav aria-label="Admin" className="inline-flex gap-1 rounded-full bg-md-surface-container p-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-md font-medium transition-all duration-200 ease-md3 active:scale-95',
            t.active
              ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm'
              : 'text-md-on-surface-variant hover:bg-md-primary/10 hover:text-md-primary',
          )}
        >
          {t.label}
          {t.count ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-md-primary px-1.5 text-[0.7rem] font-bold text-md-on-primary">
              {t.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
