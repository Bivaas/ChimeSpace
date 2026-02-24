'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/client/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onInvited: () => void;
  currentUserRole?: string;
}

export default function InviteModal({
  isOpen,
  onClose,
  workspaceId,
  onInvited,
  currentUserRole = 'MEMBER',
}: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ADMINs can only invite as MEMBER
  const canInviteAsAdmin = currentUserRole === 'OWNER';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await apiFetch<{ message: string; status: string }>(
      `/api/workspaces/${workspaceId}/invite`,
      { method: 'POST', body: JSON.stringify({ email, role }) }
    );

    setLoading(false);

    if (result.success) {
      setSuccess(result.data.message);
      setEmail('');
      onInvited();
    } else {
      setError(result.error.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold">Invite Member</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            {canInviteAsAdmin ? (
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'MEMBER' | 'ADMIN')
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600">
                Role: Member <span className="text-xs text-slate-400">(Admins can only invite members)</span>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
          {success && (
            <p className="mt-2 text-sm text-green-600">{success}</p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
