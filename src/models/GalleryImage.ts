import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IGalleryImage extends Document {
  workspaceId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  publicId: string;        // Cloudinary public_id (for deletion / transforms)
  url: string;             // Secure HTTPS URL
  width: number;
  height: number;
  bytes: number;
  format: string;          // jpg | png | webp | gif | ...
  title: string;           // Optional caption (max 200 chars)
  createdAt: Date;
  updatedAt: Date;
}

const GalleryImageSchema = new Schema<IGalleryImage>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publicId: { type: String, required: true, unique: true },
    url:      { type: String, required: true },
    width:    { type: Number, required: true, min: 1 },
    height:   { type: Number, required: true, min: 1 },
    bytes:    { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    format:   { type: String, required: true, maxlength: 10 },
    title:    { type: String, default: '', trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

GalleryImageSchema.index({ workspaceId: 1, createdAt: -1 });

const GalleryImage: Model<IGalleryImage> =
  mongoose.models.GalleryImage ||
  mongoose.model<IGalleryImage>('GalleryImage', GalleryImageSchema);

export default GalleryImage;