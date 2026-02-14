import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITask extends Document {
  workspaceId: Types.ObjectId;
  title: string;
  description: string;
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>(
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
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['TODO', 'IN_PROGRESS', 'DONE'],
      default: 'TODO',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
