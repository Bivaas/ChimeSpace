import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { AuditAction } from '@/types';

export interface IAuditLog extends Document {
  workspaceId?: Types.ObjectId;
  actorUserId: Types.ObjectId;
  action: AuditAction;
  targetUserId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true,
      default: null,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'INVITE_SENT',
        'INVITE_ACCEPTED',
        'MEMBER_REMOVED',
        'ROLE_CHANGED',
        'OWNERSHIP_TRANSFERRED',
        'LOGIN',
        'LOGOUT',
        'SESSION_REVOKED',
      ],
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for workspace-level audit queries
AuditLogSchema.index({ workspaceId: 1, createdAt: -1 });

// TTL index: auto-delete logs older than 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
