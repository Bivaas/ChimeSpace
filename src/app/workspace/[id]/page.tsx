'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import MembersList from '@/components/MembersList';
import InviteModal from '@/components/InviteModal';

interface WorkspaceDetails {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  role: string;
}

export default function WorkspaceOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [ws, setWs] = useState<WorkspaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiFetch<WorkspaceDetails>(
        `/api/workspaces/${workspaceId}`
      );
      if (res.success) setWs(res.data);
      setLoading(false);
    })();
  }, [workspaceId]);

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this workspace? This action cannot be undone.'
      )
    )
      return;

    setDeleting(true);
    const res = await apiFetch(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
    if (res.success) router.push('/dashboard');
    setDeleting(false);
  };

  if (loading)
    return <p className="text-slate-500">Loading workspace…</p>;
  if (!ws)
    return (
      <p className="text-red-500">
        Workspace not found or access denied.
      </p>
    );

  return (
    <div>
      {/* Title */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          {ws.name}
        </h1>
        <p className="text-sm text-slate-500">
          Created on{' '}
          {new Date(ws.createdAt).toLocaleDateString()} · Your role:{' '}
          <strong>{ws.role}</strong>
        </p>
      </div>

      {/* Members */}
      <div className="mb-6 rounded-xl bg-slate-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Members ({ws.memberCount})
          </h3>
          {ws.role === 'OWNER' && (
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Invite Member
            </button>
          )}
        </div>
        <MembersList
          workspaceId={workspaceId}
          currentUserRole={ws.role}
          refreshTrigger={refreshKey}
        />
      </div>

      {/* Danger zone */}
      {ws.role === 'OWNER' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-red-900">
            Danger Zone
          </h3>
          <p className="mb-4 text-sm text-red-700">
            Deleting this workspace will permanently remove all tasks,
            messages, and member associations.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Workspace'}
          </button>
        </div>
      )}

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        workspaceId={workspaceId}
        onInvited={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
