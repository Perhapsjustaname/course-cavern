import Link from 'next/link';
import { getCurrentUser } from '@/lib/dal';

export async function SiteFooter() {
  // Memoised per render, so the header and footer share one lookup.
  const user = await getCurrentUser();
  const showApply = !user || (user.role !== 'admin' && !user.instructor);

  return (
    <footer className="mt-24 border-t border-md-outline/15">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-10 text-label-md text-md-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Course Cavern. Built by team HARM.</p>
        {showApply ? (
          <Link
            href={user ? '/apply' : '/signup?next=/apply'}
            className="rounded-full text-md-primary transition-opacity duration-200 hover:opacity-70"
          >
            Apply to teach
          </Link>
        ) : null}
      </div>
    </footer>
  );
}
