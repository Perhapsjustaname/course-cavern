import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/dal';
import { countApplications } from '@/lib/applications';
import { countCourses } from '@/lib/courses';
import { AdminTabs } from '@/components/admin/admin-tabs';

/**
 * Checks admin access so a non-admin never sees this shell around a 404. Each
 * page checks again, because a layout is not re-run on every navigation.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const [apps, courses] = await Promise.all([countApplications(), countCourses()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-label-md font-medium text-md-primary">Review</p>
        <AdminTabs counts={{ applications: apps.pending ?? 0, courses: courses.in_review ?? 0 }} />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
