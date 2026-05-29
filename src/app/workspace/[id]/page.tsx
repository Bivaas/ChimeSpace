'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserPlus, ArrowRightLeft, ChevronDown, FileText } from 'lucide-react';
import { apiFetch } from '@/lib/client/api';
import { useAuth } from '@/hooks/useAuth';
import MembersList from '@/components/MembersList';
import InviteModal from '@/components/InviteModal';
import TransferOwnershipModal from '@/components/TransferOwnershipModal';
import AuditLogTable from '@/components/AuditLogTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface WorkspaceDetails {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  role: string;
}

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-accent/10 text-accent',
  ADMIN: 'bg-accent/8 text-accent',
  MEMBER: 'bg-ink/5 text-ink-muted',
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysSince(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  const months = Math.floor(d / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(d / 365);
  return `${years} yr ago`;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setShowDeleteConfirm(false);
    setDeleting(true);
    const res = await apiFetch(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      router.push('/dashboard');
      return;
    }
    setDeleting(false);
  };

  /* ── Loading skeleton ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-ink/5" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-56 rounded bg-ink/5" />
            <div className="h-3 w-72 rounded bg-ink/5" />
          </div>
        </div>
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="h-20 rounded-2xl bg-ink/5" />
          <div className="h-20 rounded-2xl bg-ink/5" />
          <div className="h-20 rounded-2xl bg-ink/5" />
        </div>
        <div className="h-64 rounded-2xl bg-ink/5" />
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="rounded-2xl border border-black/5 bg-paper-raised p-8 text-center">
        <p className="text-sm text-ink-muted">
          Workspace not found or access denied.
        </p>
      </div>
    );
  }

  const isOwner = ws.role === 'OWNER';
  const isStaff = isOwner || ws.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* ── Header: monogram + name + role + meta ─────────── */}
      <header className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/70 font-display text-lg font-bold text-white shadow-soft-sm">
          {initialsOf(ws.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              {ws.name}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_BADGE[ws.role] ?? ''}`}
            >
              {ws.role}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Created {daysSince(ws.createdAt)} ·{' '}
            {new Date(ws.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </header>

      {/* ── Quick stats ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/5 bg-paper-raised p-4">
          <div className="font-display text-2xl font-bold text-ink">
            {ws.memberCount}
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-faint">
            {ws.memberCount === 1 ? 'Member' : 'Members'}
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-paper-raised p-4">
          <div className="font-display text-2xl font-bold text-ink">
            {ws.role}
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-faint">
            Your role
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-paper-raised p-4">
          <div className="font-display text-2xl font-bold text-ink">
            {daysSince(ws.createdAt).replace(' ago', '')}
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-faint">
            Workspace age
          </div>
        </div>
      </div>

      {/* ── Members ────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-black/5 bg-paper-raised">
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Members
            </h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              People with access to this workspace
            </p>
          </div>
          {isStaff && (
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2} />
              Invite
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          <MembersList
            workspaceId={workspaceId}
            currentUserRole={ws.role}
            refreshTrigger={refreshKey}
          />
        </div>
      </section>

      {/* ── Activity (audit log) ──────────────────────────── */}
      {isStaff && (
        <section className="overflow-hidden rounded-2xl border border-black/5 bg-paper-raised">
          <button
            onClick={() => setShowAuditLogs((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-ink/4"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />
              <div>
                <h2 className="font-display text-base font-semibold text-ink">
                  Activity log
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  Recent actions in this workspace
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-ink-faint transition-transform ${
                showAuditLogs ? 'rotate-180' : ''
              }`}
              strokeWidth={2}
            />
          </button>
          {showAuditLogs && (
            <div className="border-t border-black/5 px-6 py-4">
              <AuditLogTable workspaceId={workspaceId} />
            </div>
          )}
        </section>
      )}

      {/* ── Owner-only settings ───────────────────────────── */}
      {isOwner && (
        <section className="overflow-hidden rounded-2xl border border-black/5 bg-paper-raised">
          <div className="border-b border-black/5 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-ink">
              Workspace settings
            </h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              Owner-only controls
            </p>
          </div>
          <div className="divide-y divide-black/5">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-start gap-3">
                <ArrowRightLeft className="mt-0.5 h-4 w-4 text-ink-faint" strokeWidth={1.75} />
                <div>
                  <div className="text-sm font-medium text-ink">
                    Transfer ownership
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    Hand this workspace to another member. You become an Admin.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTransfer(true)}
                className="rounded-xl border border-black/8 px-3.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/4 hover:text-ink"
              >
                Transfer
              </button>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-sm font-medium text-ink">
                  Delete workspace
                </div>
                <div className="mt-0.5 text-xs text-ink-faint">
                  Permanently removes tasks, messages, whiteboards, gallery, and member access.
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="rounded-xl border border-red-200 px-3.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </section>
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
            window.location.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete workspace"
        message={`Delete "${ws.name}"? This permanently removes all tasks, messages, whiteboards, and member associations. This cannot be undone.`}
        confirmLabel="Delete workspace"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}