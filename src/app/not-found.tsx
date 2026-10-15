import { ButtonLink } from '@/components/button';
import { BlurField } from '@/components/blur-field';

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <section className="relative overflow-hidden rounded-md3-2xl bg-md-surface-container px-6 py-20 text-center shadow-sm sm:rounded-md3-3xl sm:py-28">
        <BlurField />
        <div className="relative mx-auto max-w-lg">
          <p className="text-[5rem] leading-none font-medium tracking-tight text-md-primary/80 sm:text-[7rem]">404</p>
          <h1 className="mt-6 text-[1.75rem] font-medium tracking-tight sm:text-headline-md">This page is not here</h1>
          <p className="mt-3 text-body-lg text-md-on-surface-variant">
            The link may be old, or the page may have moved. Nothing you did broke anything.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" size="lg">
              Back to the start
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
