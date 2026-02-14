import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';
import Task from '@/models/Task';
import ChatMessage from '@/models/ChatMessage';
import PendingInvite from '@/models/PendingInvite';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/workspaces/[id]
 *
 * Returns workspace details + the caller's role + member count.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const workspace = await Workspace.findById(params.id)
      .select('name ownerId createdAt')
      .lean();

    if (!workspace) {
      return errorResponse('Workspace not found', 404);
    }

    const memberCount = await WorkspaceMember.countDocuments({
      workspaceId: params.id,
    });

    return successResponse({
      _id: workspace._id.toString(),
      name: workspace.name,
      ownerId: workspace.ownerId.toString(),
      createdAt: workspace.createdAt.toISOString(),
      memberCount,
      role: auth.role,
    });
  } catch (err) {
    console.error('GET /api/workspaces/[id] error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/workspaces/[id]
 *
 * Permanently deletes a workspace and all related data.
 * Restricted to OWNER role only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id, [
      'OWNER',
    ]);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    await Promise.all([
      Workspace.findByIdAndDelete(params.id),
      WorkspaceMember.deleteMany({ workspaceId: params.id }),
      Task.deleteMany({ workspaceId: params.id }),
      ChatMessage.deleteMany({ workspaceId: params.id }),
      PendingInvite.deleteMany({ workspaceId: params.id }),
    ]);

    return successResponse({ message: 'Workspace deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/workspaces/[id] error:', err);
    return errorResponse('Internal server error', 500);
  }
}
