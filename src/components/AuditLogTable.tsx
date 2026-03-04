'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/client/api';

/* ── Types ─────────────────────────────────────────────────── */

interface AuditEntry {
  id: string;
  action: string;
  actorUserId: string;
  actor: { name: string; email: string } | null;
  targetUserId: string | null;
  target: { name: string; email: string } | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface Props {
  workspaceId: string;
}

/* ── Human-readable action labels ─────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  INVITE_SENT: 'Invite sent',
  INVITE_ACCEPTED: 'Invite accepted',
  MEMBER_REMOVED: 'Member removed',
  ROLE_CHANGED: 'Role changed',
  OWNERSHIP_TRANSFERRED: 'Ownership transferred',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  SESSION_REVOKED: 'Session revoked',
};

const ACTION_COLORS: Record<string, string> = {
  INVITE_SENT: 'bg-green-100 text-green-700',
  INVITE_ACCEPTED: 'bg-green-100 text-green-700',
  MEMBER_REMOVED: 'bg-red-100 text-red-700',
  ROLE_CHANGED: 'bg-yellow-100 text-yellow-700',
  OWNERSHIP_TRANSFERRED: 'bg-purple-100 text-purple-700',
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGOUT: 'bg-slate-100 text-slate-700',
  SESSION_REVOKED: 'bg-orange-100 text-orange-700',
};

/* ── Component ─────────────────────────────────────────────── */

export default function AuditLogTable({ workspaceId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ logs: AuditEntry[]; pagination: Pagination }>(
      `/api/workspaces/${workspaceId}/audit-logs?page=${page}&limit=20`
    );
    if (res.success) {
      setEntries(res.data.logs);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [workspaceId, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading && entries.length === 0) {
    return <p className="text-slate-500">Loading audit logs…</p>;
  }

  if (!loading && entries.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">
        No audit log entries yet.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">
                Action
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Actor
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Target
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      ACTION_COLORS[entry.action] ||
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {entry.actor?.name || entry.actorUserId}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {entry.target?.name || entry.targetUserId || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ·{' '}
            {pagination.total} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
