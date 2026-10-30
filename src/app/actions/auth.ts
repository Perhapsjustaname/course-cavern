'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { isUniqueViolation, queryOne } from '@/lib/db';
import { createSession, deleteSession } from '@/lib/session';
import { homePath, safeNext, type Role } from '@/lib/dal';
import { fieldErrors, formText, loginSchema, signupSchema, type FieldErrors } from '@/lib/validation';

export type AuthState =
  | {
      errors?: FieldErrors;
      message?: string;
      /** Echoed back so React 19's post-submit form reset does not wipe them. */
      values?: { name?: string; email?: string };
    }
  | undefined;

// Compared against when the email is unknown, so a miss takes as long as a
// wrong password and response time does not reveal which emails have accounts.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5zl2yX2hOmBGlhXy6d8qE7N1oRaD6.e';

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = formText(form, 'name', 'email', 'password', 'next');
  const values = { name: raw.name, email: raw.email };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { name, email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 12);

  let userId: string;
  try {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      [name, email, hash],
    );
    userId = row!.id;
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { errors: { email: ['There is already an account with this email. Try signing in.'] }, values };
    }
    throw err;
  }

  await createSession(userId);
  // Outside the try on purpose: redirect() throws to do its job.
  redirect(safeNext(raw.next) ?? '/learning');
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = formText(form, 'email', 'password', 'next');
  const values = { email: raw.email };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { email, password } = parsed.data;
  // Role comes back with the hash, so the landing page is decided here rather
  // than by reading back a session cookie this same request has only just set.
  const user = await queryOne<{ id: string; password_hash: string; role: Role; has_profile: boolean }>(
    `SELECT u.id, u.password_hash, u.role,
            EXISTS (SELECT 1 FROM instructor_profile p WHERE p.user_id = u.id) AS has_profile
       FROM users u
      WHERE u.email = $1`,
    [email],
  );
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    return { message: 'That email and password do not match an account.', values };
  }

  await createSession(user.id);
  redirect(safeNext(raw.next) ?? homePath(user.role, user.has_profile));
}

export async function logout() {
  await deleteSession();
  redirect('/');
}
