import { NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/auth';

/**
 * POST /api/auth/logout
 *
 * Clears the session and CSRF cookies.
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
  clearSessionCookies(response);
  return response;
}
