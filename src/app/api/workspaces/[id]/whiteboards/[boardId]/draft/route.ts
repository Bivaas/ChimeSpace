import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateObjectId, updateWhiteboardDraftSchema } from '@/lib/validation';
import Whiteboard from '@/models/Whiteboard';

interface RouteContext {
  params: { id: string; boardId: string };
}

/** Element types that are forbidden (no external images). */
const FORBIDDEN_ELEMENT_TYPES = ['image'];

/**
 * Server-side validation: reject any elements containing external images.
 */
function validateNoForbiddenElements(draftState: string): {
  valid: boolean;
  reason?: string;
} {
  try {
    const parsed = JSON.parse(draftState);
    if (parsed.elements && Array.isArray(parsed.elements)) {
      const hasImage = parsed.elements.some(
        (el: { type?: string }) =>
          el.type && FORBIDDEN_ELEMENT_TYPES.includes(el.type)
      );
      if (hasImage) {
        return {
          valid: false,
          reason: 'Image elements are not allowed on whiteboards.',
        };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid JSON in draft state.' };
  }
}

/**
 * PUT /api/workspaces/[id]/whiteboards/[boardId]/draft
 *
 * Saves the draft state of a whiteboard (not published).
 * Any workspace member can save drafts.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!validateObjectId(params.boardId)) {
      return errorResponse('Invalid board ID', 400);
    }

    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = updateWhiteboardDraftSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { draftState } = parsed.data;

    // Server-side size check (byte length can differ from string length)
    const byteSize = new TextEncoder().encode(draftState).length;
    if (byteSize > 5 * 1024 * 1024) {
      return errorResponse('Draft payload too large (max 5 MB)', 400);
    }

    // Validate no forbidden element types (images)
    const imgCheck = validateNoForbiddenElements(draftState);
    if (!imgCheck.valid) {
      return errorResponse(imgCheck.reason!, 400, 'FORBIDDEN_ELEMENT');
    }

    await connectDB();

    const updated = await Whiteboard.findOneAndUpdate(
      { _id: params.boardId, workspaceId: params.id },
      {
        draftState,
        draftUpdatedAt: new Date(),
        draftUpdatedBy: auth.user.userId,
        sizeDraftBytes: byteSize,
      },
      { new: true, select: '_id draftUpdatedAt sizeDraftBytes' }
    ).lean();

    if (!updated) {
      return errorResponse('Whiteboard not found', 404);
    }

    return successResponse({
      _id: updated._id.toString(),
      draftUpdatedAt: updated.draftUpdatedAt
        ? updated.draftUpdatedAt.toISOString()
        : null,
      sizeDraftBytes: updated.sizeDraftBytes,
    });
  } catch (err) {
    console.error('PUT /api/workspaces/[id]/whiteboards/[boardId]/draft error:', err);
    return errorResponse('Internal server error', 500);
  }
}
