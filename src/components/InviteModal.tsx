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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-black/5 bg-paper-raised p-6 shadow-soft-lg"
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
              className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
              required
              autoFocus
            />
            {canInviteAsAdmin ? (
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'MEMBER' | 'ADMIN')
                }
                className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
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
              className="px-4 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
            >
              {loading ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
