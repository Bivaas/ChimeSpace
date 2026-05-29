'use client';

import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { useRef, useState } from 'react';
import { Shield, Users, CircleCheck, MessageSquare, PenTool, Image as ImageIcon } from 'lucide-react';
import Reveal from '@/components/motion/Reveal';

/* ── Types ───────────────────────────────────────────────────── */

interface Props {
  isLoggedIn: boolean;
}

/* ── Feature data ────────────────────────────────────────────── */

const features = [
  {
    Icon: Shield,
    title: 'Secure by Design',
    description: 'Enterprise-grade security with OAuth 2.0, encrypted sessions, and role-based access control.',
  },
  {
    Icon: Users,
    title: 'Team Workspaces',
    description: 'Create dedicated workspaces for your teams. Invite members and manage roles effortlessly.',
  },
  {
    Icon: CircleCheck,
    title: 'Task Management',
    description: 'Organize work with intuitive task boards. Track progress from To Do to Done.',
  },
  {
    Icon: MessageSquare,
    title: 'Team Chat',
    description: 'Communicate with your team directly within each workspace. Keep discussions focused.',
  },
 {
    Icon: PenTool,
    title: 'Visual Whiteboards',
    description: 'Sketch ideas, diagram systems, plan together. Drafts autosave, publish when ready.',
  },
  {
    Icon: ImageIcon,
    title: 'Shared Gallery',
    description: 'Upload reference images, mockups, and screenshots. Organized per workspace.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Create a workspace',
    body: 'Sign in with Google and create a workspace in seconds. No setup required.',
  },
  {
    n: '02',
    title: 'Invite your team',
    body: 'Add team members by email. Assign roles — Owner, Admin, or Member.',
  },
  {
    n: '03',
    title: 'Start collaborating',
    body: 'Manage tasks, chat, draw on whiteboards, and ship together.',
  },
];

/* ── StickyNav ───────────────────────────────────────────────── */

function ChimeMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="14" r="2" fill="currentColor" />
      <path
        d="M 8 14 A 4 4 0 0 1 16 14"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 5 14 A 7 7 0 0 1 19 14"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function NavContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="group flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <ChimeMark className="h-6 w-6 text-accent" />
        <span className="font-display text-base font-semibold text-ink tracking-tight">
          Chimespace
        </span>
      </Link>
      {isLoggedIn ? (
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
        >
          Go to Dashboard
        </Link>
      ) : (
        <Link
          href="/api/auth/google"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

function StickyNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { scrollY } = useScroll();
  const shouldReduce = useReducedMotion();

  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.92]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  if (shouldReduce) {
    return (
      <header className="sticky top-0 z-40 border-b border-black/5 bg-paper/90 backdrop-blur-md">
        <NavContent isLoggedIn={isLoggedIn} />
      </header>
    );
  }

  return (
    <motion.header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: bgOpacity ? undefined : undefined,
      }}
    >
      <motion.div
        className="absolute inset-x-0 inset-y-0 bg-paper/92"
        style={{ opacity: bgOpacity }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-px bg-black/5"
        style={{ opacity: borderOpacity }}
      />
      <div className="relative z-10">
        <NavContent isLoggedIn={isLoggedIn} />
      </div>
    </motion.header>
  );
}

