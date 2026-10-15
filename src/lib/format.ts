const DATE = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

export const formatDate = (d: Date | string | null | undefined) => (d ? DATE.format(new Date(d)) : '');
export const formatDateTime = (d: Date | string | null | undefined) => (d ? DATE_TIME.format(new Date(d)) : '');

/** Postgres `date` columns come back as Date at UTC midnight; show them as written. */
export function formatPlainDate(d: Date | string | null | undefined) {
  if (!d) return '';
  const iso = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [y, m, day] = iso.split('-').map(Number);
  return DATE.format(new Date(y!, m! - 1, day!));
}

export function formatPrice(cents: number, currency = 'CAD') {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(cents / 100);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function relativeDays(d: Date | string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDate(d);
}

export function formatMinutes(total: number) {
  if (!total) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
