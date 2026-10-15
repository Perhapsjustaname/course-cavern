import type { ReactNode } from 'react';

/** Split card for sign in and sign up: a brand panel, then the form. */
export function AuthShell({
  aside,
  title,
  intro,
  children,
}: {
  aside: ReactNode;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="grid overflow-hidden rounded-md3-2xl bg-md-surface-container shadow-sm sm:rounded-md3-3xl lg:grid-cols-[1fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-md-primary p-12 text-md-on-primary lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-12 h-96 w-96 rounded-[100px] rounded-tr-[20px] bg-md-tertiary/50 blur-3xl" />
          </div>
          <div className="relative">{aside}</div>
        </aside>

        <section className="px-6 py-10 sm:px-12 sm:py-14 lg:px-14">
          <h1 className="text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-md">
            {title}
          </h1>
          {intro ? <div className="mt-3 text-body-md text-md-on-surface-variant">{intro}</div> : null}
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </div>
  );
}

/** The numbered steps used on the brand panel. */
export function AsideSteps({ heading, steps }: { heading: string; steps: string[] }) {
  return (
    <>
      <p className="text-title-lg font-medium">{heading}</p>
      <ol className="mt-8 space-y-5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-label-md font-bold">
              {i + 1}
            </span>
            <span className="pt-1 text-body-md text-md-on-primary/85">{s}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