/* ── Hero ────────────────────────────────────────────────────── */

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const shouldReduce = useReducedMotion();
  const { scrollY } = useScroll();
  const blobY = useTransform(scrollY, [0, 500], [0, 80]);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
  };

  const lineVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
  };

  const ctaBlock = isLoggedIn ? (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-3 rounded-2xl bg-accent px-8 py-4 text-lg font-medium text-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.97]"
    >
      Go to Dashboard
    </Link>
  ) : (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <Link
        href="/api/auth/google"
        className="inline-flex items-center gap-3 rounded-2xl bg-accent px-8 py-4 text-lg font-medium text-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.97]"
      >
        <GoogleIcon />
        Continue with Google
      </Link>
      <a
        href="#features"
        className="rounded-2xl border border-black/10 px-6 py-4 text-base font-medium text-ink-muted transition-all hover:bg-paper-sunken hover:text-ink"
      >
        Learn more
      </a>
    </div>
  );

  if (shouldReduce) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Collaborate securely.
          <br />
          <span className="text-accent">Ship faster.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-ink-muted sm:text-xl">
         Workspaces, tasks, chat, image galleries, and whiteboards —
          everything your team needs to ship, in one secure place.
        </p>
        {ctaBlock}
      </section>
    );
  }

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 py-24 text-center sm:px-6 lg:px-8">
      {/* Parallax background blob */}
      <motion.div
        style={{ y: blobY }}
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        aria-hidden
      >
        <div className="h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative"
      >
        <motion.h1
          variants={lineVariants}
          className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl"
        >
          Collaborate securely.
          <br />
          <span className="text-accent">Ship faster.</span>
        </motion.h1>

        <motion.p
          variants={lineVariants}
          className="mx-auto mb-10 max-w-2xl text-lg text-ink-muted sm:text-xl"
        >
          Chimespace brings your team together with secure workspaces, task management,
          real-time communication and creative spaces.
        </motion.p>

        <motion.div variants={lineVariants}>
          {ctaBlock}
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ── Trust strip ─────────────────────────────────────────────── */

