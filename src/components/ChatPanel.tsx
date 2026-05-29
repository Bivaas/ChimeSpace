'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Send } from 'lucide-react';
import { apiFetch } from '@/lib/client/api';
import { useAuth } from '@/hooks/useAuth';

/* ── Types ─────────────────────────────────────────────────── */

interface ChatMsg {
  _id: string;
  senderId: string;
  message: string;
  createdAt: string;
}

interface MemberInfo {
  userId: string;
  user: { name: string; avatar: string } | null;
}

interface Props {
  workspaceId: string;
}

interface Group {
  senderId: string;
  isMe: boolean;
  messages: ChatMsg[];
}

interface DayBucket {
  label: string;
  groups: Group[];
}

const POLL_INTERVAL_MS = 5_000;

/* ── Helpers ───────────────────────────────────────────────── */

function decodeDisplay(text: string): string {
  return text
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const palette = [
    'bg-rose-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-sky-500',
    'bg-fuchsia-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-pink-500',
  ];
  return palette[Math.abs(h) % palette.length];
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(d: Date): string {
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function renderTextWithLinks(text: string, isMe: boolean): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) => {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      const linkClass = isMe
        ? 'underline underline-offset-2 text-white hover:text-white/80'
        : 'underline underline-offset-2 text-accent hover:text-accent/80';
      return (
        <a key={i} href={p} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {p}
        </a>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function renderMessageContent(rawText: string, isMe: boolean): React.ReactNode {
  const text = decodeDisplay(rawText);
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      const firstNewline = inner.indexOf('\n');
      const code =
        firstNewline > -1 &&
        /^[a-zA-Z0-9_+-]*$/.test(inner.slice(0, firstNewline).trim())
          ? inner.slice(firstNewline + 1)
          : inner;
      const preClass = isMe
        ? 'my-1.5 overflow-x-auto rounded-lg p-3 text-xs leading-relaxed bg-white/15 text-white/90'
        : 'my-1.5 overflow-x-auto rounded-lg p-3 text-xs leading-relaxed bg-ink/90 text-paper/90';
      return (
        <pre key={i} className={preClass}>
          <code>{code}</code>
        </pre>
      );
    }

    const inlineParts = part.split(/(`[^`\n]+`)/g);
    return (
      <span key={i} className="whitespace-pre-wrap break-words">
        {inlineParts.map((seg, j) => {
          if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
            const codeClass = isMe
              ? 'rounded px-1 py-0.5 text-[0.85em] bg-white/20 text-white'
              : 'rounded px-1 py-0.5 text-[0.85em] bg-ink/10 text-ink';
            return (
              <code key={j} className={codeClass}>
                {seg.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{renderTextWithLinks(seg, isMe)}</span>;
        })}
      </span>
    );
  });
}

/* ── Component ─────────────────────────────────────────────── */

export default function ChatPanel({ workspaceId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    const res = await apiFetch<{
      messages: ChatMsg[];
      hasMore: boolean;
    }>(`/api/workspaces/${workspaceId}/chat?limit=100`);
    if (res.success) setMessages(res.data.messages);
    setLoading(false);
  }, [workspaceId]);

  const fetchMembers = useCallback(async () => {
    const res = await apiFetch<{
      members: MemberInfo[];
      pagination: unknown;
    }>(`/api/workspaces/${workspaceId}/members`);
    if (res.success) {
      const map = new Map<string, string>();
      res.data.members.forEach((m) => {
        map.set(m.userId, m.user?.name || 'Unknown');
      });
      setNameMap(map);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMessages();
    fetchMembers();
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages, fetchMembers]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [text, resizeTextarea]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await apiFetch<ChatMsg>(
      `/api/workspaces/${workspaceId}/chat`,
      { method: 'POST', body: JSON.stringify({ message: text }) }
    );
    if (res.success) {
      setMessages((prev) => [...prev, res.data]);
      setText('');
    }
    setSending(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <p className="text-sm text-ink-faint">Loading chat…</p>
      </div>
    );
  }

  const days: DayBucket[] = [];
  let currentDayLabel = '';
  let currentGroup: Group | null = null;

  for (const m of messages) {
    const d = new Date(m.createdAt);
    const label = dayLabel(d);
    if (label !== currentDayLabel) {
      currentDayLabel = label;
      days.push({ label, groups: [] });
      currentGroup = null;
    }
    const isMe = m.senderId === user?.id;
    const lastDay = days[days.length - 1];
    if (currentGroup && currentGroup.senderId === m.senderId) {
      currentGroup.messages.push(m);
    } else {
      currentGroup = { senderId: m.senderId, isMe, messages: [m] };
      lastDay.groups.push(currentGroup);
    }
  }

  return (
    <div className="-m-8 flex h-[calc(100vh-3.5rem)] flex-col bg-paper">
      {/* Header — slim, single line */}
      <div className="flex items-baseline gap-3 border-b border-black/5 px-8 py-4">
        <h2 className="font-display text-lg font-semibold text-ink">Chat</h2>
        <span className="text-xs text-ink-faint">
          {messages.length === 0
            ? 'No messages yet'
            : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
        </span>
      </div>

      {/* Message list — fills all available vertical space */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8">
              <Send className="h-5 w-5 text-accent" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-ink">Say something</p>
            <p className="mt-1 max-w-xs text-xs text-ink-faint">
              Messages are visible to everyone in this workspace.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {days.map((day) => (
              <div key={day.label} className="space-y-4">
                {/* Day divider */}
                <div className="relative my-2 flex items-center justify-center">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-black/5" />
                  <span className="relative rounded-full bg-paper px-3 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                    {day.label}
                  </span>
                </div>

                {day.groups.map((g, gi) => {
                  const name = nameMap.get(g.senderId) || 'Unknown';
                  const rowClass = g.isMe
                    ? 'flex items-start gap-3 flex-row-reverse'
                    : 'flex items-start gap-3';
                  // YOUR avatar is INK (near-black), others get rainbow color.
                  // The bubble color is your accent — this keeps avatar and
                  // bubble visually distinct on your own messages.
                  const avatarClass = g.isMe
                    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-paper-raised text-[11px] font-semibold text-ink shadow-soft-sm'
                    : `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${colorFor(g.senderId)}`;
                  const stackClass = g.isMe
                    ? 'flex max-w-[78%] flex-col gap-1 items-end'
                    : 'flex max-w-[78%] flex-col gap-1 items-start';
                  const headerClass = g.isMe
                    ? 'flex items-baseline gap-2 px-1 text-[11px] flex-row-reverse'
                    : 'flex items-baseline gap-2 px-1 text-[11px]';

                  return (
                    <div key={gi} className={rowClass}>
                      <div className={avatarClass}>{initialsOf(name)}</div>
                      <div className={stackClass}>
                        <div className={headerClass}>
                          <span className="font-medium text-ink-muted">
                            {g.isMe ? 'You' : name}
                          </span>
                          <span className="text-ink-faint">
                            {new Date(g.messages[0].createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {g.messages.map((m, mi) => {
                          const isFirst = mi === 0;
                          const isLast = mi === g.messages.length - 1;
                          const bubbleBg = g.isMe ? 'bg-accent text-white' : 'bg-paper-sunken text-ink';
                          const topCorner = g.isMe
                            ? (isFirst ? '' : 'rounded-tr-md')
                            : (isFirst ? '' : 'rounded-tl-md');
                          const bottomCorner = g.isMe
                            ? (isLast ? '' : 'rounded-br-md')
                            : (isLast ? '' : 'rounded-bl-md');
                          const bubbleClass = `rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${topCorner} ${bottomCorner} ${bubbleBg}`;
                          return (
                            <div key={m._id} className={bubbleClass}>
                              {renderMessageContent(m.message, g.isMe)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input — pinned to bottom, edge-to-edge, no surrounding card */}
      <div className="border-t border-black/5 bg-paper px-8 py-4">
        <form
          onSubmit={handleFormSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none rounded-2xl border border-black/8 bg-paper-raised px-4 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-faint transition-all focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10"
            maxLength={4000}
            rows={1}
            style={{ minHeight: '42px' }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center self-end rounded-2xl bg-accent text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97] disabled:transform-none disabled:bg-ink/10 disabled:text-ink-faint disabled:shadow-none"
            title="Send"
          >
            {sending ? (
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
            ) : (
              <Send className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}