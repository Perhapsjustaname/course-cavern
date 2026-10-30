import Link from 'next/link';
import { VerifiedTick } from '@/components/learn/catalogue-card';
import { CREDENTIAL_KINDS } from '@/lib/constants';
import type { VerifiedCredential } from '@/lib/learning';
import { formatDate, plural } from '@/lib/format';

const KIND_LABEL: Record<string, string> = Object.fromEntries(CREDENTIAL_KINDS.map((k) => [k.value, k.label]));

/** Who teaches it, and exactly what a reviewer checked about them. */
export function InstructorCard({
  instructor,
  credentials,
  profileHref,
}: {
  instructor: { name: string; headline: string | null; years: number | null; industry?: string | null; verifiedAt: Date | null };
  credentials: VerifiedCredential[];
  profileHref?: string;
}) {
  const initials = instructor.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const facts = [instructor.years ? `${plural(instructor.years, 'year')} in the trade` : null, instructor.industry].filter(Boolean);

  return (
    <div className="rounded-md3-xl bg-md-surface-container p-6 shadow-sm sm:p-7">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-md-tertiary text-body-lg font-bold text-md-on-tertiary">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-title-lg leading-snug">
            {instructor.name}
            <VerifiedTick className="h-5 w-5" />
          </p>
          {instructor.headline ? <p className="text-body-md text-md-on-surface-variant">{instructor.headline}</p> : null}
          {facts.length ? <p className="text-label-md text-md-on-surface-variant">{facts.join('  ·  ')}</p> : null}
        </div>
      </div>

      <p className="mt-6 text-label-sm font-medium tracking-[0.06em] text-md-on-surface-variant uppercase">Checked by a reviewer</p>
      {credentials.length ? (
        <ul className="mt-3 space-y-2">
          {credentials.map((c, i) => (
            <li key={i} className="flex gap-3 rounded-md3-md bg-md-background/70 px-4 py-3">
              <VerifiedTick className="mt-0.5 h-5 w-5" />
              <div className="min-w-0">
                <p className="text-label-md font-medium break-words text-md-on-surface">{c.title}</p>
                <p className="text-label-sm text-md-on-surface-variant">{[KIND_LABEL[c.kind], c.issuer].filter(Boolean).join(', ')}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-body-md text-md-on-surface-variant">Their application was approved by a reviewer.</p>
      )}
      {instructor.verifiedAt ? (
        <p className="mt-3 text-label-sm text-md-on-surface-variant">Approved {formatDate(instructor.verifiedAt)}</p>
      ) : null}
      {profileHref ? (
        <Link href={profileHref} className="mt-4 inline-block rounded-full text-label-md font-medium text-md-primary hover:underline">
          See their profile and other courses
        </Link>
      ) : null}
    </div>
  );
}
