'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/dal';
import { query, queryOne } from '@/lib/db';
import { fieldErrors, formText, nameSchema, passwordChangeSchema, type FieldErrors } from '@/lib/validation';

export type AccountState = { errors?: FieldErrors; message?: string; ok?: boolean } | undefined;

export async function updateName(_prev: AccountState, form: FormData): Promise<AccountState> {
  const user = await requireUser('/account');
  const parsed = nameSchema.safeParse(formText(form, 'name'));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await query('UPDATE users SET name = $2, updated_at = now() WHERE id = $1', [user.id, parsed.data.name]);
  // The header shows the name's initials on every page.
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function changePassword(_prev: AccountState, form: FormData): Promise<AccountState> {
  const user = await requireUser('/account');
  const parsed = passwordChangeSchema.safeParse(formText(form, 'current', 'password', 'confirm'));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const row = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [user.id]);
  if (!row || !(await bcrypt.compare(parsed.data.current, row.password_hash))) {
    return { errors: { current: ['That is not your current password.'] } };
  }
  const hash = await bcrypt.hash(parsed.data.password, 12);
  await query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [user.id, hash]);
  return { ok: true, message: 'Password changed. Use the new one next time you sign in.' };
}
