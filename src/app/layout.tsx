import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WorkspaceHub — Secure Team Collaboration',
  description:
    'Manage workspaces, tasks, and team communication in one secure platform. Google login, role-based access, and real-time collaboration.',
  keywords: [
    'workspace',
    'collaboration',
    'task management',
    'team chat',
    'RBAC',
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
