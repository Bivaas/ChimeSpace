'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';

interface WorkspaceItem {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  role: string;
}

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-accent/10 text-accent',
  ADMIN: 'bg-accent/8 text-accent-600',
  MEMBER: 'bg-paper-sunken text-ink-muted',
};

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    const res = await apiFetch<WorkspaceItem[]>('/api/workspaces');
    if (res.success) setWorkspaces(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Your Workspaces
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage and access your team workspaces
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
        >
          + Create Workspace
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-ink-muted">Loading workspaces…</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-paper-raised py-16 text-center shadow-soft-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-sunken">
            <svg
              className="h-7 w-7 text-ink-faint"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-display text-base font-semibold text-ink">
            No workspaces yet
          </h3>
          <p className="mb-6 text-sm text-ink-muted">
            Create your first workspace to get started.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
          >
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <button
              key={ws._id}
              onClick={() => router.push(`/workspace/${ws._id}`)}
              className="rounded-2xl border border-black/5 bg-paper-raised p-6 text-left shadow-soft-sm transition-all hover:-translate-y-0.5 hover:shadow-soft hover:border-accent/20"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <span className="font-display font-semibold text-accent">
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-medium ${ROLE_BADGE[ws.role] ?? ''}`}
                >
                  {ws.role}
                </span>
              </div>
              <h3 className="mb-1 font-display font-semibold text-ink">
                {ws.name}
              </h3>
              <p className="text-xs text-ink-faint">
                Created{' '}
                {new Date(ws.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchWorkspaces}
      />
    </div>
  );
}
