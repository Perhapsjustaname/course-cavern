import Link from 'next/link';
import { ButtonLink } from '@/components/button';
import { UserMenu } from '@/components/user-menu';
import { getCurrentUser, type CurrentUser } from '@/lib/dal';

const NAV_LINK =
  'rounded-full px-4 py-2 text-label-md font-medium whitespace-nowrap text-md-on-surface-variant ' +
  'transition-all duration-300 ease-md3 hover:bg-md-primary/10 hover:text-md-primary';

function navFor(user: CurrentUser | null) {
  const links = [{ href: '/courses', label: 'Browse courses' }];
  if (user?.role === 'admin') links.push({ href: '/admin', label: 'Review queue' });
  else if (user?.instructor) links.push({ href: '/instructor', label: 'My courses' });
  else if (user) links.push({ href: '/learning', label: 'My learning' });
  if (!user) links.push({ href: '/#how-it-works', label: 'How it works' });
  if (!user?.instructor && user?.role !== 'admin') links.push({ href: '/#for-instructors', label: 'For instructors' });
  return links;
}

function menuFor(user: CurrentUser) {
  // Anyone can enrol in a course, so everyone gets My learning.
  const shared = [
    { href: '/learning', label: 'My learning' },
    { href: '/account', label: 'Account settings' },
  ];
  if (user.role === 'admin') {
    return [
      { href: '/admin', label: 'Review queue' },
      { href: '/admin/applications', label: 'Applications' },
      { href: '/admin/courses', label: 'Courses' },
      ...shared,
    ];
  }
  if (user.instructor) {
    return [
      { href: '/instructor', label: 'Teaching dashboard' },
      { href: '/instructor/courses/new', label: 'New course' },
      ...shared,
    ];
  }
  return [...shared, { href: '/apply', label: 'Apply to teach' }];
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const nav = navFor(user);

  return (
    <header className="sticky top-0 z-50 border-b border-md-outline/15 bg-md-background/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-full text-title-lg font-medium whitespace-nowrap tracking-tight text-md-on-background transition-opacity duration-200 hover:opacity-80"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md3-sm bg-md-primary text-label-md font-bold text-md-on-primary"
            >
              CC
            </span>
            Course Cavern
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={NAV_LINK}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <UserMenu name={user.name} email={user.email} items={menuFor(user)} />
            ) : (
              <>
                <ButtonLink href="/login" variant="text" size="sm">
                  Sign in
                </ButtonLink>
                {/* Wrapped, not styled directly: `hidden` on the button would
                    lose to its own `inline-flex` base. */}
                <div className="hidden sm:block">
                  <ButtonLink href="/signup" size="sm">
                    Create account
                  </ButtonLink>
                </div>
              </>
            )}
          </div>
        </div>

        <nav
          aria-label="Main"
          className="-mx-1 flex items-center gap-1 overflow-x-auto pb-3 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={NAV_LINK}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
