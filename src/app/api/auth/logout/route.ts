import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionFromRequest,
  validateCsrf,
  clearSessionCookies,
} from '@/lib/auth';
import { errorResponse } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/auth/logout
 *
 * Revokes the current session in DB and clears cookies.
 * Requires a valid session + CSRF token to prevent forced-logout attacks.
 */
export async function POST(request: NextRequest) {
  // Verify the user is actually authenticated
  const session = await getSessionFromRequest(request);
  if (!session) {
    return errorResponse('Not authenticated', 401);
  }

  // Validate CSRF to prevent cross-site forced logout
  if (!validateCsrf(request)) {
    return errorResponse(
      'Invalid or missing CSRF token',
      403,
      'CSRF_VALIDATION_FAILED'
    );
  }

  // Revoke session in DB
  if (session.jti) {
    await connectDB();
    await Session.updateOne(
      { jti: session.jti },
      { $set: { revokedAt: new Date() } }
    );
  }

  // Audit log: logout
  await logAudit({
    actorUserId: session.userId,
    action: 'LOGOUT',
  });

  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
  clearSessionCookies(response);
  return response;
}
