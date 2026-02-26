import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware – lightweight route protection.
 *
 * Checks cookie existence only (not JWT validity).
 * Full JWT verification happens in API route handlers.
 */

const PROTECTED_PREFIXES = ['/dashboard', '/workspace'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('session_token');

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  // Unauthenticated user hitting a protected page → landing
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users can view the landing page freely —
  // no forced redirect to /dashboard.

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/workspace/:path*'],
};
