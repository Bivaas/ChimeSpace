import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WorkspaceHub — Secure Team Collaboration Platform',
  description:
    'Manage your team with secure workspaces, real-time task management, and team communication. Built with security-first design.',
  openGraph: {
    title: 'WorkspaceHub — Secure Team Collaboration Platform',
    description:
      'Manage your team with secure workspaces, real-time task management, and team communication.',
    type: 'website',
  },
};

const features = [
  {
    icon: '🔒',
    title: 'Secure by Design',
    description:
      'Enterprise-grade security with OAuth 2.0, encrypted sessions, and role-based access control.',
  },
  {
    icon: '👥',
    title: 'Team Workspaces',
    description:
      'Create dedicated workspaces for your teams. Invite members and manage roles effortlessly.',
  },
  {
    icon: '✅',
    title: 'Task Management',
    description:
      'Organize work with intuitive task boards. Track progress from To Do to Done.',
  },
  {
    icon: '💬',
    title: 'Team Chat',
    description:
      'Communicate with your team directly within each workspace. Keep discussions focused.',
  },
  {
    icon: '🎯',
    title: 'Role-Based Access',
    description:
      'Fine-grained permissions with Owner, Admin, and Member roles. Control who can do what.',
  },
  {
    icon: '🚀',
    title: 'Built for Scale',
    description:
      'Designed for growth. Start free and scale as your team expands.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">W</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">
              WorkspaceHub
            </span>
          </div>
          <Link
            href="/api/auth/google"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Login with Google
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="mb-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Collaborate securely.
          <br />
          <span className="text-blue-600">Ship faster.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 sm:text-xl">
          WorkspaceHub brings your team together with secure workspaces,
          task management, and real-time communication — all in one place.
        </p>
        <Link
          href="/api/auth/google"
          className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-8 py-4 text-lg font-medium text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-700"
        >
          <GoogleIcon />
          Login with Google
        </Link>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-center text-3xl font-bold text-slate-900">
            Everything you need to collaborate
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-slate-600">
            Built with security and simplicity in mind. No complexity, no
            compromises.
          </p>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} WorkspaceHub. Built with security
            in mind.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Inline Google SVG icon ──────────────────────────────── */

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
