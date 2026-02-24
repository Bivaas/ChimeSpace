import type { WorkspaceRole } from '@/types';
import WorkspaceMember from '@/models/WorkspaceMember';
import { connectDB } from '@/lib/db';

/* ── Role hierarchy (higher = more privileged) ────────────── */

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

/**
 * Role Transition Rules:
 * 
 * OWNER can:
 * - Promote MEMBER → ADMIN
 * - Demote ADMIN → MEMBER
 * - Transfer OWNER to another user (via dedicated endpoint)
 * - Remove any non-OWNER member
 * 
 * ADMIN can:
 * - Invite MEMBER (not ADMIN)
 * - Remove MEMBER (not ADMIN or OWNER)
 * 
 * MEMBER can:
 * - View workspace content
 * - Create/update tasks
 * - Send chat messages
 * 
 * Security invariants:
 * - OWNER role cannot be assigned via invite
 * - Only one OWNER per workspace at any time
 * - OWNER role is immutable except via explicit transfer
 */

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

/**
 * Check if a role transition is valid.
 * Used for role change validation.
 */
export function isValidRoleTransition(
  actorRole: WorkspaceRole,
  targetCurrentRole: WorkspaceRole,
  targetNewRole: WorkspaceRole
): { valid: boolean; reason?: string } {
  // OWNER role cannot be changed via normal role change
  if (targetCurrentRole === 'OWNER') {
    return { valid: false, reason: 'OWNER role cannot be changed. Use ownership transfer.' };
  }

  // OWNER can change any non-OWNER role
  if (actorRole === 'OWNER') {
    if (['ADMIN', 'MEMBER'].includes(targetNewRole)) {
      return { valid: true };
    }
    return { valid: false, reason: 'Invalid target role' };
  }

  // ADMIN and MEMBER cannot change roles
  return { valid: false, reason: 'Only OWNER can change roles' };
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
