import { cn } from '@/lib/cn';

const STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-md-surface-container-low text-md-on-surface-variant' },
  pending: { label: 'Under review', className: 'bg-md-secondary-container text-md-on-secondary-container' },
  in_review: { label: 'In review', className: 'bg-md-secondary-container text-md-on-secondary-container' },
  more_info: { label: 'More info needed', className: 'bg-md-tertiary-container text-md-on-tertiary-container' },
  changes_requested: { label: 'Changes requested', className: 'bg-md-tertiary-container text-md-on-tertiary-container' },
  approved: { label: 'Approved', className: 'bg-md-primary-container text-md-on-primary-container' },
  published: { label: 'Published', className: 'bg-md-primary-container text-md-on-primary-container' },
  rejected: { label: 'Not approved', className: 'bg-md-error-container text-md-on-error-container' },
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const s = STYLES[status] ?? { label: status, className: 'bg-md-surface-container-low text-md-on-surface-variant' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-medium whitespace-nowrap',
        s.className,
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}
