'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/client/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await apiFetch('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    setLoading(false);

    if (result.success) {
      setName('');
      onCreated();
      onClose();
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
        <h2 className="mb-4 font-display text-xl font-semibold text-ink">Create Workspace</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
            maxLength={100}
            required
            autoFocus
          />

          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
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
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
