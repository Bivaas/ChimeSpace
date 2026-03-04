import { NextRequest } from 'next/server';
import { getSessionFromRequest, validateCsrf } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const revokeSchema = z
  .object({
    jti: z.string().min(1, 'Session ID is required'),
  })
  .strict();

/**
 * POST /api/auth/sessions/revoke
 *
 * Revokes a specific session by jti. Users can only revoke
 * their own sessions.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // CSRF check for mutating endpoint
    if (!validateCsrf(request)) {
      return errorResponse(
        'Invalid or missing CSRF token',
        403,
        'CSRF_VALIDATION_FAILED'
      );
    }

    const body = await request.json();
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { jti } = parsed.data;

    await connectDB();

    // Only allow revoking own sessions
    const session = await Session.findOne({
      jti,
      userId: user.userId,
    });

    if (!session) {
      return errorResponse('Session not found', 404);
    }

    if (session.revokedAt) {
      return errorResponse('Session already revoked', 400);
    }

    session.revokedAt = new Date();
    await session.save();

    // Audit log: session revoked
    await logAudit({
      actorUserId: user.userId,
      action: 'SESSION_REVOKED',
      metadata: { revokedJti: jti },
    });

    return successResponse({ message: 'Session revoked successfully' });
  } catch (err) {
    console.error('POST /api/auth/sessions/revoke error:', err);
    return errorResponse('Internal server error', 500);
  }
}
