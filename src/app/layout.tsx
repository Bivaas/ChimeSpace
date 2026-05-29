import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
// @ts-ignore - allow side-effect import of global CSS in Next.js app directory
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  title: {
    default: 'Chimespace',
    template: '%s · Chimespace',
  },
  description:
    'A small, secure place for teams to track tasks, chat, share images, and sketch on whiteboards together.',
  applicationName: 'Chimespace',
  authors: [{ name: 'Chimespace' }],
  keywords: [
    'team workspaces',
    'task tracking',
    'team chat',
    'whiteboards',
    'image gallery',
    'collaboration',
    'Chimespace',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    siteName: 'Chimespace',
    title: 'Chimespace',
    description:
      'A small, secure place for teams to track tasks, chat, share images, and sketch on whiteboards.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chimespace',
    description:
      'A small, secure place for teams to track tasks, chat, share images, and sketch on whiteboards.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)',  color: '#0A0A0B' },
  ],
  width: 'device-width',
  initialScale: 1,
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