import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  ownerId: Types.ObjectId;
  createdAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace ||
  mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

export default Workspace;
