'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { useAuth } from '@/hooks/useAuth';
import MembersList from '@/components/MembersList';
import InviteModal from '@/components/InviteModal';
import TransferOwnershipModal from '@/components/TransferOwnershipModal';
import AuditLogTable from '@/components/AuditLogTable';

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
  const { user } = useAuth();
  const workspaceId = params.id as string;

  const [ws, setWs] = useState<WorkspaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
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
    return <p className="text-ink-muted">Loading workspace…</p>;
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
        <h1 className="mb-2 text-2xl font-bold text-ink">
          {ws.name}
        </h1>
        <p className="text-sm text-ink-muted">
          Created on{' '}
          {new Date(ws.createdAt).toLocaleDateString()} · Your role:{' '}
          <strong>{ws.role}</strong>
        </p>
      </div>

      {/* Members */}
      <div className="mb-6 rounded-xl rounded-2xl border border-black/5 bg-paper-sunken p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">
            Members ({ws.memberCount})
          </h3>
          {(ws.role === 'OWNER' || ws.role === 'ADMIN') && (
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-lg inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
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

      {/* Ownership Transfer (OWNER only) */}
      {ws.role === 'OWNER' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-amber-900">
              Transfer Ownership
            </h3>
            <button
              onClick={() => setShowTransfer(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Transfer
            </button>
          </div>
          <p className="text-sm text-amber-700">
            Transfer this workspace to another member. You will be
            demoted to Admin.
          </p>
        </div>
      )}

      {/* Audit Logs (OWNER + ADMIN) */}
      {(ws.role === 'OWNER' || ws.role === 'ADMIN') && (
        <div className="mb-6 rounded-xl rounded-2xl border border-black/5 bg-paper-sunken p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">
              Audit Logs
            </h3>
            <button
              onClick={() => setShowAuditLogs((v) => !v)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
            >
              {showAuditLogs ? 'Hide' : 'Show'}
            </button>
          </div>
          {showAuditLogs && (
            <AuditLogTable workspaceId={workspaceId} />
          )}
        </div>
      )}

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
        currentUserRole={ws.role}
      />

      {user && (
        <TransferOwnershipModal
          isOpen={showTransfer}
          onClose={() => setShowTransfer(false)}
          workspaceId={workspaceId}
          currentUserId={user.id}
          onTransferred={() => {
            // Reload workspace details to reflect new role
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
