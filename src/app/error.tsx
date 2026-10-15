'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/button';

/** Shown when a page throws. Most often the database is not running. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <section className="rounded-md3-2xl bg-md-error-container/60 px-6 py-16 text-center sm:rounded-md3-3xl sm:py-24">
        <div className="mx-auto max-w-lg">
          <h1 className="text-[1.75rem] font-medium tracking-tight text-md-on-error-container sm:text-headline-md">
            Something went wrong on our end
          </h1>
          <p className="mt-3 text-body-lg text-md-on-error-container/80">
            It was not something you did. Trying again usually sorts it out.
          </p>
          {error.digest ? (
            <p className="mt-4 font-mono text-label-sm text-md-on-error-container/60">Reference {error.digest}</p>
          ) : null}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => reset()}>
              Try again
            </Button>
            <ButtonLink href="/" variant="outlined" size="lg">
              Back to the start
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
