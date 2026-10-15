import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/dal';
import { countApplications, listApplications, type ApplicationRow } from '@/lib/applications';
import { ApplicantRow } from '@/components/admin/applicant-row';
import { FilterTabs } from '@/components/admin/filter-tabs';
import { Notice } from '@/components/notice';

export const metadata: Metadata = { title: 'Applications | Course Cavern' };

const STATUSES = ['pending', 'more_info', 'approved', 'rejected'] as const;
const SAVED: Record<string, string> = {
  approved: 'Approved. They can send courses for review now.',
  more_info: 'Request sent. Their application is paused until they reply.',
  rejected: 'Turned down. They can see your note.',
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ApplicationsPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as ApplicationRow['status']) : null;
  const current = sp.status === 'all' ? 'all' : (status ?? 'pending');

  const [rows, counts] = await Promise.all([
    listApplications(current === 'all' ? undefined : (status ?? 'pending')),
    countApplications(),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const saved = typeof sp.saved === 'string' ? SAVED[sp.saved] : undefined;

  return (
    <>
      <h1 className="text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">Applications</h1>
      {saved ? (
        <Notice tone="success" className="mt-6">
          {saved}
        </Notice>
      ) : null}

      <div className="mt-6">
        <FilterTabs
          base="/admin/applications"
          current={current}
          tabs={[
            { value: 'pending', label: 'Waiting', count: counts.pending ?? 0 },
            { value: 'more_info', label: 'Asked for more', count: counts.more_info ?? 0 },
            { value: 'approved', label: 'Approved', count: counts.approved ?? 0 },
            { value: 'rejected', label: 'Turned down', count: counts.rejected ?? 0 },
            { value: 'all', label: 'All', count: total },
          ]}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {rows.length ? (
          rows.map((r) => <ApplicantRow key={r.id} row={r} />)
        ) : (
          <p className="rounded-md3-lg bg-md-surface-container px-5 py-12 text-center text-body-md text-md-on-surface-variant">
            {current === 'pending' ? 'Nothing waiting. The queue is clear.' : 'No applications here.'}
          </p>
        )}
      </div>
    </>
  );
}
