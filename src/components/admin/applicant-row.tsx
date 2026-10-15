import Link from 'next/link';
import { StatusChip } from '@/components/status-chip';
import type { QueueRow } from '@/lib/applications';
import { plural, relativeDays } from '@/lib/format';

export function ApplicantRow({ row }: { row: QueueRow }) {
  const initials = row.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const meta = [row.industry, row.years_experience != null && plural(row.years_experience, 'year')]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Link
      href={`/admin/applications/${row.id}`}
      className="group flex items-center gap-4 rounded-md3-lg bg-md-surface-container px-5 py-4 transition-all duration-300 ease-md3 hover:scale-[1.01] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-primary"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-md-tertiary text-label-md font-bold text-md-on-tertiary">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-medium text-md-on-surface transition-colors duration-200 group-hover:text-md-primary">
          {row.display_name}
        </p>
        <p className="truncate text-label-md text-md-on-surface-variant">{row.headline}</p>
        <p className="mt-0.5 text-label-sm text-md-on-surface-variant/80">
          {[meta, plural(row.credential_count, 'document')].filter(Boolean).join('  ·  ')}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
        <StatusChip status={row.status} />
        <span className="text-label-sm text-md-on-surface-variant">Sent {relativeDays(row.submitted_at)}</span>
      </div>
    </Link>
  );
}
