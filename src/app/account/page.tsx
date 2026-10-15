import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/dal';
import { queryOne } from '@/lib/db';
import { ButtonLink } from '@/components/button';
import { Card } from '@/components/card';
import { BlurField } from '@/components/blur-field';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Your account | Course Cavern' };

export default async function AccountPage() {
  const user = await requireUser('/account');
  if (user.role === 'admin') redirect('/admin');
  if (user.instructor) redirect('/instructor');

  const since = await queryOne<{ created_at: Date }>('SELECT created_at FROM users WHERE id = $1', [user.id]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">
        Hi {user.name.split(' ')[0]}
      </h1>
      <p className="mt-3 text-body-lg text-md-on-surface-variant">
        There is nothing to browse yet. The catalogue opens once the first instructors are approved.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="text-title-lg">Account</h2>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-label-sm text-md-on-surface-variant">Name</dt>
              <dd className="text-body-md">{user.name}</dd>
            </div>
            <div>
              <dt className="text-label-sm text-md-on-surface-variant">Email</dt>
              <dd className="text-body-md break-all">{user.email}</dd>
            </div>
            {since ? (
              <div>
                <dt className="text-label-sm text-md-on-surface-variant">Member since</dt>
                <dd className="text-body-md">{formatDate(since.created_at)}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <section className="relative overflow-hidden rounded-md3-2xl bg-md-primary p-8 text-md-on-primary shadow-lg sm:p-10">
          <BlurField className="opacity-60" />
          <div className="relative">
            <h2 className="text-title-lg">Know a trade well enough to teach it?</h2>
            <p className="mt-3 max-w-md text-body-md text-md-on-primary/85">
              Send in your licences or certificates and a reviewer will look them over. You can
              start building a course while you wait.
            </p>
            <ButtonLink href="/apply" variant="inverse" size="lg" className="mt-8">
              Apply to teach
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
