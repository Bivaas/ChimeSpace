'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import GalleryGrid from '@/components/GalleryGrid';

export default function GalleryPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [role, setRole] = useState<string>('MEMBER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiFetch<{ role: string }>(
        `/api/workspaces/${workspaceId}`
      );
      if (res.success) setRole(res.data.role);
      setLoading(false);
    })();
  }, [workspaceId]);

  if (loading) return <p className="text-ink-muted">Loading…</p>;

  return <GalleryGrid workspaceId={workspaceId} userRole={role} />;
}