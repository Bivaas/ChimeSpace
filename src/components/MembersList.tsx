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
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-slate-100 text-slate-700',
};

export default function MembersList({
  workspaceId,
  currentUserRole,
  refreshTrigger,
}: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const result = await apiFetch<Member[]>(
      `/api/workspaces/${workspaceId}/members`
    );
    if (result.success) setMembers(result.data);
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
    return <p className="text-slate-500">Loading members…</p>;
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div
          key={m.memberId}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
                <span className="text-sm text-slate-500">?</span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-900">
                {m.user?.name || 'Unknown'}
              </p>
              <p className="text-xs text-slate-500">
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
