import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createWorkspaceSchema } from '@/lib/validation';
import { sanitizeInput } from '@/lib/sanitize';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';

/**
 * GET /api/workspaces
 *
 * List all workspaces the authenticated user belongs to.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await connectDB();

    const memberships = await WorkspaceMember.find({
      userId: user.userId,
    }).lean() as Array<{ _id: unknown; workspaceId: { toString(): string }; userId: unknown; role: string }>;

    const workspaceIds = memberships.map((m: { workspaceId: { toString(): string } }) => m.workspaceId);

    const workspaces = await Workspace.find({
      _id: { $in: workspaceIds },
    })
      .select('name ownerId createdAt')
      .lean() as Array<{ _id: { toString(): string }; name: string; ownerId: { toString(): string }; createdAt: Date }>;

    const roleMap = new Map(
      memberships.map((m: { workspaceId: { toString(): string }; role: string }) => [m.workspaceId.toString(), m.role] as [string, string])
    );

    const result = workspaces.map((ws: { _id: { toString(): string }; name: string; ownerId: { toString(): string }; createdAt: Date }) => ({
      _id: ws._id.toString(),
      name: ws.name,
      ownerId: ws.ownerId.toString(),
      createdAt: ws.createdAt.toISOString(),
      role: roleMap.get(ws._id.toString()) || 'MEMBER',
    }));

    return successResponse(result);
  } catch (err) {
    console.error('GET /api/workspaces error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/workspaces
 *
 * Create a new workspace. The caller becomes its OWNER.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    // Rate limit workspace creation
    const rl = rateLimiter.check(
      `ws_create:${user.userId}`,
      RATE_LIMITS.WORKSPACE_CREATE.limit,
      RATE_LIMITS.WORKSPACE_CREATE.windowMs
    );
    if (!rl.allowed) {
      return errorResponse(
        'Too many workspaces created. Please try again later.',
        429
      );
    }

    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const sanitizedName = sanitizeInput(parsed.data.name);

    await connectDB();

    const workspace = await Workspace.create({
      name: sanitizedName,
      ownerId: user.userId,
    });

    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: user.userId,
      role: 'OWNER',
    });

    return successResponse(
      {
        _id: workspace._id.toString(),
        name: workspace.name,
        ownerId: workspace.ownerId.toString(),
        createdAt: workspace.createdAt.toISOString(),
        role: 'OWNER',
      },
      201
    );
  } catch (err) {
    console.error('POST /api/workspaces error:', err);
    return errorResponse('Internal server error', 500);
  }
}
