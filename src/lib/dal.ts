import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { SESSION_COOKIE, decrypt } from '@/lib/session';

/**
 * The data access layer. Every authorisation decision in the app goes through
 * here: pages, Server Actions and route handlers alike.
 *
 * proxy.ts also redirects signed-out visitors, but only as a convenience. It
 * cannot see the database, so it is never what keeps anyone out.
 *
 * Note that every function here may call redirect() or notFound(), both of
 * which work by throwing. Call them outside any try/catch, or the catch block
 * swallows the redirect and the request carries on as if nothing happened.
 */

export type Role = 'student' | 'instructor' | 'admin';
export type InstructorStatus = 'draft' | 'pending' | 'more_info' | 'approved' | 'rejected';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  instructor: {
    id: string;
    displayName: string;
    status: InstructorStatus;
  } | null;
};

type Row = {
  id: string;
  name: string;
  email: string;
  role: Role;
  instructor_id: string | null;
  display_name: string | null;
  instructor_status: InstructorStatus | null;
};

/** The signed-in user, or null. Memoised for the length of one render. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) return null;

  // Only the columns the app needs. Never the password hash.
  const row = await queryOne<Row>(
    `SELECT u.id, u.name, u.email, u.role,
            p.id AS instructor_id, p.display_name, p.status AS instructor_status
       FROM users u
       LEFT JOIN instructor_profile p ON p.user_id = u.id
      WHERE u.id = $1`,
    [session.sub],
  );
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    instructor: row.instructor_id
      ? { id: row.instructor_id, displayName: row.display_name!, status: row.instructor_status! }
      : null,
  };
});

/** Signed-in user, or a redirect to sign in that comes back here afterwards. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
  }
  return user;
}

/** Admin routes 404 for everyone else rather than admitting they exist. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser('/admin');
  if (user.role !== 'admin') notFound();
  return user;
}

/** Anyone who has started an instructor application. */
export async function requireInstructor(returnTo = '/instructor') {
  const user = await requireUser(returnTo);
  if (!user.instructor) redirect('/apply');
  return { user, instructor: user.instructor };
}

/** Where someone lands after signing in, based on who they are. */
export function homePath(role: Role, hasInstructorProfile: boolean): string {
  if (role === 'admin') return '/admin';
  if (hasInstructorProfile) return '/instructor';
  return '/learning';
}

export function homeFor(user: CurrentUser): string {
  return homePath(user.role, user.instructor !== null);
}

/**
 * Only accept same-site paths for post-login redirects. Without this,
 * /login?next=https://evil.example would bounce users off-site after signing in.
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string') return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}
