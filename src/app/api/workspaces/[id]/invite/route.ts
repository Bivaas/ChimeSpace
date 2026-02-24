import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { inviteSchema } from '@/lib/validation';
import User from '@/models/User';
import WorkspaceMember from '@/models/WorkspaceMember';
import PendingInvite from '@/models/PendingInvite';

interface RouteContext {
  params: { id: string };
}

/**
 * POST /api/workspaces/[id]/invite
 *
 * Invite a user to the workspace by email.
 * - If the user exists → add directly.
 * - If not → create a pending invite (auto-resolved on sign-up).
 *
 * OWNER can invite as ADMIN or MEMBER.
 * ADMIN can only invite as MEMBER (privilege escalation prevention).
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id, [
      'OWNER',
      'ADMIN',
    ]);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { email, role } = parsed.data;

    // Self-invite guard
    if (email === auth.user.email) {
      return errorResponse('You cannot invite yourself', 400);
    }

    // Privilege escalation guard: ADMIN cannot invite as ADMIN
    if (auth.role === 'ADMIN' && role === 'ADMIN') {
      return errorResponse(
        'Admins can only invite members, not other admins',
        403,
        'PRIVILEGE_ESCALATION'
      );
    }

    // Defense-in-depth: only ADMIN or MEMBER roles allowed
    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return errorResponse('Invalid role assignment', 400, 'INVALID_ROLE');
    }

    await connectDB();

    /* ── User already on the platform ────────────────────── */
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      const alreadyMember = await WorkspaceMember.findOne({
        workspaceId: params.id,
        userId: existingUser._id,
      });

      if (alreadyMember) {
        return errorResponse(
          'User is already a member of this workspace',
          409
        );
      }

      await WorkspaceMember.create({
        workspaceId: params.id,
        userId: existingUser._id,
        role,
      });

      return successResponse(
        { message: 'Invitation processed successfully' },
        201
      );
    }

    /* ── User not found → pending invite ─────────────────── */
    const existingInvite = await PendingInvite.findOne({
      email,
      workspaceId: params.id,
    });

    if (existingInvite) {
      return errorResponse(
        'An invitation is already pending for this email',
        409
      );
    }

    await PendingInvite.create({
      email,
      workspaceId: params.id,
      role,
      invitedBy: auth.user.userId,
    });

    return successResponse(
      {
        message: 'Invitation processed successfully',
      },
      201
    );
  } catch (err) {
    console.error('POST /api/workspaces/[id]/invite error:', err);
    return errorResponse('Internal server error', 500);
  }
}
