import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createWhiteboardSchema } from '@/lib/validation';
import { sanitizeInput } from '@/lib/sanitize';
import Whiteboard from '@/models/Whiteboard';

interface RouteContext {
  params: { id: string };
}

const MAX_BOARDS_PER_WORKSPACE = 2;

/**
 * GET /api/workspaces/[id]/whiteboards
 *
 * Returns the list of whiteboards for a workspace (max 2).
 * All workspace members can list.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const boards = await Whiteboard.find({ workspaceId: params.id })
      .select('title publishedAt publishedBy draftUpdatedAt sizeDraftBytes sizePublishedBytes createdAt updatedAt')
      .sort({ createdAt: 1 })
      .lean();

    const result = boards.map((b) => ({
      _id: b._id.toString(),
      title: b.title,
      publishedAt: b.publishedAt ? b.publishedAt.toISOString() : null,
      draftUpdatedAt: b.draftUpdatedAt ? b.draftUpdatedAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    return successResponse({
      whiteboards: result,
      maxBoards: MAX_BOARDS_PER_WORKSPACE,
    });
  } catch (err) {
    console.error('GET /api/workspaces/[id]/whiteboards error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/workspaces/[id]/whiteboards
 *
 * Creates a new whiteboard if workspace has < 2.
 * All workspace members can create.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createWhiteboardSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    await connectDB();

    // Enforce max 2 boards per workspace
    const count = await Whiteboard.countDocuments({ workspaceId: params.id });
    if (count >= MAX_BOARDS_PER_WORKSPACE) {
      return errorResponse(
        `Maximum of ${MAX_BOARDS_PER_WORKSPACE} whiteboards per workspace reached.`,
        409,
        'WHITEBOARD_LIMIT_REACHED'
      );
    }

    const title = sanitizeInput(parsed.data.title);

    const board = await Whiteboard.create({
      workspaceId: params.id,
      title,
    });

    // Double-check the limit wasn't exceeded by a race condition
    const finalCount = await Whiteboard.countDocuments({ workspaceId: params.id });
    if (finalCount > MAX_BOARDS_PER_WORKSPACE) {
      await Whiteboard.deleteOne({ _id: board._id });
      return errorResponse(
        `Maximum of ${MAX_BOARDS_PER_WORKSPACE} whiteboards per workspace reached.`,
        409,
        'WHITEBOARD_LIMIT_REACHED'
      );
    }

    return successResponse(
      {
        _id: board._id.toString(),
        title: board.title,
        createdAt: board.createdAt.toISOString(),
      },
      201
    );
  } catch (err) {
    console.error('POST /api/workspaces/[id]/whiteboards error:', err);
    return errorResponse('Internal server error', 500);
  }
}
