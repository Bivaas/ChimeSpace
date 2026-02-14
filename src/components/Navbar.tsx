'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">W</span>
          </div>
          <span className="text-lg font-semibold text-slate-900">
            WorkspaceHub
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.avatar && (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="hidden text-sm text-slate-700 sm:inline">
                {user.name}
              </span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
