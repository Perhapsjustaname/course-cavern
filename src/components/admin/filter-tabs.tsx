import Link from 'next/link';
import { cn } from '@/lib/cn';

export function FilterTabs({
  base,
  current,
  tabs,
}: {
  base: string;
  current: string;
  tabs: { value: string; label: string; count?: number }[];
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.value === 'all' ? `${base}?status=all` : `${base}?status=${t.value}`}
          aria-current={current === t.value ? 'true' : undefined}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-label-md font-medium whitespace-nowrap transition-all duration-200 ease-md3 active:scale-95',
            current === t.value
              ? 'border-transparent bg-md-secondary-container text-md-on-secondary-container'
              : 'border-md-outline/40 text-md-on-surface-variant hover:bg-md-primary/5',
          )}
        >
          {t.label}
          {t.count !== undefined ? <span className="opacity-70 tabular-nums">{t.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}
