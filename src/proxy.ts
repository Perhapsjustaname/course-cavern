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

export const config = {
  matcher: ['/account', '/apply', '/instructor/:path*', '/admin/:path*'],
};
