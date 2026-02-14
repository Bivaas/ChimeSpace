import type { WorkspaceRole } from '@/types';
import WorkspaceMember from '@/models/WorkspaceMember';
import { connectDB } from '@/lib/db';

/* ── Role hierarchy (higher = more privileged) ────────────── */

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

export function hasMinimumRole(
  userRole: WorkspaceRole,
  requiredRole: WorkspaceRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function hasAnyRole(
  userRole: WorkspaceRole,
  roles: WorkspaceRole[]
): boolean {
  return roles.includes(userRole);
}

/* ── Membership check ─────────────────────────────────────── */

export interface MembershipCheck {
  isMember: boolean;
  role: WorkspaceRole | null;
  memberId: string | null;
}

export async function checkWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<MembershipCheck> {
  await connectDB();

  const member = await WorkspaceMember.findOne({
    workspaceId,
    userId,
  }).lean();

  if (!member) {
    return { isMember: false, role: null, memberId: null };
  }

  return {
    isMember: true,
    role: member.role as WorkspaceRole,
    memberId: member._id.toString(),
  };
}

/**
 * Verify workspace membership + optional role requirement.
 * Returns membership info or null if unauthorized.
 */
export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string,
  requiredRoles?: WorkspaceRole[]
): Promise<{ role: WorkspaceRole; memberId: string } | null> {
  const membership = await checkWorkspaceMembership(userId, workspaceId);

  if (!membership.isMember || !membership.role || !membership.memberId) {
    return null;
  }

  if (requiredRoles && !hasAnyRole(membership.role, requiredRoles)) {
    return null;
  }

  return { role: membership.role, memberId: membership.memberId };
}
