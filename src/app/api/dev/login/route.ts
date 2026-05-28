import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  signJWT,
  setSessionCookie,
  setCsrfCookie,
  generateCsrfToken,
  SESSION_DURATION,
} from '@/lib/auth';
import User from '@/models/User';
import Session from '@/models/Session';

/**
 * GET /api/dev/login
 *
 * Dev-only session bypass for MCP/automation testing.
 * Hard-refuses unless:
 *   - NODE_ENV !== 'production'
 *   - DEV_AUTH_BYPASS === 'true'
 *
 * Returns 404 in all other cases so prod never reveals this route.
 * Never alter real auth, middleware, RBAC, or Google OAuth routes.
 */
export async function GET(request: NextRequest) {
  // Hard refuse in production or when bypass flag is not explicitly set
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.DEV_AUTH_BYPASS !== 'true'
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    await connectDB();

    // Upsert the fixed seed dev user
    const DEV_GOOGLE_ID = 'dev-seed-user-chimespace-test';
    const DEV_EMAIL = 'dev@chimespace.test';
    const DEV_NAME = 'Dev Tester';

    // Find by googleId first, then fall back to email (handles pre-existing dev users)
    let user = await User.findOne({ googleId: DEV_GOOGLE_ID });

    if (!user) {
      user = await User.findOne({ email: DEV_EMAIL });
    }

    if (!user) {
      user = await User.create({
        email: DEV_EMAIL,
        googleId: DEV_GOOGLE_ID,
        name: DEV_NAME,
        avatar: '',
      });
    } else {
      // Ensure fields are current; update googleId to the canonical dev value if needed
      user.name = DEV_NAME;
      user.googleId = DEV_GOOGLE_ID;
      await user.save();
    }

    // Mint session using identical logic to the real Google callback
    const { token: jwt, jti } = await signJWT({
      userId: user._id.toString(),
      email: user.email,
    });

    const forwardedFor =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || '';
    const ipHashValue = clientIp
      ? Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              'SHA-256',
              new TextEncoder().encode(clientIp)
            )
          )
        )
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 16)
      : 'dev-bypass';

    await Session.create({
      userId: user._id,
      jti,
      expiresAt: new Date(Date.now() + SESSION_DURATION * 1000),
      userAgent: (request.headers.get('user-agent') || '').slice(0, 256),
      ipHash: ipHashValue,
    });

    const response = NextResponse.redirect(`${appUrl}/dashboard`);
    setSessionCookie(response, jwt);
    setCsrfCookie(response, generateCsrfToken());

    return response;
  } catch (err) {
    console.error('[DEV LOGIN] Error:', err);
    return NextResponse.json(
      { error: 'Dev login failed', detail: String(err) },
      { status: 500 }
    );
  }
}
