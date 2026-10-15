import { CREDENTIAL_KINDS } from '@/lib/constants';
import type { Credential } from '@/lib/applications';
import { formatBytes, formatPlainDate } from '@/lib/format';

const KIND = Object.fromEntries(CREDENTIAL_KINDS.map((k) => [k.value, k.label]));

function DocIcon({ mime }: { mime: string }) {
  const label = mime === 'application/pdf' ? 'PDF' : 'IMG';
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md3-sm bg-md-primary-container text-[0.65rem] font-bold tracking-wide text-md-on-primary-container">
      {label}
    </span>
  );
}

/** Submitted evidence. Links go through the authorised document route. */
export function CredentialList({ credentials, linkable = true }: { credentials: Credential[]; linkable?: boolean }) {
  if (!credentials.length) return null;
  return (
    <ul className="flex flex-col gap-3">
      {credentials.map((c) => {
        const dates = [
          c.issued_on && `Issued ${formatPlainDate(c.issued_on)}`,
          c.expires_on && `Expires ${formatPlainDate(c.expires_on)}`,
        ].filter(Boolean);
        return (
          <li key={c.id} className="flex items-start gap-4 rounded-md3-md bg-md-surface-container-low/60 p-4">
            <DocIcon mime={c.mime_type} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-body-md font-medium text-md-on-surface">{c.title}</p>
                <span className="text-label-sm text-md-on-surface-variant">{KIND[c.kind]}</span>
                {c.verified ? (
                  <span className="rounded-full bg-md-primary-container px-2 py-0.5 text-label-sm font-medium text-md-on-primary-container">
                    Verified
                  </span>
                ) : null}
              </div>
              {c.issuer ? <p className="text-label-md text-md-on-surface-variant">{c.issuer}</p> : null}
              {dates.length ? <p className="text-label-sm text-md-on-surface-variant">{dates.join('  ·  ')}</p> : null}
              <p className="mt-1 truncate text-label-sm text-md-on-surface-variant/80">
                {c.file_name}, {formatBytes(c.size_bytes)}
              </p>
            </div>
            {linkable ? (
              <a
                href={`/api/credentials/${c.id}`}
                target="_blank"
                rel="noopener"
                className="shrink-0 rounded-full px-3 py-1.5 text-label-md font-medium text-md-primary transition-colors duration-200 hover:bg-md-primary/10"
              >
                View
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
