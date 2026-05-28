'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { apiFetch } from '@/lib/client/api';

interface Member {
  memberId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { email: string; name: string; avatar: string } | null;
}

interface Props {
  workspaceId: string;
  currentUserRole: string;
  refreshTrigger?: number;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-accent/10 text-accent',
  ADMIN: 'bg-accent/8 text-accent-600',
  MEMBER: 'bg-paper-sunken text-ink-muted',
};

export default function MembersList({
  workspaceId,
  currentUserRole,
  refreshTrigger,
}: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const result = await apiFetch<{ members: Member[]; pagination: { total: number } }>(
      `/api/workspaces/${workspaceId}/members`
    );
    if (result.success) setMembers(result.data.members);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers, refreshTrigger]);

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;

    const result = await apiFetch(
      `/api/workspaces/${workspaceId}/members?userId=${userId}`,
      { method: 'DELETE' }
    );
    if (result.success) fetchMembers();
  };

  if (loading) {
    return <p className="text-ink-muted">Loading members…</p>;
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div
          key={m.memberId}
          className="flex items-center justify-between rounded-xl border border-black/5 bg-paper-raised p-3"
        >
          <div className="flex items-center gap-3">
            {m.user?.avatar ? (
              <Image
                src={m.user.avatar}
                alt=""
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-sunken">
                <span className="text-sm text-ink-muted">?</span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-ink">
                {m.user?.name || 'Unknown'}
              </p>
              <p className="text-xs text-ink-muted">
                {m.user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${ROLE_COLORS[m.role] ?? ''}`}
            >
              {m.role}
            </span>
            {/* OWNER can remove anyone except OWNER, ADMIN can remove MEMBER only */}
            {((currentUserRole === 'OWNER' && m.role !== 'OWNER') ||
              (currentUserRole === 'ADMIN' && m.role === 'MEMBER')) && (
              <button
                onClick={() => removeMember(m.userId)}
                className="ml-2 text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
