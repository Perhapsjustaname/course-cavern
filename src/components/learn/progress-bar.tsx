import { cn } from '@/lib/cn';

export function ProgressBar({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={`${done} of ${total} lessons done`}
      className={cn('h-2 overflow-hidden rounded-full bg-md-surface-container-low', className)}
    >
      <div className="h-full rounded-full bg-md-primary transition-[width] duration-500 ease-md3" style={{ width: `${pct}%` }} />
    </div>
  );
}
