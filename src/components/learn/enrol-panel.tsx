import Link from 'next/link';
import { enrol } from '@/app/actions/learning';
import { ButtonLink } from '@/components/button';
import { SubmitButton } from '@/components/form/submit-button';
import { formatPrice } from '@/lib/format';

export type Viewer = 'signed-out' | 'student' | 'enrolled' | 'owner' | 'admin';

/** The price and the one thing to do next, for whoever is looking. */
export function EnrolPanel({
  course,
  viewer,
  live,
}: {
  course: { id: string; slug: string; price_cents: number; currency: string };
  viewer: Viewer;
  live: boolean;
}) {
  const back = `/courses/${course.slug}`;
  const free = course.price_cents === 0;

  if (viewer === 'owner') {
    return (
      <div className="space-y-3">
        <p className="text-body-md text-md-on-surface-variant">This is your course.</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/instructor/courses/${course.id}`} size="md">
            Edit course
          </ButtonLink>
          <ButtonLink href={`/learn/${course.slug}`} variant="outlined" size="md">
            View as a student
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (viewer === 'admin') {
    return (
      <ButtonLink href={`/learn/${course.slug}`} variant="tonal" size="md">
        Open the lessons
      </ButtonLink>
    );
  }
  if (viewer === 'enrolled') {
    return live ? (
      <ButtonLink href={`/learn/${course.slug}`} size="lg" className="w-full">
        Continue learning
      </ButtonLink>
    ) : (
      <p className="rounded-md3-md bg-md-tertiary-container px-4 py-3 text-body-md text-md-on-tertiary-container">
        The instructor is updating this course. Your progress is saved, and you can pick it up again once it is back.
      </p>
    );
  }
  if (!live) {
    return <p className="text-body-md text-md-on-surface-variant">Not taking new students right now.</p>;
  }

  const price = (
    <p className="text-headline-md font-medium tracking-tight text-md-on-surface">{formatPrice(course.price_cents, course.currency)}</p>
  );
  // Until checkout exists, paid courses enrol for free. Say so rather than imply a charge.
  const paymentNote = free ? null : (
    <p className="text-label-sm text-md-on-surface-variant">
      Payments are not switched on yet, so enrolling is free while the site is being tested.
    </p>
  );

  if (viewer === 'signed-out') {
    return (
      <div className="space-y-4">
        {price}
        <ButtonLink href={`/signup?next=${encodeURIComponent(back)}`} size="lg" className="w-full">
          Sign up to enrol
        </ButtonLink>
        <p className="text-label-md text-md-on-surface-variant">
          Have an account?{' '}
          <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-medium text-md-primary hover:underline">
            Sign in
          </Link>
        </p>
        {paymentNote}
      </div>
    );
  }
  return (
    <form action={enrol.bind(null, course.id)} className="space-y-4">
      {price}
      <SubmitButton size="lg" pendingLabel="Enrolling" className="w-full">
        {free ? 'Enrol for free' : 'Enrol now'}
      </SubmitButton>
      {paymentNote}
    </form>
  );
}
