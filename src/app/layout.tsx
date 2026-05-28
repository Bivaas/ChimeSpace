import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
// @ts-ignore - allow side-effect import of global CSS in Next.js app directory
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Chimespace — Secure Team Collaboration',
  description:
    'Manage workspaces, tasks, and team communication in one secure platform. Google login, role-based access, and real-time collaboration.',
  keywords: [
    'secure team collaboration',
    'collaboration',
    'task management',
    'team chat',
    'RBAC',
    'Chimespace',
    'Chime Space',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
