'use client';

/**
 * Browser-side fetch wrapper.
 * Automatically attaches the CSRF token from the cookie.
 */

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^| )' + name + '=([^;]+)')
  );
  return match ? decodeURIComponent(match[2]) : null;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
> {
  const csrfToken = getCookie('csrf_token');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  });

  return response.json();
}
