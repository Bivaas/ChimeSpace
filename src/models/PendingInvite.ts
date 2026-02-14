import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPendingInvite extends Document {
  email: string;
  workspaceId: Types.ObjectId;
  role: 'ADMIN' | 'MEMBER';
  invitedBy: Types.ObjectId;
  createdAt: Date;
}

const PendingInviteSchema = new Schema<IPendingInvite>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['ADMIN', 'MEMBER'],
      default: 'MEMBER',
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One invite per email per workspace
PendingInviteSchema.index({ email: 1, workspaceId: 1 }, { unique: true });

// Auto-delete stale invites after 30 days
PendingInviteSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

const PendingInvite: Model<IPendingInvite> =
  mongoose.models.PendingInvite ||
  mongoose.model<IPendingInvite>('PendingInvite', PendingInviteSchema);

export default PendingInvite;
