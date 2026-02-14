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
  OWNER: 'bg-purple-50 text-purple-600',
  ADMIN: 'bg-blue-50 text-blue-600',
  MEMBER: 'bg-slate-50 text-slate-600',
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
          <h1 className="text-2xl font-bold text-slate-900">
            Your Workspaces
          </h1>
          <p className="mt-1 text-slate-500">
            Manage and access your team workspaces
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create Workspace
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">Loading workspaces…</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg
              className="h-8 w-8 text-slate-400"
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
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No workspaces yet
          </h3>
          <p className="mb-6 text-slate-500">
            Create your first workspace to get started.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
              className="rounded-xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <span className="font-semibold text-blue-600">
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${ROLE_BADGE[ws.role] ?? ''}`}
                >
                  {ws.role}
                </span>
              </div>
              <h3 className="mb-1 font-semibold text-slate-900">
                {ws.name}
              </h3>
              <p className="text-xs text-slate-400">
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
