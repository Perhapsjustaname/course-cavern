import Link from 'next/link';
import { ButtonLink } from '@/components/button';

const NAV = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#for-instructors', label: 'For instructors' },
  { href: '/development', label: 'Development' },
];

const NAV_LINK =
  'rounded-full px-4 py-2 text-label-md font-medium whitespace-nowrap text-md-on-surface-variant ' +
  'transition-all duration-300 ease-md3 hover:bg-md-primary/10 hover:text-md-primary';

export function SiteHeader() {
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
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={NAV_LINK}>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Wrapped rather than styled directly: a `hidden` class on the button
              itself collides with its own `inline-flex` base. */}
          <div className="hidden sm:block">
            <ButtonLink href="/#for-instructors" size="sm">
              Apply to teach
            </ButtonLink>
          </div>
        </div>

        {/* Phones get the same links on their own row instead of losing the nav. */}
        <nav
          aria-label="Main"
          className="-mx-1 flex items-center gap-1 overflow-x-auto pb-3 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={NAV_LINK}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
