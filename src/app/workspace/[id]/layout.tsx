'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiFetch } from '@/lib/client/api';

interface WorkspaceInfo {
  _id: string;
  name: string;
  role: string;
  memberCount: number;
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const workspaceId = params.id as string;
  const [ws, setWs] = useState<WorkspaceInfo | null>(null);

  useEffect(() => {
    (async () => {
      const res = await apiFetch<WorkspaceInfo>(
        `/api/workspaces/${workspaceId}`
      );
      if (res.success) setWs(res.data);
    })();
  }, [workspaceId]);

  const nav = [
    { href: `/workspace/${workspaceId}`, label: 'Overview', icon: '📋' },
    {
      href: `/workspace/${workspaceId}/tasks`,
      label: 'Tasks',
      icon: '✅',
    },
    {
      href: `/workspace/${workspaceId}/chat`,
      label: 'Chat',
      icon: '💬',
    },
    {
      href: `/workspace/${workspaceId}/whiteboards`,
      label: 'Whiteboards',
      icon: '🎨',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="min-h-[calc(100vh-4rem)] w-64 border-r border-slate-200 bg-white p-4">
          <Link
            href="/dashboard"
            className="mb-6 flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600"
          >
            ← Back to Dashboard
          </Link>

          {ws && (
            <div className="mb-6">
              <h2 className="truncate font-semibold text-slate-900">
                {ws.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {ws.memberCount} member
                {ws.memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-blue-50 font-medium text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
