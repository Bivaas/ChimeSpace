import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateObjectId } from '@/lib/validation';
import Whiteboard from '@/models/Whiteboard';

interface RouteContext {
  params: { id: string; boardId: string };
}

/**
 * GET /api/workspaces/[id]/whiteboards/[boardId]
 *
 * Returns full board data. All members see publishedState.
 * Draft is returned alongside for members who want to edit.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!validateObjectId(params.boardId)) {
      return errorResponse('Invalid board ID', 400);
    }

    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const board = await Whiteboard.findOne({
      _id: params.boardId,
      workspaceId: params.id,
    }).lean();

    if (!board) {
      return errorResponse('Whiteboard not found', 404);
    }

    return successResponse({
      _id: board._id.toString(),
      title: board.title,
      draftState: board.draftState,
      publishedState: board.publishedState,
      draftUpdatedAt: board.draftUpdatedAt
        ? board.draftUpdatedAt.toISOString()
        : null,
      publishedAt: board.publishedAt
        ? board.publishedAt.toISOString()
        : null,
      publishedBy: board.publishedBy?.toString() ?? null,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('GET /api/workspaces/[id]/whiteboards/[boardId] error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/workspaces/[id]/whiteboards/[boardId]
 *
 * Deletes a whiteboard. Only ADMIN or OWNER.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!validateObjectId(params.boardId)) {
      return errorResponse('Invalid board ID', 400);
    }

    const auth = await authenticateAndAuthorize(request, params.id, [
      'ADMIN',
      'OWNER',
    ]);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const deleted = await Whiteboard.findOneAndDelete({
      _id: params.boardId,
      workspaceId: params.id,
    });

    if (!deleted) {
      return errorResponse('Whiteboard not found', 404);
    }

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/workspaces/[id]/whiteboards/[boardId] error:', err);
    return errorResponse('Internal server error', 500);
  }
}
