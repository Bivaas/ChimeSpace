'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { useAuth } from '@/hooks/useAuth';

interface WhiteboardSummary {
  _id: string;
  title: string;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WhiteboardsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const workspaceId = params.id as string;

  const [boards, setBoards] = useState<WhiteboardSummary[]>([]);
  const [maxBoards, setMaxBoards] = useState(2);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [role, setRole] = useState<string>('MEMBER');
  const [error, setError] = useState('');

  const fetchBoards = useCallback(async () => {
    const res = await apiFetch<{
      whiteboards: WhiteboardSummary[];
      maxBoards: number;
    }>(`/api/workspaces/${workspaceId}/whiteboards`);
    if (res.success) {
      setBoards(res.data.whiteboards);
      setMaxBoards(res.data.maxBoards);
    }
    setLoading(false);
  }, [workspaceId]);

  const fetchRole = useCallback(async () => {
    const res = await apiFetch<{
      _id: string;
      name: string;
      role: string;
    }>(`/api/workspaces/${workspaceId}`);
    if (res.success) setRole(res.data.role);
  }, [workspaceId]);

  useEffect(() => {
    fetchBoards();
    fetchRole();
  }, [fetchBoards, fetchRole]);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    const title = newTitle.trim() || 'Untitled Whiteboard';
    const res = await apiFetch<{ _id: string }>(
      `/api/workspaces/${workspaceId}/whiteboards`,
      {
        method: 'POST',
        body: JSON.stringify({ title }),
      }
    );
    if (res.success) {
      setShowCreate(false);
      setNewTitle('');
      fetchBoards();
    } else {
      setError(res.error.message);
    }
    setCreating(false);
  };

  const handleDelete = async (boardId: string, boardTitle: string) => {
    if (
      !confirm(`Delete "${boardTitle}"? This cannot be undone.`)
    )
      return;

    const res = await apiFetch(
      `/api/workspaces/${workspaceId}/whiteboards/${boardId}`,
      { method: 'DELETE' }
    );
    if (res.success) fetchBoards();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-ink-muted">
        Loading whiteboards…
      </div>
    );
  }

  const canDelete = role === 'OWNER' || role === 'ADMIN';
  const atLimit = boards.length >= maxBoards;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">
          Whiteboards
        </h1>
        {!atLimit && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
          >
            + New Whiteboard
          </button>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-black/5 bg-paper-raised p-6 shadow-soft-lg">
            <h2 className="mb-4 text-lg font-semibold text-ink">
              Create Whiteboard
            </h2>
            <input
              type="text"
              placeholder="Whiteboard title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
              maxLength={100}
              autoFocus
            />
            {error && (
              <p className="mb-3 text-sm text-red-600">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setError('');
                }}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97] disabled:opacity-50 disabled:transform-none"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {boards.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <svg
            className="mb-4 h-16 w-16 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
          <p className="mb-1 text-lg font-medium text-slate-600">
            No whiteboards yet
          </p>
          <p className="mb-6 text-sm text-slate-400">
            Create a whiteboard to start sketching ideas with your team.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
          >
            Create your first whiteboard
          </button>
        </div>
      )}

      {/* Board list */}
      {boards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {boards.map((b) => (
            <div
              key={b._id}
              className="group relative rounded-2xl border border-black/5 bg-paper-raised p-6 shadow-sm transition-all hover:shadow-md"
            >
              <h3 className="mb-2 truncate text-lg font-semibold text-ink">
                {b.title}
              </h3>
              <div className="mb-4 space-y-1 text-xs text-ink-muted">
                {b.publishedAt && (
                  <p>
                    Published:{' '}
                    {new Date(b.publishedAt).toLocaleString()}
                  </p>
                )}
                {b.draftUpdatedAt && (
                  <p>
                    Draft updated:{' '}
                    {new Date(b.draftUpdatedAt).toLocaleString()}
                  </p>
                )}
                {!b.publishedAt && !b.draftUpdatedAt && (
                  <p>
                    Created:{' '}
                    {new Date(b.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    router.push(
                      `/workspace/${workspaceId}/whiteboards/${b._id}`
                    )
                  }
                  className="inline-flex items-center rounded-xl bg-accent px-4 py-1.5 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
                >
                  Open
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(b._id, b.title)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Slot indicator */}
              {!b.publishedAt && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Draft only
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Limit indicator */}
      {boards.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          {boards.length} / {maxBoards} whiteboards used
        </p>
      )}
    </div>
  );
}
