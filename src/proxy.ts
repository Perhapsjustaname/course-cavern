import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, decrypt } from '@/lib/session';

/**
 * Optimistic check only. Sends signed-out visitors to the sign-in page before
 * a protected page starts rendering, which saves a round trip.
 *
 * This is NOT the security boundary. It cannot see the database, so it has no
 * idea whether someone is an admin or whether their account still exists.
 * Every protected page and action checks again through lib/dal.ts.
 */
export async function proxy(request: NextRequest) {
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const login = new URL('/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

/**
 * Two things this matcher must keep doing:
 *
 * 1. Skip Server Action requests (they carry a `next-action` header). Whenever
 *    proxy runs, Next buffers the request body and silently cuts it off at
 *    10 MB, so an application with two large photos arrived truncated and
 *    failed with "Unexpected end of form". Actions check their own access
 *    through lib/dal.ts, so the proxy adds nothing for them anyway.
 *
 * 2. Never match /api. Uploads stream through /api routes and would be cut
 *    off the same way.
 *
 * Values must stay literal: Next reads this at build time and ignores anything
 * computed, like a .map() over a list of paths.
 */
export const config = {
  matcher: [
    { source: '/account', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/apply', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/instructor/:path*', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/admin/:path*', missing: [{ type: 'header', key: 'next-action' }] },
  ],
};
