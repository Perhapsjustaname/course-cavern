import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import { getApplicationForReview } from '@/lib/applications';
import { isUuid } from '@/lib/ids';
import { CredentialList } from '@/components/credential-list';
import { DecisionForm } from '@/components/admin/decision-form';
import { StatusChip } from '@/components/status-chip';
import { formatDate, formatDateTime, plural } from '@/lib/format';

export const metadata: Metadata = { title: 'Review application | Course Cavern' };

const DECISION_LABEL: Record<string, string> = { approved: 'approved', more_info: 'more_info', rejected: 'rejected' };

export default async function ReviewApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getApplicationForReview(id);
  if (!data) notFound();
  const { app, profile, credentials, decisions } = data;

  return (
    <>
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary transition-colors duration-200 hover:bg-md-primary/10"
      >
        <span aria-hidden="true">←</span> Applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">{profile.display_name}</h1>
          <p className="mt-2 text-body-lg text-md-on-surface-variant">{profile.headline}</p>
        </div>
        <StatusChip status={app.status} className="mt-2" />
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="rounded-md3-2xl bg-md-surface-container p-6 shadow-sm sm:p-8">
            <h2 className="text-title-lg">What they told us</h2>
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-label-sm text-md-on-surface-variant">Industry</dt>
                <dd className="text-body-md">{profile.industry}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-md-on-surface-variant">Experience</dt>
                <dd className="text-body-md">{profile.years_experience != null ? plural(profile.years_experience, 'year') : 'Not given'}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-md-on-surface-variant">Applied</dt>
                <dd className="text-body-md">{formatDate(app.submitted_at)}</dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-label-sm text-md-on-surface-variant">Account</dt>
                <dd className="text-body-md break-all">
                  {app.account_name}, {app.email}{' '}
                  <span className="text-md-on-surface-variant">(since {formatDate(app.account_created)})</span>
                </dd>
              </div>
            </dl>
            <h3 className="mt-8 text-label-md font-medium text-md-on-surface-variant">Background</h3>
            <p className="mt-2 text-body-md leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-title-lg">Evidence</h2>
              <span className="text-label-md text-md-on-surface-variant">{plural(credentials.length, 'document')}</span>
            </div>
            <p className="mt-1 text-label-md text-md-on-surface-variant">
              Documents open in a new tab. Check names and dates against what they claimed above.
            </p>
            <div className="mt-4">
              <CredentialList credentials={credentials} />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="rounded-md3-2xl bg-md-surface-container p-6 shadow-sm">
            <h2 className="text-title-lg">{app.status === 'pending' ? 'Your decision' : 'Change the decision'}</h2>
            {app.status !== 'pending' ? (
              <p className="mt-1 text-label-md text-md-on-surface-variant">
                The earlier decision stays in the history below.
              </p>
            ) : null}
            <div className="mt-5">
              <DecisionForm kind="application" id={app.id} />
            </div>
          </div>

          {decisions.length ? (
            <div className="rounded-md3-lg bg-md-surface-container p-6">
              <p className="text-title-lg">History</p>
              <ol className="mt-4 space-y-4">
                {decisions.map((d) => (
                  <li key={d.id} className="border-l-2 border-md-outline/20 pl-4">
                    <StatusChip status={DECISION_LABEL[d.decision] ?? d.decision} />
                    <p className="mt-1.5 text-label-sm text-md-on-surface-variant">
                      {d.admin_name}, {formatDateTime(d.decided_at)}
                    </p>
                    {d.note ? <p className="mt-1 text-label-md whitespace-pre-line">{d.note}</p> : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
