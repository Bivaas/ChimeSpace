import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, validateCsrf } from '@/lib/auth';
import { requireWorkspaceMembership } from '@/lib/rbac';
import { errorResponse } from '@/lib/api-response';
import { validateObjectId } from '@/lib/validation';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import type { AuthenticatedUser, WorkspaceRole } from '@/types';

/**
 * Authenticate a request by verifying the JWT session cookie.
 * Also enforces CSRF validation and general rate limiting.
 */
export async function authenticate(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const user = await getSessionFromRequest(request);
  if (!user) {
    return errorResponse('Authentication required', 401);
  }

  // CSRF double-submit check for mutating methods
  if (!validateCsrf(request)) {
    return errorResponse(
      'Invalid or missing CSRF token',
      403,
      'CSRF_VALIDATION_FAILED'
    );
  }

  // General rate limit per user
  const rl = await rateLimiter.check(
    `api:${user.userId}`,
    RATE_LIMITS.API_GENERAL.limit,
    RATE_LIMITS.API_GENERAL.windowMs
  );
  if (!rl.allowed) {
    return errorResponse('Too many requests. Please slow down.', 429);
  }

  return user;
}

/**
 * Authenticate + verify workspace membership + role check.
 * Use this for every workspace-scoped API route.
 */
export async function authenticateAndAuthorize(
  request: NextRequest,
  workspaceId: string,
  requiredRoles?: WorkspaceRole[]
): Promise<
  | { user: AuthenticatedUser; role: WorkspaceRole; memberId: string }
  | NextResponse
> {
  // Validate ObjectId format before any DB call
  if (!validateObjectId(workspaceId)) {
    return errorResponse('Invalid workspace ID', 400);
  }

  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) return authResult;

  const user = authResult;

  const membership = await requireWorkspaceMembership(
    user.userId,
    workspaceId,
    requiredRoles
  );

  if (!membership) {
    return errorResponse(
      requiredRoles
        ? 'Insufficient permissions for this action'
        : 'You are not a member of this workspace',
      403
    );
  }

  return { user, role: membership.role, memberId: membership.memberId };
}

