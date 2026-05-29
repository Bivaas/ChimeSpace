import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
// @ts-ignore - allow side-effect import of global CSS in Next.js app directory
import './globals.css';
import '@excalidraw/excalidraw/index.css';
const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
