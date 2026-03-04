import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Next.js Edge Middleware – route protection with JWT verification.
 *
 * Verifies JWT signature and expiration on every protected-page request.
 * If token is missing, invalid, or expired → redirect to `/` and clear cookie.
 */

const PROTECTED_PREFIXES = ['/dashboard', '/workspace'];

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('session_token')?.value;

  if (!token) {
    return redirectToLanding(request, pathname);
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });

    // Ensure essential claims exist
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      return redirectAndClearCookie(request, pathname);
    }

    return NextResponse.next();
  } catch {
    // Token invalid or expired → clear stale cookie and redirect
    return redirectAndClearCookie(request, pathname);
  }
}

/** Redirect to landing without clearing cookies (no token present). */
function redirectToLanding(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('redirect', pathname);
  return NextResponse.redirect(url);
}

/** Redirect to landing and delete the stale session_token cookie. */
function redirectAndClearCookie(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('redirect', pathname);
  const response = NextResponse.redirect(url);
  response.cookies.set('session_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('csrf_token', '', { maxAge: 0, path: '/' });
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/workspace/:path*'],
};
