import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';

/**
 * GET /api/auth/sessions
 *
 * Lists all active (non-revoked, non-expired) sessions for the
 * currently authenticated user. No sensitive data is returned.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    await connectDB();

    const sessions = await Session.find({
      userId: user.userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .select('jti createdAt expiresAt userAgent ipHash')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const result = sessions.map((s) => ({
      id: (s as { _id: { toString(): string } })._id.toString(),
      jti: (s as { jti: string }).jti,
      createdAt: (s as { createdAt: Date }).createdAt,
      expiresAt: (s as { expiresAt: Date }).expiresAt,
      userAgent: (s as { userAgent?: string }).userAgent || '',
      isCurrent: (s as { jti: string }).jti === user.jti,
    }));

    return successResponse({ sessions: result });
  } catch (err) {
    console.error('GET /api/auth/sessions error:', err);
    return errorResponse('Internal server error', 500);
  }
}
