import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { updateTaskSchema, validateObjectId } from '@/lib/validation';
import { sanitizeInput } from '@/lib/sanitize';
import { requireWorkspaceMembership } from '@/lib/rbac';
import Task from '@/models/Task';

interface RouteContext {
  params: { id: string; taskId: string };
}

/**
 * PATCH /api/workspaces/[id]/tasks/[taskId]
 *
 * Update a task. All workspace members may update tasks.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!validateObjectId(params.taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const updates = parsed.data;

    await connectDB();

    const task = await Task.findOne({
      _id: params.taskId,
      workspaceId: params.id,
    });

    if (!task) {
      return errorResponse('Task not found in this workspace', 404);
    }

    if (updates.title) task.title = sanitizeInput(updates.title);
    if (updates.description !== undefined) {
      task.description = updates.description
        ? sanitizeInput(updates.description)
        : '';
    }
    if (updates.status) task.status = updates.status;
    if (updates.assignedTo !== undefined) {
      if (updates.assignedTo) {
        const membership = await requireWorkspaceMembership(
          updates.assignedTo,
          params.id
        );
        if (!membership) {
          return errorResponse(
            'Assigned user is not a member of this workspace',
            400
          );
        }
        // Mongoose auto-casts string → ObjectId
        task.assignedTo = updates.assignedTo as unknown as typeof task.assignedTo;
      } else {
        task.assignedTo = undefined;
      }
    }

    await task.save();

    return successResponse({
      _id: task._id.toString(),
      title: task.title,
      description: task.description,
      createdBy: task.createdBy.toString(),
      assignedTo: task.assignedTo?.toString() ?? null,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('PATCH /api/workspaces/[id]/tasks/[taskId] error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/workspaces/[id]/tasks/[taskId]
 *
 * Delete a task. OWNER or ADMIN only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!validateObjectId(params.taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    const auth = await authenticateAndAuthorize(request, params.id, [
      'OWNER',
      'ADMIN',
    ]);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const task = await Task.findOneAndDelete({
      _id: params.taskId,
      workspaceId: params.id,
    });

    if (!task) {
      return errorResponse('Task not found in this workspace', 404);
    }

    return successResponse({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/workspaces/[id]/tasks/[taskId] error:', err);
    return errorResponse('Internal server error', 500);
  }
}
