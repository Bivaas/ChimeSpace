import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IWhiteboard extends Document {
  workspaceId: Types.ObjectId;
  title: string;
  draftState: string;
  publishedState: string;
  draftUpdatedAt: Date | null;
  draftUpdatedBy: Types.ObjectId | null;
  publishedAt: Date | null;
  publishedBy: Types.ObjectId | null;
  sizeDraftBytes: number;
  sizePublishedBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_STATE_BYTES = 5 * 1024 * 1024; // 5 MB hard limit

const WhiteboardSchema = new Schema<IWhiteboard>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    draftState: {
      type: String,
      default: '{"elements":[],"appState":{}}',
      maxlength: MAX_STATE_BYTES,
    },
    publishedState: {
      type: String,
      default: '{"elements":[],"appState":{}}',
      maxlength: MAX_STATE_BYTES,
    },
    draftUpdatedAt: {
      type: Date,
      default: null,
    },
    draftUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sizeDraftBytes: {
      type: Number,
      default: 0,
    },
    sizePublishedBytes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for listing boards per workspace
WhiteboardSchema.index({ workspaceId: 1, createdAt: 1 });

const Whiteboard: Model<IWhiteboard> =
  mongoose.models.Whiteboard ||
  mongoose.model<IWhiteboard>('Whiteboard', WhiteboardSchema);

export default Whiteboard;
