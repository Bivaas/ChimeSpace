import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

export interface SignedUploadParams {
  cloudName: string;
  apiKey:    string;
  timestamp: number;
  signature: string;
  folder:    string;
  maxFileSize: number;
  allowedFormats: string;
}

/**
 * Generates signed upload parameters for direct browser-to-Cloudinary upload.
 * The client uses these to POST the file directly; our server never sees the bytes.
 */
export function signUploadParams(workspaceId: string): SignedUploadParams {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `chimespace/${workspaceId}`;
  const allowedFormats = 'jpg,jpeg,png,webp,gif';
  const maxFileSize = 10 * 1024 * 1024; // 10 MB

  // Params to sign (alphabetical order, exclude file/api_key/resource_type/cloud_name)
  const paramsToSign: Record<string, string | number> = {
    allowed_formats: allowedFormats,
    folder,
    max_file_size:   maxFileSize,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey:    process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder,
    maxFileSize,
    allowedFormats,
  };
}

/**
 * Delete an image from Cloudinary by its public_id.
 * Errors are logged but not re-thrown — DB delete should still succeed.
 */
export async function destroyAsset(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error('Cloudinary destroy failed for', publicId, err);
  }
}