'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/client/api';

interface Member {
  memberId: string;
  userId: string;
  role: string;
  user: { email: string; name: string; avatar: string } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentUserId: string;
  onTransferred: () => void;
}

export default function TransferOwnershipModal({
  isOpen,
  onClose,
  workspaceId,
  currentUserId,
  onTransferred,
}: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedUserId('');
    setConfirmText('');
    setError('');

    (async () => {
      const res = await apiFetch<{ members: Member[]; pagination: unknown }>(
        `/api/workspaces/${workspaceId}/members`
      );
      if (res.success) {
        // Only show non-owner members as transfer targets
        setMembers(
          res.data.members.filter(
            (m) => m.userId !== currentUserId && m.role !== 'OWNER'
          )
        );
      }
    })();
  }, [isOpen, workspaceId, currentUserId]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || confirmText !== 'TRANSFER') return;

    setLoading(true);
    setError('');

    const res = await apiFetch(
      `/api/workspaces/${workspaceId}/transfer-ownership`,
      {
        method: 'POST',
        body: JSON.stringify({ newOwnerUserId: selectedUserId }),
      }
    );

    if (res.success) {
      onTransferred();
      onClose();
    } else {
      setError(
        res.error?.message || 'Failed to transfer ownership'
      );
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const selectedMember = members.find(
    (m) => m.userId === selectedUserId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Transfer Ownership
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          This will make another member the owner. You will be demoted
          to Admin. This action cannot be undone easily.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleTransfer}>
          {/* Member select */}
          <label className="mb-1 block text-sm font-medium text-slate-700">
            New Owner
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a member…</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user?.name || 'Unknown'} ({m.user?.email}) —{' '}
                {m.role}
              </option>
            ))}
          </select>

          {selectedMember && (
            <>
              <p className="mb-2 text-sm text-slate-600">
                To confirm, type{' '}
                <strong className="font-mono text-red-600">
                  TRANSFER
                </strong>{' '}
                below:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type TRANSFER to confirm"
                className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={
                loading ||
                !selectedUserId ||
                confirmText !== 'TRANSFER'
              }
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Transferring…' : 'Transfer Ownership'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
