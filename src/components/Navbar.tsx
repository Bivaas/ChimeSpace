'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b border-black/5 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <span className="text-xs font-bold text-white tracking-tight">C</span>
          </div>
          <span className="font-display text-base font-semibold text-ink tracking-tight group-hover:text-accent transition-colors">
            Chimespace
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={28}
                  height={28}
                  className="rounded-full ring-1 ring-black/5"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden text-sm text-ink-muted sm:inline">
                {user.name}
              </span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-ink-faint transition-colors hover:text-ink-muted"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
