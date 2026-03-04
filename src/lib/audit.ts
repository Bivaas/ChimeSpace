import { connectDB } from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import type { AuditAction } from '@/types';

/**
 * Write an audit log entry.
 *
 * Fire-and-forget: errors are logged but never thrown to avoid
 * breaking the primary operation.
 */
export async function logAudit(params: {
  workspaceId?: string;
  actorUserId: string;
  action: AuditAction;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      workspaceId: params.workspaceId || null,
      actorUserId: params.actorUserId,
      action: params.action,
      targetUserId: params.targetUserId || null,
      metadata: params.metadata || null,
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}
