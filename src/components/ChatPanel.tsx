'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
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

const POLL_INTERVAL_MS = 5_000;

/* ── Message rendering helpers ─────────────────────────────── */

/**
 * Renders message text with code block support.
 * - Triple-backtick blocks (```...```) → styled <pre><code>
 * - Inline backtick (`...`) → styled <code>
 * - Everything else preserves line breaks via whitespace-pre-wrap
 */
function renderMessageContent(text: string, isMe: boolean) {
  // Split by triple-backtick code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    // Code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      // Strip optional language identifier on the first line
      const firstNewline = inner.indexOf('\n');
      const code =
        firstNewline > -1 && /^[a-zA-Z0-9_+-]*$/.test(inner.slice(0, firstNewline).trim())
          ? inner.slice(firstNewline + 1)
          : inner;

      return (
        <pre
          key={i}
          className={`my-1.5 overflow-x-auto rounded-lg p-3 text-xs leading-relaxed ${
            isMe
              ? 'bg-blue-700/40 text-blue-50'
              : 'bg-slate-800 text-slate-100'
          }`}
        >
          <code>{code}</code>
        </pre>
      );
    }

    // Regular text — handle inline code
    const inlineParts = part.split(/(`[^`\n]+`)/g);
    return (
      <span key={i} className="whitespace-pre-wrap break-words">
        {inlineParts.map((seg, j) => {
          if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
            return (
              <code
                key={j}
                className={`rounded px-1 py-0.5 text-[0.8em] ${
                  isMe
                    ? 'bg-blue-700/40 text-blue-100'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {seg.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{seg}</span>;
        })}
      </span>
    );
  });
}

/* ── Component ─────────────────────────────────────────────── */

export default function ChatPanel({ workspaceId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string>>(
    new Map()
  );
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  /* ── Data fetching ─────────────────────────────────────── */

  const fetchMessages = useCallback(async () => {
    const res = await apiFetch<{
      messages: ChatMsg[];
      hasMore: boolean;
    }>(`/api/workspaces/${workspaceId}/chat?limit=100`);
    if (res.success) setMessages(res.data.messages);
    setLoading(false);
  }, [workspaceId]);

  const fetchMembers = useCallback(async () => {
    const res = await apiFetch<{ members: MemberInfo[]; pagination: unknown }>(
      `/api/workspaces/${workspaceId}/members`
    );
    if (res.success) {
      const map = new Map<string, string>();
      res.data.members.forEach((m) =>
        map.set(m.userId, m.user?.name || 'Unknown')
      );
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

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Clamp to a max height of ~8 lines (160px)
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [text, resizeTextarea]);

  /* ── Send ──────────────────────────────────────────────── */

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
    // Re-focus after send
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift → send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    // Shift+Enter → new line (default textarea behavior, no need to handle)
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  /* ── Render ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        Loading chat…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">
        Chat
      </h2>

      {/* Message list */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-slate-400">
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'rounded-br-md bg-blue-600 text-white'
                    : 'rounded-bl-md bg-slate-100 text-slate-900'
                }`}
              >
                {!isMe && (
                  <p className="mb-1 text-xs font-semibold opacity-70">
                    {nameMap.get(msg.senderId) || 'Unknown'}
                  </p>
                )}
                <div className="text-sm leading-relaxed">
                  {renderMessageContent(msg.message, isMe)}
                </div>
                <p
                  className={`mt-1 text-[10px] ${
                    isMe ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleFormSubmit} className="mt-3 flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            placeholder="Type a message… (Shift+Enter for new line)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 pr-12 text-sm leading-relaxed transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            maxLength={4000}
            rows={1}
            style={{ minHeight: '42px' }}
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-slate-300">
            {text.length > 0 && `${text.length}/4000`}
          </span>
        </div>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:shadow-none"
          title="Send message"
        >
          {sending ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
      <p className="mt-1.5 text-center text-[10px] text-slate-400">
        Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send · <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">Shift + Enter</kbd> for new line · Use <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">```</kbd> for code blocks
      </p>
    </div>
  );
}
