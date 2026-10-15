'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withTransaction, query } from '@/lib/db';
import { requireUser } from '@/lib/dal';
import { getProfileForUser } from '@/lib/applications';
import { putPrivate, removePrivate, sniffMatches } from '@/lib/storage';
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_TYPES,
  MAX_CREDENTIALS_PER_SUBMIT,
} from '@/lib/constants';
import { formatBytes } from '@/lib/format';
import {
  credentialSchema,
  fieldErrors,
  formText,
  profileSchema,
  type FieldErrors,
} from '@/lib/validation';

export type ApplyState =
  | {
      errors?: FieldErrors;
      credentialErrors?: Record<number, FieldErrors>;
      message?: string;
    }
  | undefined;

type ReadyCredential = {
  kind: string;
  title: string;
  issuer?: string;
  issuedOn?: string;
  expiresOn?: string;
  file: File;
};

function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop() || 'document';
  return base.replace(/[\u0000-\u001f]/g, '').slice(0, 200);
}

async function checkFile(value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return 'Attach the document.';
  if (value.size > DOCUMENT_MAX_BYTES) {
    return `This file is ${formatBytes(value.size)}. The limit is ${formatBytes(DOCUMENT_MAX_BYTES)}.`;
  }
  if (!(DOCUMENT_TYPES as readonly string[]).includes(value.type)) {
    return 'Upload a PDF, JPG, PNG or WebP file.';
  }
  // The MIME type is whatever the browser claims. Check the bytes too.
  if (!(await sniffMatches(value))) return 'This file does not look like a real PDF or image.';
  return null;
}

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  // Authorise first, outside any try: requireUser redirects by throwing.
  const user = await requireUser('/apply');
  const existing = await getProfileForUser(user.id);
  if (existing && existing.status !== 'draft' && existing.status !== 'more_info') {
    redirect('/instructor');
  }

  const profile = profileSchema.safeParse(
    formText(form, 'displayName', 'headline', 'industry', 'yearsExperience', 'bio'),
  );

  // Credential rows arrive as cred.<n>.<field>. Gather the row numbers present.
  const rows = [
    ...new Set(
      [...form.keys()]
        .map((k) => k.match(/^cred\.(\d+)\./)?.[1])
        .filter((n): n is string => n !== undefined)
        .map(Number),
    ),
  ].sort((a, b) => a - b);

  if (rows.length > MAX_CREDENTIALS_PER_SUBMIT) {
    return { message: `Send up to ${MAX_CREDENTIALS_PER_SUBMIT} documents at a time.` };
  }

  const ready: ReadyCredential[] = [];
  const credentialErrors: Record<number, FieldErrors> = {};

  for (const i of rows) {
    const text = (k: string) => {
      const v = form.get(`cred.${i}.${k}`);
      return typeof v === 'string' ? v : '';
    };
    const parsed = credentialSchema.safeParse({
      kind: text('kind'),
      title: text('title'),
      issuer: text('issuer'),
      issuedOn: text('issuedOn'),
      expiresOn: text('expiresOn'),
    });
    const fileError = await checkFile(form.get(`cred.${i}.file`));
    const errs: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);
    if (fileError) errs.file = [fileError];
    if (parsed.success && parsed.data.issuedOn && parsed.data.expiresOn && parsed.data.expiresOn < parsed.data.issuedOn) {
      errs.expiresOn = ['The expiry date is before the issue date.'];
    }
    if (Object.keys(errs).length) {
      credentialErrors[i] = errs;
      continue;
    }
    if (parsed.success) ready.push({ ...parsed.data, file: form.get(`cred.${i}.file`) as File });
  }

  const alreadyOnFile = existing
    ? (await query<{ n: number }>('SELECT count(*)::int AS n FROM credential WHERE instructor_id = $1', [existing.id]))[0]!.n
    : 0;

  const state: ApplyState = {};
  if (!profile.success) state.errors = fieldErrors(profile.error);
  if (Object.keys(credentialErrors).length) state.credentialErrors = credentialErrors;
  if (alreadyOnFile + rows.length === 0) {
    state.message = 'Add at least one document. Reviewers cannot approve an application without evidence.';
  }
  if (state.errors || state.credentialErrors || state.message) {
    state.message ??= 'Some of this needs fixing before it can be sent.';
    return state;
  }
  if (!profile.success) return state; // narrows the type; unreachable

  const p = profile.data;
  const stored: string[] = [];
  try {
    for (const c of ready) stored.push(await putPrivate(`credentials/${user.id}`, c.file));

    await withTransaction(async (db) => {
      const { rows: [row] } = await db.query<{ id: string }>(
        `INSERT INTO instructor_profile (user_id, display_name, headline, bio, industry, years_experience, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         ON CONFLICT (user_id) DO UPDATE
           SET display_name = EXCLUDED.display_name, headline = EXCLUDED.headline,
               bio = EXCLUDED.bio, industry = EXCLUDED.industry,
               years_experience = EXCLUDED.years_experience,
               status = 'pending', updated_at = now()
         RETURNING id`,
        [user.id, p.displayName, p.headline, p.bio, p.industry, p.yearsExperience],
      );
      const instructorId = row!.id;

      for (const [n, c] of ready.entries()) {
        await db.query(
          `INSERT INTO credential
             (instructor_id, kind, title, issuer, issued_on, expires_on, document_key, file_name, mime_type, size_bytes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            instructorId, c.kind, c.title, c.issuer ?? null, c.issuedOn ?? null, c.expiresOn ?? null,
            stored[n], cleanFileName(c.file.name), c.file.type, c.file.size,
          ],
        );
      }

      // Resubmitting keeps the original submitted_at, so nobody loses their
      // place in the queue for answering a reviewer's question.
      await db.query(
        `INSERT INTO application (instructor_id, status) VALUES ($1, 'pending')
         ON CONFLICT (instructor_id) DO UPDATE SET status = 'pending', updated_at = now()`,
        [instructorId],
      );
    });
  } catch (err) {
    // Nothing was committed, so the files have nothing pointing at them.
    await Promise.all(stored.map((k) => removePrivate(k).catch(() => {})));
    throw err;
  }

  // The header lives in the root layout and now needs to show instructor links.
  // An action that sets no cookie does not re-render layouts on its own.
  revalidatePath('/', 'layout');
  redirect('/instructor?submitted=1');
}
