import { ButtonLink } from '@/components/button';
import { Card } from '@/components/card';
import { BlurField } from '@/components/blur-field';
import { TABLE_COUNT } from '@/lib/schema';

const STEPS = [
  {
    n: '01',
    title: 'An instructor applies',
    body: 'They submit licences, certifications and employment history. It lands in a review queue instead of going straight to publish.',
  },
  {
    n: '02',
    title: 'A person checks it',
    body: 'An administrator reads the evidence against what was claimed, then approves, rejects, or asks for more. The decision is written down with their name on it.',
  },
  {
    n: '03',
    title: 'The badge carries weight',
    body: 'What was verified, and the date it was checked, sits on the public profile. A buyer can see the basis for it before paying.',
  },
];

const FOR_INSTRUCTORS = [
  { title: 'Set your own price', body: 'You decide what the course is worth. We take a cut of each sale and nothing else.' },
  { title: 'Paid per sale', body: 'Connect a payout account once. Earnings move to your bank without you filing anything.' },
  { title: 'See where people stop', body: 'Completion rate and the exact lesson students drop off at, so you know what to fix.' },
  { title: 'Your record is visible', body: 'The credentials you proved are on your profile. Buyers stop having to take your word for it.' },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      {/* Hero */}
      <section className="relative mt-6 overflow-hidden rounded-md3-2xl bg-md-surface-container px-6 py-16 shadow-sm sm:rounded-md3-3xl sm:px-14 sm:py-24">
        <BlurField />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-1.5 text-label-sm font-medium tracking-[0.01em] text-md-on-secondary-container">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-md-primary" />
            In development
          </span>

          <h1 className="mt-6 text-[2.5rem] leading-[1.1] font-medium tracking-tight text-md-on-background sm:text-display-lg">
            Courses from people who actually do the work
          </h1>

          <p className="mt-6 max-w-2xl text-body-lg text-md-on-surface-variant">
            On most platforms anyone can upload a course, so there is no way to tell a tradesperson
            with twenty years behind them from someone who read a few articles last week. Course
            Cavern checks the instructor before they are allowed to sell anything.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/#how-it-works" size="lg">
              How the vetting works
            </ButtonLink>
            <ButtonLink href="/development" variant="outlined" size="lg">
              Development notes
            </ButtonLink>
          </div>
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
          <div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-[100px] rounded-tr-[20px] bg-md-tertiary/40 blur-3xl" />
        </div>

        <div className="relative">
          <h2 className="max-w-2xl text-[1.75rem] font-medium tracking-tight sm:text-headline-md">
            If you are the one who knows the trade
          </h2>
          <p className="mt-4 max-w-2xl text-body-lg text-md-on-primary/80">
            Getting vetted takes effort. The point is that it buys you something a free upload never
            will.
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

          <div className="mt-10">
            <ButtonLink href="/development" variant="inverse" size="lg">
              See what is built so far
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Build status */}
      <section className="mt-24">
        <Card className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-title-lg">Where this is at</h2>
            <p className="mt-2 text-body-md text-md-on-surface-variant">
              Inception is finished and the schema is designed across {TABLE_COUNT} tables. Nothing
              is wired to a database yet. The development page has the full structure and the
              decisions behind it.
            </p>
          </div>
          <ButtonLink href="/development" variant="tonal" size="lg" className="shrink-0">
            Open development
          </ButtonLink>
        </Card>
      </section>
    </div>
  );
}
