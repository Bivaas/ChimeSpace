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
    const res = await apiFetch<MemberInfo[]>(
      `/api/workspaces/${workspaceId}/members`
    );
    if (res.success) {
      const map = new Map<string, string>();
      res.data.forEach((m) =>
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

  /* ── Send ──────────────────────────────────────────────── */

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
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
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isMe
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                {!isMe && (
                  <p className="mb-1 text-xs font-medium opacity-70">
                    {nameMap.get(msg.senderId) || 'Unknown'}
                  </p>
                )}
                <p className="break-words text-sm">{msg.message}</p>
                <p
                  className={`mt-1 text-xs ${
                    isMe ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
