import { ButtonLink } from '@/components/button';
import { Card } from '@/components/card';
import { BlurField } from '@/components/blur-field';
import { getCurrentUser, homeFor } from '@/lib/dal';

const STEPS = [
  {
    n: '01',
    title: 'An instructor applies',
    body: 'They send in licences, certifications and employment records. It goes into a review queue instead of straight onto the site.',
  },
  {
    n: '02',
    title: 'A person checks it',
    body: 'A reviewer reads the evidence against what was claimed, then approves it, turns it down, or asks for more. The decision is recorded with their name on it.',
  },
  {
    n: '03',
    title: 'The badge carries weight',
    body: 'What was verified, and the date it was checked, sits on the public profile. Buyers can see the basis for it before they pay.',
  },
];

const FOR_INSTRUCTORS = [
  {
    title: 'Set your own price',
    body: 'You decide what the course is worth. The platform keeps a share of each sale.',
  },
  {
    title: 'Build it before you are approved',
    body: 'Start drafting courses while your application is in review. Nothing goes live until you are cleared.',
  },
  {
    title: 'A second look before launch',
    body: 'Each course gets reviewed before it is published, so the catalogue you are listed beside stays good.',
  },
  {
    title: 'Your record is visible',
    body: 'The credentials you proved are on your profile. Buyers stop having to take your word for it.',
  },
];

const EXAMPLE_CHECKS = [
  { what: 'Master electrician licence', from: 'Provincial licensing body' },
  { what: 'Journeyperson certificate', from: 'Trade certification board' },
  { what: 'Employment record, 14 years', from: 'Single employer, verified by letter' },
];

function ExampleProfile() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-md3-3xl bg-md-primary/10 blur-2xl"
      />
      <figure className="relative rounded-md3-2xl bg-md-background/90 p-6 shadow-lg ring-1 ring-md-outline/10 backdrop-blur-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-md-tertiary text-body-md font-bold text-md-on-tertiary">
              DW
            </span>
            <div>
              <p className="text-body-md font-medium text-md-on-surface">Dana Whitfield</p>
              <p className="text-label-md text-md-on-surface-variant">Master electrician, 22 years</p>
            </div>
          </div>
          <span className="rounded-full bg-md-surface-container-low px-2.5 py-1 text-label-sm text-md-on-surface-variant">
            Example
          </span>
        </div>

        <p className="mt-6 text-label-sm font-medium tracking-[0.06em] text-md-on-surface-variant uppercase">
          Checked by a reviewer
        </p>
        <ul className="mt-3 space-y-2.5">
          {EXAMPLE_CHECKS.map((c) => (
            <li key={c.what} className="flex gap-3 rounded-md3-md bg-md-surface-container px-4 py-3">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-md-primary">
                <circle cx="10" cy="10" r="9" className="fill-md-primary-container" />
                <path d="m6 10.2 2.6 2.6L14 7.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p className="text-label-md font-medium text-md-on-surface">{c.what}</p>
                <p className="text-label-sm text-md-on-surface-variant">{c.from}</p>
              </div>
            </li>
          ))}
        </ul>
        <figcaption className="mt-5 text-label-sm text-md-on-surface-variant">
          An illustration of what a buyer sees. Not a real instructor.
        </figcaption>
      </figure>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const primary =
    user?.role === 'admin'
      ? { href: homeFor(user), label: 'Open the review queue' }
      : user?.instructor
        ? { href: '/instructor', label: 'Go to your dashboard' }
        : { href: user ? '/apply' : '/signup?next=/apply', label: 'Apply to teach' };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      {/* Hero */}
      <section className="relative mt-6 overflow-hidden rounded-md3-2xl bg-md-surface-container px-6 py-14 shadow-sm sm:rounded-md3-3xl sm:px-12 sm:py-20 lg:px-14">
        <BlurField />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-1.5 text-label-sm font-medium tracking-[0.01em] text-md-on-secondary-container">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-md-primary" />
              Now taking instructor applications
            </span>

            <h1 className="mt-6 text-[2.5rem] leading-[1.08] font-medium tracking-tight text-md-on-background sm:text-display-lg">
              Courses from people who actually do the work
            </h1>

            <p className="mt-6 max-w-xl text-body-lg text-md-on-surface-variant">
              On most platforms anyone can upload a course, so there is no way to tell a tradesperson
              with twenty years behind them from someone who read a few articles last week. Course
              Cavern checks the instructor before they are allowed to sell anything.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href={primary.href} size="lg">
                {primary.label}
              </ButtonLink>
              <ButtonLink href="/#how-it-works" variant="outlined" size="lg">
                How the vetting works
              </ButtonLink>
            </div>
          </div>

          <ExampleProfile />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 pt-24">
        <h2 className="text-[1.75rem] font-medium tracking-tight sm:text-headline-md">
          How the vetting works
        </h2>
        <p className="mt-3 max-w-2xl text-body-md text-md-on-surface-variant">
          Three steps, one of which is a human being reading documents. That is the part the other
          platforms skip.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <Card key={step.n} interactive className="group relative">
              <div className="relative inline-grid">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-md-primary opacity-0 blur-xl transition-opacity duration-300 ease-md3 group-hover:opacity-40"
                />
                <span className="relative grid h-12 w-12 place-items-center rounded-full bg-md-primary text-label-md font-bold text-md-on-primary">
                  {step.n}
                </span>
              </div>
              <h3 className="mt-5 text-title-lg">{step.title}</h3>
              <p className="mt-2 text-body-md text-md-on-surface-variant">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* For instructors */}
      <section
        id="for-instructors"
        className="relative mt-24 scroll-mt-24 overflow-hidden rounded-md3-2xl bg-md-primary px-6 py-16 text-md-on-primary shadow-lg sm:rounded-md3-3xl sm:px-14 sm:py-20"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-20 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-[100px] rounded-tr-[20px] bg-md-tertiary/40 blur-3xl" />
        </div>

        <div className="relative">
          <h2 className="max-w-2xl text-[1.75rem] font-medium tracking-tight sm:text-headline-md">
            If you are the one who knows the trade
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg text-md-on-primary/80">
            Getting vetted takes some effort. The point is that it buys you something a free upload
            never will.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FOR_INSTRUCTORS.map((item) => (
              <div
                key={item.title}
                className="rounded-md3-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 ease-md3 hover:border-white/25 hover:bg-white/15"
              >
                <h3 className="text-title-lg">{item.title}</h3>
                <p className="mt-2 text-body-md text-md-on-primary/80">{item.body}</p>
              </div>
            ))}
          </div>

          {!user?.instructor && user?.role !== 'admin' ? (
            <div className="mt-10">
              <ButtonLink href={user ? '/apply' : '/signup?next=/apply'} variant="inverse" size="lg">
                Start your application
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
