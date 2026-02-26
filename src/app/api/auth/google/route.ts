import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/auth';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import { errorResponse } from '@/lib/api-response';

/**
 * GET /api/auth/google
 *
 * Initiates the Google OAuth 2.0 authorization code flow.
 * Generates an anti-CSRF state parameter, stores it in a cookie,
 * then redirects the user to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  // Rate limit OAuth initiation by IP to prevent abuse
  const forwardedFor =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent')?.slice(0, 120) || 'unknown';
  const rateLimitKey = ip ? `oauth:${ip}` : `oauth:ua:${userAgent}`;
  const rl = rateLimiter.check(
    rateLimitKey,
    RATE_LIMITS.AUTH_ATTEMPT.limit,
    RATE_LIMITS.AUTH_ATTEMPT.windowMs
  );
  if (!rl.allowed) {
    return errorResponse('Too many login attempts. Please try again later.', 429);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Server misconfiguration — missing OAuth credentials.',
        },
      },
      { status: 500 }
    );
  }

  const state = generateCsrfToken();
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state,
    prompt: 'consent',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const response = NextResponse.redirect(googleAuthUrl);

  // Store state in a short-lived cookie for verification on callback
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax', // must be "lax" — callback is a cross-site redirect from Google
    maxAge: 600,     // 10 minutes
    path: '/',
  });

  return response;
}
