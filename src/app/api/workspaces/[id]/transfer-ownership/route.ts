import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { transferOwnershipSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import WorkspaceMember from '@/models/WorkspaceMember';
import Workspace from '@/models/Workspace';

interface RouteContext {
  params: { id: string };
}

/**
 * POST /api/workspaces/[id]/transfer-ownership
 *
 * Transfers workspace ownership from the current OWNER to another member.
 * - Only the current OWNER can call this.
 * - New owner must be an existing member of the workspace.
 * - Atomic: current OWNER → ADMIN, new member → OWNER, workspace.ownerId updated.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = transferOwnershipSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { newOwnerUserId } = parsed.data;

    // Cannot transfer to yourself
    if (newOwnerUserId === auth.user.userId) {
      return errorResponse(
        'You are already the owner',
        400,
        'SELF_TRANSFER'
      );
    }

    await connectDB();

    // Verify new owner is a current member
    const newOwnerMember = await WorkspaceMember.findOne({
      workspaceId: params.id,
      userId: newOwnerUserId,
    });

    if (!newOwnerMember) {
      return errorResponse(
        'The target user is not a member of this workspace',
        404,
        'NOT_A_MEMBER'
      );
    }

    // Atomic transaction: change roles + update workspace.ownerId
    const mongoSession = await mongoose.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        // Demote current owner to ADMIN
        await WorkspaceMember.updateOne(
          { workspaceId: params.id, userId: auth.user.userId },
          { $set: { role: 'ADMIN' } },
          { session: mongoSession }
        );

        // Promote new owner
        await WorkspaceMember.updateOne(
          { workspaceId: params.id, userId: newOwnerUserId },
          { $set: { role: 'OWNER' } },
          { session: mongoSession }
        );

        // Update workspace.ownerId
        await Workspace.updateOne(
          { _id: params.id },
          { $set: { ownerId: newOwnerUserId } },
          { session: mongoSession }
        );
      });
    } finally {
      await mongoSession.endSession();
    }

    // Audit log: ownership transferred
    await logAudit({
      workspaceId: params.id,
      actorUserId: auth.user.userId,
      action: 'OWNERSHIP_TRANSFERRED',
      targetUserId: newOwnerUserId,
      metadata: {
        previousOwner: auth.user.userId,
        newOwner: newOwnerUserId,
      },
    });

    return successResponse({
      message: 'Ownership transferred successfully',
      newOwnerId: newOwnerUserId,
    });
  } catch (err) {
    console.error('POST /api/workspaces/[id]/transfer-ownership error:', err);
    return errorResponse('Internal server error', 500);
  }
}
