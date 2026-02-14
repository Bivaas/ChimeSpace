import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile.
 * If the session cookie is missing or invalid the cookie is cleared.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      const res = errorResponse('Not authenticated', 401);
      // Clear stale cookie so the edge middleware stops redirecting
      res.cookies.set('session_token', '', { maxAge: 0, path: '/' });
      return res;
    }

    await connectDB();

    const user = await User.findById(session.userId)
      .select('email name avatar createdAt')
      .lean();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return errorResponse('Internal server error', 500);
  }
}