function TrustStrip() {
  const items = ['OAuth 2.0', 'RBAC', 'Encrypted sessions', 'Zero-trust design'];

  return (
    <section className="border-y border-black/5 bg-paper-sunken py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8">
          {items.map((item, i) => (
            <Reveal key={item} delay={i * 0.08}>
              <span className="text-sm font-medium text-ink-muted">{item}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Features ────────────────────────────────────────────────── */

function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-16 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-ink">
            Everything you need to collaborate
          </h2>
          <p className="mx-auto max-w-xl text-ink-muted">
            Built with security and simplicity in mind. Collaborate with confidence, efficiently.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 0.07}>
              <div className="h-full rounded-2xl border border-black/5 bg-paper-raised p-6 shadow-soft-sm transition-shadow hover:shadow-soft">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/8 text-accent">
                  <Icon size={18} strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 font-display text-base font-semibold text-ink">{title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ────────────────────────────────────────────── */

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.5'] });
  const shouldReduce = useReducedMotion();

  return (
    <section className="bg-paper-sunken py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-16 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-ink">
            How it works
          </h2>
          <p className="text-ink-muted">Three steps to better collaboration.</p>
        </Reveal>

        <div ref={ref} className="relative">
          {/* Progress fill line */}
          {!shouldReduce && (
            <div className="absolute left-8 top-10 bottom-10 hidden w-px bg-black/5 sm:block">
              <motion.div
                className="absolute inset-x-0 top-0 bg-accent"
                style={{ scaleY: scrollYProgress, originY: 0, height: '100%' }}
              />
            </div>
          )}

          <div className="space-y-12">
            {steps.map(({ n, title, body }, i) => (
              <Reveal key={n} delay={i * 0.1} className="relative flex items-start gap-6 sm:gap-8">
                <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-paper-raised shadow-soft-sm font-display text-lg font-bold text-accent">
                  {n}
                </div>
                <div className="pt-3">
                  <h3 className="mb-1 font-display text-lg font-semibold text-ink">{title}</h3>
                  <p className="text-sm text-ink-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Preview card (tilt on hover) ────────────────────────────── */
/* ── Interactive preview panels ──────────────────────────────── */

const PREVIEW_TABS = ['Overview', 'Tasks', 'Chat', 'Gallery', 'Whiteboards'] as const;
type PreviewTab = (typeof PREVIEW_TABS)[number];

function PreviewPanel({ tab }: { tab: PreviewTab }) {
  if (tab === 'Overview') {
    const stats = [
      { label: 'Open tasks', value: '12' },
      { label: 'Members', value: '6' },
      { label: 'Images', value: '24' },
    ];
    const activity = [
      { who: 'Alex',  what: 'created task “Review pricing page”', when: '2m' },
      { who: 'Sarah', what: 'commented in #general',              when: '14m' },
      { who: 'Mike',  what: 'published a whiteboard',             when: '1h' },
    ];
    return (
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-black/5 p-4">
            <div className="font-display text-2xl font-bold text-ink">{s.value}</div>
            <div className="mt-1 text-[11px] text-ink-faint">{s.label}</div>
          </div>
        ))}
        <div className="col-span-3 mt-1 rounded-xl border border-black/5 p-4">
          <div className="mb-3 text-[11px] font-medium text-ink-faint">Recent activity</div>
          {activity.map((a, i) => (
            <div key={i} className="mb-2 flex items-center gap-2 last:mb-0">
              <div className="h-6 w-6 shrink-0 rounded-full bg-accent/15" />
              <div className="flex-1 truncate text-xs text-ink-muted">
                <span className="font-medium text-ink">{a.who}</span> {a.what}
              </div>
              <span className="text-[10px] text-ink-faint">{a.when}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'Tasks') {
    const cols = [
      { title: 'To Do',       accent: 'bg-ink/5 text-ink-faint',         tasks: ['Review Q4 roadmap', 'Update brand guidelines'] },
      { title: 'In Progress', accent: 'bg-accent/10 text-accent',        tasks: ['Design pricing page'] },
      { title: 'Done',        accent: 'bg-emerald-100 text-emerald-700', tasks: ['Launch beta sign-up', 'Onboard new hires'] },
    ];
    return (
      <div className="grid grid-cols-3 gap-3">
        {cols.map((c) => (
          <div key={c.title} className="rounded-xl border border-black/5 p-3">
            <div className={`mb-3 inline-block rounded px-2 py-0.5 text-[10px] font-medium ${c.accent}`}>
              {c.title}
            </div>
            {c.tasks.map((t, ti) => (
              <div key={ti} className="mb-2 rounded-lg border border-black/5 bg-paper-raised p-2 text-[11px] leading-snug text-ink">
                {t}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'Chat') {
    const messages = [
      { me: false, who: 'Alex',  text: 'Quick question about the API spec' },
      { me: true,  who: 'You',   text: 'Looking at it now — give me 5' },
      { me: false, who: 'Sarah', text: 'Anyone got the Figma link?' },
      { me: true,  who: 'You',   text: 'Just pushed the fix' },
    ];
    return (
      <div className="space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] leading-relaxed ${
              m.me ? 'bg-accent/15 text-ink' : 'border border-black/5 bg-paper-sunken text-ink'
            }`}>
              {!m.me && <div className="mb-0.5 text-[10px] font-medium text-ink-faint">{m.who}</div>}
              {m.text}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'Gallery') {
    // Tinted gradient tiles suggest photo thumbnails without shipping real images.
    const thumbs = [
      'from-blue-200 to-blue-400',
      'from-amber-200 to-rose-400',
      'from-emerald-200 to-teal-500',
      'from-violet-300 to-fuchsia-400',
      'from-orange-200 to-red-300',
      'from-cyan-200 to-blue-400',
    ];
    return (
      <div className="grid grid-cols-3 gap-2">
        {thumbs.map((g, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg border border-black/5 bg-gradient-to-br ${g}`}
          />
        ))}
      </div>
    );
  }

  // Whiteboards
  return (
    <div className="relative h-44 rounded-xl border border-black/5 bg-paper-sunken">
      <div className="absolute left-6 top-6 h-16 w-24 rounded-lg border-2 border-accent/30" />
      <div className="absolute left-32 top-12 h-12 w-12 rounded-full border-2 border-emerald-400/40" />
      <div className="absolute right-8 top-8 h-20 w-28 rounded-lg border-2 border-ink/15" />
      <svg className="absolute inset-0 h-full w-full" fill="none">
        <path d="M120 60 L200 70" stroke="currentColor" className="text-accent/30" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
    </div>
  );
}
  

function PreviewCard() {
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<PreviewTab>('Overview');

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 });

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || shouldReduce) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function resetTilt() {
    mx.set(0);
    my.set(0);
  }

  return (
    <section className="overflow-hidden py-24">
      <Reveal className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-ink">
          Try the workspace
        </h2>
        <p className="mb-12 text-ink-muted">
          Click any tab below. Tasks, chat, gallery, whiteboards — same workspace.
        </p>
      </Reveal>
      <Reveal className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          onMouseMove={handleMouse}
          onMouseLeave={resetTilt}
          style={shouldReduce ? {} : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="overflow-hidden rounded-2xl border border-black/5 bg-paper-raised shadow-soft-lg"
        >
          {/* Mock browser chrome */}
          <div className="flex h-10 items-center gap-1.5 border-b border-black/5 bg-paper-sunken px-4">
            <div className="h-2.5 w-2.5 rounded-full bg-red-300/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-300/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-300/60" />
            <span className="ml-4 text-xs text-ink-faint">Chimespace — {active}</span>
          </div>
          {/* Mock app UI */}
          <div className="flex min-h-72">
            <div className="w-44 border-r border-black/5 bg-paper-raised p-4">
              <div className="mb-4">
                <div className="font-display text-sm font-semibold text-ink">Acme Studio</div>
                <div className="mt-0.5 text-[10px] text-ink-faint">6 members</div>
              </div>
              {PREVIEW_TABS.map((item) => (
                <button
                  key={item}
                  onClick={() => setActive(item)}
                  className={`relative mb-1 flex h-8 w-full items-center rounded-lg px-2 text-left transition-colors ${
                    active === item ? 'bg-accent/8' : 'hover:bg-ink/4'
                  }`}
                >
                  {active === item && (
                    <motion.span
                      layoutId="preview-active"
                      className="absolute left-0 top-1.5 h-5 w-0.5 rounded-full bg-accent"
                      transition={{ duration: shouldReduce ? 0 : 0.2 }}
                    />
                  )}
                  <span className={`text-xs ${active === item ? 'font-medium text-accent' : 'text-ink-faint'}`}>
                    {item}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex-1 p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: shouldReduce ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: shouldReduce ? 0 : -8 }}
                  transition={{ duration: shouldReduce ? 0 : 0.2 }}
                >
                  <PreviewPanel tab={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </Reveal>
    </section>
  );
}

/* ── CTA band ────────────────────────────────────────────────── */

function CTABand({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="bg-accent py-20">
      <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-white">
          Ready to collaborate securely?
        </h2>
        <p className="mb-8 text-white/70">
          Join teams that trust Chimespace for their daily work.
        </p>
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-medium text-accent shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.97]"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            href="/api/auth/google"
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-medium text-accent shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.97]"
          >
            <GoogleIcon />
            Get started with Google
          </Link>
        )}
      </Reveal>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-black/5 bg-paper py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent">
                <span className="text-[10px] font-bold text-white">C</span>
              </div>
              <span className="font-display text-sm font-semibold text-ink">Chimespace</span>
            </div>
            <p className="text-xs text-ink-faint">
              Built for teams that take security seriously.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>
                <Link href="/dashboard" className="transition-colors hover:text-ink">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Security
            </h4>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>OAuth 2.0</li>
              <li>RBAC</li>
              <li>Encrypted sessions</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-black/5 pt-6 text-center">
          <p className="text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} Chimespace. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ── GoogleIcon ──────────────────────────────────────────────── */

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden>
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

/* ── Main export ─────────────────────────────────────────────── */

export default function LandingClient({ isLoggedIn }: Props) {
  return (
    <>
      <StickyNav isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <PreviewCard />
      <TrustStrip />
      <Features />
      <HowItWorks />
      <CTABand isLoggedIn={isLoggedIn} />
      <Footer />
    </>
  );
}
