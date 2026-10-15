import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/dal';
import { getApplication, getCredentials, getDecisions, getProfileForUser } from '@/lib/applications';
import { ApplicationForm } from '@/components/apply/application-form';
import { CredentialList } from '@/components/credential-list';
import { Notice } from '@/components/notice';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Apply to teach | Course Cavern' };

const TIPS = [
  {
    title: 'Use your working name',
    body: 'The name students will know you by. It does not need to match your account name.',
  },
  {
    title: 'Licences count most',
    body: 'If your trade does not license individuals, a letter on company letterhead confirming your role and years works too.',
  },
  {
    title: 'Photos are fine',
    body: 'A clear phone photo of a certificate is enough, as long as every word on it is readable.',
  },
  {
    title: 'Cover what is not about work',
    body: 'Feel free to black out a home address or anything else unrelated to your qualifications.',
  },
];

export default async function ApplyPage() {
  const user = await requireUser('/apply');
  if (user.role === 'admin') redirect('/admin');

  const profile = await getProfileForUser(user.id);
  if (profile && profile.status !== 'draft' && profile.status !== 'more_info') redirect('/instructor');

  const resubmitting = profile?.status === 'more_info';
  const application = profile ? await getApplication(profile.id) : null;
  const [credentials, decisions] = await Promise.all([
    profile ? getCredentials(profile.id) : Promise.resolve([]),
    application ? getDecisions(application.id) : Promise.resolve([]),
  ]);
  const ask = resubmitting ? decisions.find((d) => d.decision === 'more_info') : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-label-md font-medium text-md-primary">
          {resubmitting ? 'Your application' : 'Apply to teach'}
        </p>
        <h1 className="mt-2 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">
          {resubmitting ? 'A reviewer needs a bit more' : 'Show us your work history'}
        </h1>
        <p className="mt-4 text-body-lg text-md-on-surface-variant">
          {resubmitting
            ? 'Your application is paused until you answer. Everything you already sent is still on file.'
            : 'A reviewer reads every application by hand. The more clearly your documents back up what you say, the faster it goes.'}
        </p>
      </header>

      {ask ? (
        <Notice tone="warning" title={`From ${ask.admin_name}, ${formatDate(ask.decided_at)}`} className="mt-8 max-w-3xl">
          <p className="whitespace-pre-line">{ask.note}</p>
        </Notice>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {credentials.length ? (
            <section className="mb-10">
              <h2 className="text-title-lg">Already on file</h2>
              <div className="mt-4">
                <CredentialList credentials={credentials} />
              </div>
            </section>
          ) : null}
          <ApplicationForm
            resubmitting={resubmitting}
            hasExistingDocuments={credentials.length > 0}
            defaults={{
              displayName: profile?.display_name ?? user.name,
              headline: profile?.headline ?? '',
              industry: profile?.industry ?? '',
              yearsExperience: profile?.years_experience?.toString() ?? '',
              bio: profile?.bio ?? '',
            }}
          />
        </div>

        <aside className="order-first lg:order-none">
          <div className="rounded-md3-lg bg-md-secondary-container/60 p-6 lg:sticky lg:top-24">
            <p className="text-title-lg text-md-on-secondary-container">What reviewers look for</p>
            <ul className="mt-5 space-y-5">
              {TIPS.map((t) => (
                <li key={t.title}>
                  <p className="text-label-md font-medium text-md-on-secondary-container">{t.title}</p>
                  <p className="mt-1 text-label-md leading-relaxed text-md-on-secondary-container/80">{t.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
