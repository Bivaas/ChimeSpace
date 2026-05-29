import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { signUploadParams } from '@/lib/cloudinary';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import { connectDB } from '@/lib/db';
import GalleryImage from '@/models/GalleryImage';

interface RouteContext {
  params: { id: string };
}

const MAX_IMAGES_PER_WORKSPACE = 50;

/**
 * POST /api/workspaces/[id]/gallery/sign
 *
 * Returns signed Cloudinary upload params so the client can upload
 * directly to Cloudinary without exposing the API secret.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authenticateAndAuthorize(request, params.id);
    if (auth instanceof NextResponse) return auth;

    // Per-user gallery upload throttle (each signature → likely one Cloudinary call)
    const rl = await rateLimiter.check(
      `gallery_sign:${auth.user.userId}`,
      RATE_LIMITS.GALLERY_UPLOAD.limit,
      RATE_LIMITS.GALLERY_UPLOAD.windowMs
    );
    if (!rl.allowed) {
      return errorResponse(
        `Upload rate limit reached. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
        429
      );
    }

    // Enforce per-workspace cap before issuing a signature
    await connectDB();
    const count = await GalleryImage.countDocuments({ workspaceId: params.id });
    if (count >= MAX_IMAGES_PER_WORKSPACE) {
      return errorResponse(
        `Maximum of ${MAX_IMAGES_PER_WORKSPACE} images per workspace reached.`,
        409,
        'GALLERY_LIMIT_REACHED'
      );
    }

    const signed = signUploadParams(params.id);
    return successResponse(signed);
  } catch (err) {
    console.error('POST /api/workspaces/[id]/gallery/sign error:', err);
    return errorResponse('Internal server error', 500);
  }
}