import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sendMessageSchema } from '@/lib/validation';
import { sanitizeInput } from '@/lib/sanitize';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import ChatMessage from '@/models/ChatMessage';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/workspaces/[id]/chat?limit=50&before=<ISO date>
 *
 * Returns chat messages for a workspace using cursor-based pagination.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      100
    );
    const before = searchParams.get('before');

    await connectDB();

    const query: Record<string, unknown> = {
      workspaceId: params.id,
    };
    if (before) {
      const d = new Date(before);
      if (!isNaN(d.getTime())) {
        query.createdAt = { $lt: d };
      }
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const result = messages.map((m) => ({
      _id: m._id.toString(),
      senderId: m.senderId.toString(),
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));

    return successResponse({
      messages: result.reverse(), // oldest-first for display
      hasMore: messages.length === limit,
    });
  } catch (err) {
    console.error('GET /api/workspaces/[id]/chat error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/workspaces/[id]/chat
 *
 * Send a chat message. Rate-limited to 5 messages per 10 seconds.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    // Chat-specific rate limit
    const rl = rateLimiter.check(
      `chat:${auth.user.userId}:${params.id}`,
      RATE_LIMITS.CHAT_MESSAGE.limit,
      RATE_LIMITS.CHAT_MESSAGE.windowMs
    );
    if (!rl.allowed) {
      return errorResponse(
        `Rate limited. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
        429
      );
    }

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    await connectDB();

    const msg = await ChatMessage.create({
      workspaceId: params.id,
      senderId: auth.user.userId,
      message: sanitizeInput(parsed.data.message),
    });

    return successResponse(
      {
        _id: msg._id.toString(),
        senderId: msg.senderId.toString(),
        message: msg.message,
        createdAt: msg.createdAt.toISOString(),
      },
      201
    );
  } catch (err) {
    console.error('POST /api/workspaces/[id]/chat error:', err);
    return errorResponse('Internal server error', 500);
  }
}
