import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import AuditLog from '@/models/AuditLog';
import User from '@/models/User';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/workspaces/[id]/audit-logs?page=1&limit=50
 *
 * Returns paginated audit log entries for the workspace.
 * Only ADMIN and OWNER can view audit logs.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id, [
      'OWNER',
      'ADMIN',
    ]);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      100
    );
    const page = Math.max(
      parseInt(searchParams.get('page') || '1', 10) || 1,
      1
    );
    const skip = (page - 1) * limit;

    await connectDB();

    const [logs, total] = await Promise.all([
      AuditLog.find({ workspaceId: params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({ workspaceId: params.id }),
    ]);

    // Collect unique user IDs to resolve names
    type LogLean = {
      _id: { toString(): string };
      actorUserId: { toString(): string };
      targetUserId?: { toString(): string } | null;
      action: string;
      metadata?: Record<string, unknown> | null;
      createdAt: Date;
    };
    const userIds = new Set<string>();
    (logs as LogLean[]).forEach((l) => {
      userIds.add(l.actorUserId.toString());
      if (l.targetUserId) userIds.add(l.targetUserId.toString());
    });

    type UserLean = { _id: { toString(): string }; name: string; email: string };
    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select('name email')
      .lean() as UserLean[];

    const userMap = new Map(
      users.map((u) => [u._id.toString(), { name: u.name, email: u.email }])
    );

    const entries = (logs as LogLean[]).map((l) => ({
      id: l._id.toString(),
      action: l.action,
      actorUserId: l.actorUserId.toString(),
      actor: userMap.get(l.actorUserId.toString()) || null,
      targetUserId: l.targetUserId?.toString() || null,
      target: l.targetUserId
        ? userMap.get(l.targetUserId.toString()) || null
        : null,
      metadata: l.metadata || null,
      createdAt: l.createdAt.toISOString(),
    }));

    return successResponse({
      logs: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.error('GET /api/workspaces/[id]/audit-logs error:', err);
    return errorResponse('Internal server error', 500);
  }
}
