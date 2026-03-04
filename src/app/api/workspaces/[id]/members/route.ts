import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateObjectId } from '@/lib/validation';
import { isValidRoleTransition } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import WorkspaceMember from '@/models/WorkspaceMember';
import User from '@/models/User';
import { z } from 'zod';

/**
 * Role change rules:
 * - Only OWNER can change roles
 * - OWNER role is immutable (cannot be changed, only transferred)
 * - OWNER can promote MEMBER → ADMIN
 * - OWNER can demote ADMIN → MEMBER
 * - Cannot change own role
 * 
 * TODO: Ownership Transfer
 * 
 * For transferring workspace ownership:
 * 1. Create dedicated /api/workspaces/[id]/transfer endpoint
 * 2. Require password/2FA confirmation
 * 3. Atomic transaction: old OWNER → ADMIN, new user → OWNER
 * 4. Update workspace.ownerId field
 * 5. Send notification email to both parties
 * 6. Audit log the transfer
 */

const changeRoleSchema = z
  .object({
    userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID'),
    role: z.enum(['ADMIN', 'MEMBER']),
  })
  .strict();

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/workspaces/[id]/members?limit=100&page=1
 *
 * Lists all members of a workspace with their user profiles.
 * Paginated to prevent unbounded data returns.
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
      Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1),
      200
    );
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const skip = (page - 1) * limit;

    await connectDB();

    type MemberLean = { _id: { toString(): string }; workspaceId: unknown; userId: { toString(): string }; role: string; joinedAt: Date };
    type UserLean = { _id: { toString(): string }; email: string; name: string; avatar: string };

    const [members, total] = await Promise.all([
      WorkspaceMember.find({ workspaceId: params.id })
        .skip(skip)
        .limit(limit)
        .lean() as Promise<MemberLean[]>,
      WorkspaceMember.countDocuments({ workspaceId: params.id }),
    ]);

    const userIds = members.map((m: MemberLean) => m.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('email name avatar')
      .lean() as UserLean[];

    const userMap = new Map(
      users.map((u: UserLean) => [u._id.toString(), u] as [string, UserLean])
    );

    const result = members.map((m: MemberLean) => {
      const profile = userMap.get(m.userId.toString());
      return {
        memberId: m._id.toString(),
        userId: m.userId.toString(),
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        user: profile
          ? {
              email: profile.email,
              name: profile.name,
              avatar: profile.avatar,
            }
          : null,
      };
    });

    return successResponse({
      members: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.error('GET /api/workspaces/[id]/members error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/workspaces/[id]/members?userId=<id>
 *
 * Removes a member from the workspace.
 * - OWNER can remove anyone except themselves.
 * - ADMIN can only remove MEMBER (not OWNER or other ADMINs).
 * - MEMBER cannot remove anyone.
 */
export async function DELETE(
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
    const targetUserId = searchParams.get('userId');

    if (!targetUserId || !validateObjectId(targetUserId)) {
      return errorResponse(
        'A valid userId query parameter is required',
        400
      );
    }

    // Cannot remove yourself
    if (targetUserId === auth.user.userId) {
      return errorResponse(
        'You cannot remove yourself from the workspace.',
        400
      );
    }

    await connectDB();

    // Find the target member to check their role
    const targetMember = await WorkspaceMember.findOne({
      workspaceId: params.id,
      userId: targetUserId,
    }).lean() as { role: string } | null;

    if (!targetMember) {
      return errorResponse('Member not found in this workspace', 404);
    }

    // Privilege check: ADMIN cannot remove OWNER or other ADMINs
    if (auth.role === 'ADMIN') {
      if (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN') {
        return errorResponse(
          'Admins can only remove members, not owners or other admins',
          403,
          'PRIVILEGE_ESCALATION'
        );
      }
    }

    await WorkspaceMember.deleteOne({
      workspaceId: params.id,
      userId: targetUserId,
    });

    await logAudit({
      workspaceId: params.id,
      actorUserId: auth.user.userId,
      action: 'MEMBER_REMOVED',
      targetUserId,
    });

    return successResponse({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('DELETE /api/workspaces/[id]/members error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * PATCH /api/workspaces/[id]/members
 *
 * Change a member's role. OWNER only.
 * Cannot change OWNER role (use transfer endpoint instead).
 * Cannot change own role.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = changeRoleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { userId: targetUserId, role: newRole } = parsed.data;

    // Cannot change own role
    if (targetUserId === auth.user.userId) {
      return errorResponse(
        'You cannot change your own role',
        400,
        'SELF_ROLE_CHANGE'
      );
    }

    await connectDB();

    const targetMember = await WorkspaceMember.findOne({
      workspaceId: params.id,
      userId: targetUserId,
    });

    if (!targetMember) {
      return errorResponse('Member not found in this workspace', 404);
    }

    // Validate role transition using centralized rules
    const transition = isValidRoleTransition(
      auth.role,
      targetMember.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      newRole as 'OWNER' | 'ADMIN' | 'MEMBER'
    );
    if (!transition.valid) {
      return errorResponse(
        transition.reason || 'Invalid role transition',
        403,
        'INVALID_ROLE_TRANSITION'
      );
    }

    // Check if role is actually changing
    if (targetMember.role === newRole) {
      return errorResponse(
        `User already has ${newRole} role`,
        400,
        'NO_CHANGE'
      );
    }

    const oldRole = targetMember.role;
    targetMember.role = newRole;
    await targetMember.save();

    await logAudit({
      workspaceId: params.id,
      actorUserId: auth.user.userId,
      action: 'ROLE_CHANGED',
      targetUserId,
      metadata: { oldRole, newRole },
    });

    return successResponse({
      message: `Role changed to ${newRole} successfully`,
      userId: targetUserId,
      role: newRole,
    });
  } catch (err) {
    console.error('PATCH /api/workspaces/[id]/members error:', err);
    return errorResponse('Internal server error', 500);
  }
}
