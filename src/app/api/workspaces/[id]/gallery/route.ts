import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { saveGalleryImageSchema } from '@/lib/validation';
import { sanitizeInput } from '@/lib/sanitize';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import GalleryImage from '@/models/GalleryImage';

interface RouteContext {
  params: { id: string };
}

const MAX_IMAGES_PER_WORKSPACE = 50;

/**
 * GET /api/workspaces/[id]/gallery
 * Returns the list of images for a workspace (newest first).
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const images = await GalleryImage.find({ workspaceId: params.id })
      .select('publicId url width height bytes format title uploadedBy createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const result = images.map((img) => ({
      _id: img._id.toString(),
      publicId: img.publicId,
      url: img.url,
      width: img.width,
      height: img.height,
      bytes: img.bytes,
      format: img.format,
      title: img.title,
      uploadedBy: img.uploadedBy.toString(),
      createdAt: img.createdAt.toISOString(),
    }));

    return successResponse({
      images: result,
      maxImages: MAX_IMAGES_PER_WORKSPACE,
    });
  } catch (err) {
    console.error('GET /api/workspaces/[id]/gallery error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/workspaces/[id]/gallery
 * Persists metadata after a successful client-side Cloudinary upload.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    const rl = await rateLimiter.check(
      `gallery_save:${auth.user.userId}`,
      RATE_LIMITS.GALLERY_UPLOAD.limit,
      RATE_LIMITS.GALLERY_UPLOAD.windowMs
    );
    if (!rl.allowed) {
      return errorResponse(
        `Upload rate limit reached. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
        429
      );
    }

    const body = await request.json();
    const parsed = saveGalleryImageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    // Re-verify publicId belongs to this workspace's Cloudinary folder.
    // signUploadParams() uses folder `chimespace/{workspaceId}` so the
    // public_id Cloudinary returns must start with that path.
    if (!parsed.data.publicId.startsWith(`chimespace/${params.id}/`)) {
      return errorResponse('Image does not belong to this workspace', 403);
    }

    await connectDB();

    const count = await GalleryImage.countDocuments({ workspaceId: params.id });
    if (count >= MAX_IMAGES_PER_WORKSPACE) {
      return errorResponse(
        `Maximum of ${MAX_IMAGES_PER_WORKSPACE} images per workspace reached.`,
        409,
        'GALLERY_LIMIT_REACHED'
      );
    }

    const img = await GalleryImage.create({
      workspaceId: params.id,
      uploadedBy:  auth.user.userId,
      publicId:    parsed.data.publicId,
      url:         parsed.data.url,
      width:       parsed.data.width,
      height:      parsed.data.height,
      bytes:       parsed.data.bytes,
      format:      parsed.data.format,
      title:       sanitizeInput(parsed.data.title),
    });

    return successResponse(
      {
        _id: img._id.toString(),
        publicId: img.publicId,
        url: img.url,
        width: img.width,
        height: img.height,
        bytes: img.bytes,
        format: img.format,
        title: img.title,
        uploadedBy: img.uploadedBy.toString(),
        createdAt: img.createdAt.toISOString(),
      },
      201
    );
  } catch (err) {
    console.error('POST /api/workspaces/[id]/gallery error:', err);
    return errorResponse('Internal server error', 500);
  }
}