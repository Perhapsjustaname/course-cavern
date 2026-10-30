import type { Metadata } from 'next';
import { requireUser } from '@/lib/dal';
import { queryOne } from '@/lib/db';
import { ButtonLink } from '@/components/button';
import { Card } from '@/components/card';
import { BlurField } from '@/components/blur-field';
import { NameForm, PasswordForm } from '@/components/account/account-forms';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Account settings | Course Cavern' };

export default async function AccountPage() {
  const user = await requireUser('/account');
  const since = await queryOne<{ created_at: Date }>('SELECT created_at FROM users WHERE id = $1', [user.id]);
  const canApply = !user.instructor && user.role !== 'admin';

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="text-label-md font-medium text-md-primary">Account</p>
      <h1 className="mt-1 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">Account settings</h1>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-title-lg">Your details</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
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
          <div className="mt-6">
            <NameForm name={user.name} />
          </div>
        </Card>

        <Card>
          <h2 className="text-title-lg">Password</h2>
          <p className="mt-1 text-body-md text-md-on-surface-variant">You will need your current one to set a new one.</p>
          <div className="mt-6">
            <PasswordForm />
          </div>
        </Card>
      </div>

      {canApply ? (
        <section className="relative mt-6 overflow-hidden rounded-md3-2xl bg-md-primary p-8 text-md-on-primary shadow-lg sm:p-10">
          <BlurField className="opacity-60" />
          <div className="relative">
            <h2 className="text-title-lg">Know a trade well enough to teach it?</h2>
            <p className="mt-3 max-w-md text-body-md text-md-on-primary/85">
              Send in your licences or certificates and a reviewer will look them over. You can start building a course while you wait.
            </p>
            <ButtonLink href="/apply" variant="inverse" size="lg" className="mt-8">
              Apply to teach
            </ButtonLink>
          </div>
        </section>
      ) : null}
    </div>
  );
}
