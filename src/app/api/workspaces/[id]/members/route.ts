import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateObjectId } from '@/lib/validation';
import WorkspaceMember from '@/models/WorkspaceMember';
import User from '@/models/User';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/workspaces/[id]/members
 *
 * Lists all members of a workspace with their user profiles.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    type MemberLean = { _id: { toString(): string }; workspaceId: unknown; userId: { toString(): string }; role: string; joinedAt: Date };
    type UserLean = { _id: { toString(): string }; email: string; name: string; avatar: string };

    const members = await WorkspaceMember.find({
      workspaceId: params.id,
    }).lean() as MemberLean[];

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

    return successResponse(result);
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

    return successResponse({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('DELETE /api/workspaces/[id]/members error:', err);
    return errorResponse('Internal server error', 500);
  }
}
