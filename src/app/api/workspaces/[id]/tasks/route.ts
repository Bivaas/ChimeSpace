import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createTaskSchema } from '@/lib/validation';
import { sanitizeInput } from '@/lib/sanitize';
import { requireWorkspaceMembership } from '@/lib/rbac';
import Task from '@/models/Task';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/workspaces/[id]/tasks
 *
 * Returns all tasks in a workspace, newest first.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const tasks = await Task.find({ workspaceId: params.id })
      .sort({ createdAt: -1 })
      .lean();

    const result = tasks.map((t) => ({
      _id: t._id.toString(),
      title: t.title,
      description: t.description,
      createdBy: t.createdBy.toString(),
      assignedTo: t.assignedTo?.toString() ?? null,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));

    return successResponse(result);
  } catch (err) {
    console.error('GET /api/workspaces/[id]/tasks error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/workspaces/[id]/tasks
 *
 * Create a new task inside the workspace.
 * All workspace members can create tasks.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { title, description, assignedTo, status } = parsed.data;

    await connectDB();

    // If assigning, verify the target is a workspace member
    if (assignedTo) {
      const membership = await requireWorkspaceMembership(
        assignedTo,
        params.id
      );
      if (!membership) {
        return errorResponse(
          'Assigned user is not a member of this workspace',
          400
        );
      }
    }

    const task = await Task.create({
      workspaceId: params.id,
      title: sanitizeInput(title),
      description: description ? sanitizeInput(description) : '',
      createdBy: auth.user.userId,
      assignedTo: assignedTo || null,
      status: status || 'TODO',
    });

    return successResponse(
      {
        _id: task._id.toString(),
        title: task.title,
        description: task.description,
        createdBy: task.createdBy.toString(),
        assignedTo: task.assignedTo?.toString() ?? null,
        status: task.status,
        createdAt: task.createdAt.toISOString(),
      },
      201
    );
  } catch (err) {
    console.error('POST /api/workspaces/[id]/tasks error:', err);
    return errorResponse('Internal server error', 500);
  }
}
