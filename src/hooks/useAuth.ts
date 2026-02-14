'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
}

/**
 * Client-side hook for authentication state.
 * Fetches /api/auth/me on mount and exposes user + logout.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.success ? data.data : null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Redirect to landing if on a protected page but not authenticated
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/dashboard') || p.startsWith('/workspace')) {
        window.location.href = '/';
      }
    }
  }, [loading, user]);

  const logout = useCallback(async () => {
    const csrfToken = getCookie('csrf_token');
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      credentials: 'same-origin',
    });
    setUser(null);
    window.location.href = '/';
  }, []);

  return { user, loading, logout, refetch: fetchUser };
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^| )' + name + '=([^;]+)')
  );
  return match ? decodeURIComponent(match[2]) : null;
}
