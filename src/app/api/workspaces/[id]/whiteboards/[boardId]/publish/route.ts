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
 * POST /api/workspaces/[id]/whiteboards/[boardId]/publish
 *
 * Copies draftState → publishedState if they differ.
 * Any workspace member can publish.
 */
export async function POST(
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
    });

    if (!board) {
      return errorResponse('Whiteboard not found', 404);
    }

    // Only publish if draft differs from published
    if (board.draftState === board.publishedState) {
      return successResponse({
        _id: board._id.toString(),
        publishedAt: board.publishedAt
          ? board.publishedAt.toISOString()
          : null,
        changed: false,
        message: 'No changes to publish.',
      });
    }

    const now = new Date();
    const byteSize = new TextEncoder().encode(board.draftState).length;

    board.publishedState = board.draftState;
    board.publishedAt = now;
    board.publishedBy = new (await import('mongoose')).Types.ObjectId(
      auth.user.userId
    );
    board.sizePublishedBytes = byteSize;
    await board.save();

    return successResponse({
      _id: board._id.toString(),
      publishedAt: now.toISOString(),
      publishedBy: auth.user.userId,
      sizePublishedBytes: byteSize,
      changed: true,
    });
  } catch (err) {
    console.error(
      'POST /api/workspaces/[id]/whiteboards/[boardId]/publish error:',
      err
    );
    return errorResponse('Internal server error', 500);
  }
}
