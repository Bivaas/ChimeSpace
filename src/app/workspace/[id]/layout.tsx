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
    { href: `/workspace/${workspaceId}`, label: 'Overview' },
    { href: `/workspace/${workspaceId}/tasks`, label: 'Tasks' },
    { href: `/workspace/${workspaceId}/chat`, label: 'Chat' },
    { href: `/workspace/${workspaceId}/whiteboards`, label: 'Whiteboards' },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="min-h-[calc(100vh-3.5rem)] w-60 border-r border-black/5 bg-paper-raised p-4">
          <Link
            href="/dashboard"
            className="mb-6 flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-accent"
          >
            ← Dashboard
          </Link>

          {ws && (
            <div className="mb-6">
              <h2 className="truncate font-display text-sm font-semibold text-ink">
                {ws.name}
              </h2>
              <p className="mt-1 text-xs text-ink-faint">
                {ws.memberCount} member
                {ws.memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <nav className="space-y-0.5">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-xl px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-accent/8 font-medium text-accent'
                      : 'text-ink-muted hover:bg-paper-sunken hover:text-ink'
                  }`}
                >
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
