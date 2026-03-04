/* ──────────────────────────────────────────────────────────
 *  Shared type definitions
 * ────────────────────────────────────────────────────────── */

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

/** Payload stored inside every JWT session token. */
export interface JWTPayload {
  userId: string;
  email: string;
  issuedAt: number;
  jti: string;
}

/** Minimal authenticated user info extracted from a verified JWT. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  jti: string;
}

/* ── API Response Envelopes ───────────────────────────────── */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/* ── Google OAuth ─────────────────────────────────────────── */

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

/* ── View Models (returned to frontend) ──────────────────── */

export interface WorkspaceWithRole {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  role: WorkspaceRole;
}

/* ── Audit Log ────────────────────────────────────────────── */

export type AuditAction =
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED'
  | 'OWNERSHIP_TRANSFERRED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SESSION_REVOKED';

export interface AuditLogEntry {
  _id: string;
  workspaceId?: string;
  actorUserId: string;
  action: AuditAction;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
