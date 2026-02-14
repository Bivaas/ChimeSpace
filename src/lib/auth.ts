import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload as AppJWTPayload, AuthenticatedUser } from '@/types';

/* ── Constants ────────────────────────────────────────────── */

const COOKIE_NAME = 'session_token';
const CSRF_COOKIE_NAME = 'csrf_token';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be defined and at least 32 characters long.'
    );
  }
  return secret;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

/* ── JWT helpers ──────────────────────────────────────────── */

export async function signJWT(
  payload: Omit<AppJWTPayload, 'issuedAt'>
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    issuedAt: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifyJWT(
  token: string
): Promise<AppJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      issuedAt:
        (payload.issuedAt as number) ?? (payload.iat as number) ?? 0,
    };
  } catch {
    return null;
  }
}

/* ── Cookie helpers ───────────────────────────────────────── */

export function setSessionCookie(
  response: NextResponse,
  token: string
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export function setCsrfCookie(
  response: NextResponse,
  token: string
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // must be readable by client JS
    secure: isProduction,
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  response.cookies.set(CSRF_COOKIE_NAME, '', { maxAge: 0, path: '/' });
}

/* ── Request helpers ──────────────────────────────────────── */

export async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  return { userId: payload.userId, email: payload.email };
}

/* ── CSRF helpers ─────────────────────────────────────────── */

export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate the double-submit CSRF token.
 * Safe (GET / HEAD / OPTIONS) methods are automatically allowed.
 */
export function validateCsrf(request: NextRequest): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(request.method)) return true;

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  // Constant-time comparison to prevent timing attacks
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}

export { COOKIE_NAME, CSRF_COOKIE_NAME };
