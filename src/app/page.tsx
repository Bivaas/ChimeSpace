import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import LandingClient from '@/components/LandingClient';

export const metadata: Metadata = {
  title: 'Chimespace — Secure Team Collaboration Platform',
  description:
    'Manage your team with secure workspaces, real-time task management, and team communication. Built with security-first design.',
  openGraph: {
    title: 'Chimespace — Secure Team Collaboration Platform',
    description:
      'Manage your team with secure workspaces, real-time task management, and team communication.',
    type: 'website',
  },
};

export default async function LandingPage() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has('session_token');

  return (
    <div className="min-h-screen bg-paper">
      <LandingClient isLoggedIn={isLoggedIn} />
    </div>
  );
}
