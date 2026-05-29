import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import LandingClient from '@/components/LandingClient';

export const metadata: Metadata = {
  // Homepage uses the default 'Chimespace' title from root layout — no template suffix.
  // Leave title undefined here so the root default kicks in.
  description:
    'Tasks, chat, gallery, and whiteboards in one secure workspace. Built for small teams that want to ship without getting buried in tools.',
  openGraph: {
    title: 'Chimespace',
    description:
      'Tasks, chat, gallery, and whiteboards in one secure workspace.',
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
