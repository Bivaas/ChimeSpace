import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateObjectId } from '@/lib/validation';
import { destroyAsset } from '@/lib/cloudinary';
import GalleryImage from '@/models/GalleryImage';

interface RouteContext {
  params: { id: string; imageId: string };
}

/**
 * DELETE /api/workspaces/[id]/gallery/[imageId]
 *
 * Uploader, OWNER or ADMIN may delete an image.
 * Removes from both MongoDB and Cloudinary.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!validateObjectId(params.imageId)) {
      return errorResponse('Invalid image ID', 400);
    }

    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const img = await GalleryImage.findOne({
      _id: params.imageId,
      workspaceId: params.id,
    });

    if (!img) {
      return errorResponse('Image not found in this workspace', 404);
    }

    // Permission: uploader OR workspace OWNER/ADMIN
    const isUploader = img.uploadedBy.toString() === auth.user.userId;
    const isStaff = auth.role === 'OWNER' || auth.role === 'ADMIN';
    if (!isUploader && !isStaff) {
      return errorResponse(
        'Only the uploader or a workspace admin can delete this image',
        403
      );
    }

    const publicId = img.publicId;

    await img.deleteOne();
    // Fire-and-forget; destroyAsset swallows its own errors and logs them
    await destroyAsset(publicId);

    return successResponse({ message: 'Image deleted' });
  } catch (err) {
    console.error('DELETE /api/workspaces/[id]/gallery/[imageId] error:', err);
    return errorResponse('Internal server error', 500);
  }
}