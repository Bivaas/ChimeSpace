'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { apiFetch } from '@/lib/client/api';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface GalleryImage {
  _id: string;
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  title: string;
  uploadedBy: string;
  createdAt: string;
}

interface SignedParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
}

interface Props {
  workspaceId: string;
  userRole: string;
}

export default function GalleryGrid({ workspaceId, userRole }: Props) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [maxImages, setMaxImages] = useState(50);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    const res = await apiFetch<{ images: GalleryImage[]; maxImages: number }>(
      `/api/workspaces/${workspaceId}/gallery`
    );
    if (res.success) {
      setImages(res.data.images);
      setMaxImages(res.data.maxImages);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

const handleFile = async (file: File) => {
    setUploadError('');

    // Reject oversized files before bothering the server/Cloudinary
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be 10 MB or smaller.');
      return;
    }

    setUploading(true);
    // ... rest unchanged

    // 1. Ask our server for signed Cloudinary upload params
    const signRes = await apiFetch<SignedParams>(
      `/api/workspaces/${workspaceId}/gallery/sign`,
      { method: 'POST' }
    );
    if (!signRes.success) {
      setUploadError(signRes.error.message);
      setUploading(false);
      return;
    }
    const s = signRes.data;

    // 2. Upload file directly at Cloudinary
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', s.apiKey);
    form.append('timestamp', String(s.timestamp));
    form.append('signature', s.signature);
    form.append('folder', s.folder);
    form.append('allowed_formats', s.allowedFormats);

    const cloudUrl = `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`;
    let cloudData: {
      public_id: string;
      secure_url: string;
      width: number;
      height: number;
      bytes: number;
      format: string;
    };
    try {
      const r = await fetch(cloudUrl, { method: 'POST', body: form });
      if (!r.ok) throw new Error(`Upload failed (${r.status})`);
      cloudData = await r.json();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      return;
    }

    // 3. Persist metadata in our DB
    const saveRes = await apiFetch<GalleryImage>(
      `/api/workspaces/${workspaceId}/gallery`,
      {
        method: 'POST',
        body: JSON.stringify({
          publicId: cloudData.public_id,
          url: cloudData.secure_url,
          width: cloudData.width,
          height: cloudData.height,
          bytes: cloudData.bytes,
          format: cloudData.format,
          title: '',
        }),
      }
    );
    if (saveRes.success) {
      setImages((prev) => [saveRes.data, ...prev]);
    } else {
      setUploadError(saveRes.error.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete._id;
    setDeleting(true);
    const res = await apiFetch(
      `/api/workspaces/${workspaceId}/gallery/${id}`,
      { method: 'DELETE' }
    );
    if (res.success) {
      setImages((prev) => prev.filter((i) => i._id !== id));
    }
    setDeleting(false);
    setPendingDelete(null);
  };

  if (loading) {
    return <p className="text-ink-muted">Loading gallery…</p>;
  }

  const atLimit = images.length >= maxImages;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">Gallery</h2>
          <p className="mt-0.5 text-xs text-ink-faint">
            {images.length} / {maxImages} images · jpg, png, webp, gif up to 10 MB
          </p>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97] ${
            atLimit || uploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {uploading ? 'Uploading…' : 'Upload Image'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={atLimit || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      </div>

      {uploadError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </p>
      )}

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 py-20 text-center">
          <p className="mb-1 text-lg font-medium text-ink-muted">No images yet</p>
          <p className="text-sm text-ink-faint">
            Upload your first image to start a shared gallery.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div
              key={img._id}
              className="group relative overflow-hidden rounded-2xl border border-black/5 bg-paper-raised shadow-soft-sm transition-shadow hover:shadow-soft"
            >
              <div className="relative aspect-square">
                <Image
                  src={img.url}
                  alt={img.title || 'Gallery image'}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px] text-ink-faint">
                  {(img.bytes / 1024).toFixed(0)} KB · {img.format}
                </span>
                <button
                  onClick={() => setPendingDelete(img)}
                  className="rounded-md px-2 py-1 text-[11px] text-red-500 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete image"
        message="Delete this image? It will be removed from the gallery and from cloud storage. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}