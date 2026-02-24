import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionFromRequest,
  validateCsrf,
  clearSessionCookies,
} from '@/lib/auth';
import { errorResponse } from '@/lib/api-response';

/**
 * POST /api/auth/logout
 *
 * Clears the session and CSRF cookies.
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

  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
  clearSessionCookies(response);
  return response;
}
