'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/client/api';

/* ── Types ─────────────────────────────────────────────────── */

interface Task {
  _id: string;
  title: string;
  description: string;
  comment: string;
  createdBy: string;
  assignedTo: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  createdAt: string;
}

interface Props {
  workspaceId: string;
  userRole: string;
}

const STATUS_CONFIG = {
  TODO: {
    label: 'To Do',
    bg: 'bg-slate-50/80 border-slate-200',
    cardBorder: 'border-slate-200 hover:border-slate-300',
    badge: 'bg-slate-100 text-slate-600',
    icon: (
      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
      </svg>
    ),
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-accent/5 border-accent/20',
    cardBorder: 'border-accent/20 hover:border-accent/30',
    badge: 'bg-accent/10 text-accent',
    icon: (
      <svg className="h-5 w-5 text-accent animate-spin-slow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
      </svg>
    ),
  },
  DONE: {
    label: 'Done',
    bg: 'bg-emerald-50/80 border-emerald-200',
    cardBorder: 'border-emerald-200 hover:border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: (
      <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
} as const;

/* ── Icons ─────────────────────────────────────────────────── */

function ArrowLeftIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg className="mx-auto mb-2 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

/* ── Component ─────────────────────────────────────────────── */

export default function TaskBoard({ workspaceId, userRole }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', comment: '' });
  const [creating, setCreating] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiFetch<{ tasks: Task[]; pagination: unknown }>(
        `/api/workspaces/${workspaceId}/tasks`
      );
      if (res.success) setTasks(res.data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* ── Actions ───────────────────────────────────────────── */

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await apiFetch<Task>(
      `/api/workspaces/${workspaceId}/tasks`,
      { method: 'POST', body: JSON.stringify(form) }
    );
    if (res.success) {
      setTasks((prev) => [res.data, ...prev]);
      setForm({ title: '', description: '', comment: '' });
      setShowForm(false);
    }
    setCreating(false);
  };

  const moveTask = async (id: string, status: Task['status']) => {
    const res = await apiFetch<Task>(
      `/api/workspaces/${workspaceId}/tasks/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    );
    if (res.success) {
      setTasks((prev) =>
        prev.map((t) => (t._id === id ? res.data : t))
      );
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    const res = await apiFetch(
      `/api/workspaces/${workspaceId}/tasks/${id}`,
      { method: 'DELETE' }
    );
    if (res.success) setTasks((prev) => prev.filter((t) => t._id !== id));
  };

  const saveComment = async (id: string) => {
    const res = await apiFetch<Task>(
      `/api/workspaces/${workspaceId}/tasks/${id}`,
      { method: 'PATCH', body: JSON.stringify({ comment: commentDraft }) }
    );
    if (res.success) {
      setTasks((prev) =>
        prev.map((t) => (t._id === id ? res.data : t))
      );
    }
    setEditingComment(null);
    setCommentDraft('');
  };

  /* ── Render ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <svg className="mb-3 h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
        </svg>
        <span className="text-sm">Loading tasks…</span>
      </div>
    );
  }

  const columns: Task['status'][] = ['TODO', 'IN_PROGRESS', 'DONE'];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} across {columns.length} columns
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
        >
          <span className={`transition-transform duration-200 ${showForm ? 'rotate-45' : 'group-hover:rotate-90'}`}>
            <PlusIcon />
          </span>
          New Task
        </button>
      </div>

      {/* Create form */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          showForm ? 'mb-6 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <form
            onSubmit={createTask}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <input
              type="text"
              placeholder="Task title"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-colors focus:border-accent/40 focus:bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent/10"
              maxLength={200}
              required
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              className="mb-3 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-colors focus:border-accent/40 focus:bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent/10"
              rows={3}
              maxLength={2000}
            />
            <input
              type="text"
              placeholder="Comment / note (optional)"
              value={form.comment}
              onChange={(e) =>
                setForm((p) => ({ ...p, comment: e.target.value }))
              }
              className="mb-4 w-full rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-4 py-2 text-sm text-amber-800 placeholder:text-amber-400 transition-colors focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              maxLength={500}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !form.title.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97] disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                {creating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  'Create Task'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {columns.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const col = tasks.filter((t) => t.status === status);

          return (
            <div
              key={status}
              className={`rounded-xl border p-4 transition-colors ${cfg.bg}`}
            >
              {/* Column header */}
              <div className="mb-4 flex items-center gap-2.5 px-1">
                {cfg.icon}
                <h3 className="font-semibold text-slate-800">
                  {cfg.label}
                </h3>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                  {col.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {col.map((task) => (
                  <div
                    key={task._id}
                    className={`group rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md ${cfg.cardBorder}`}
                  >
                    {/* Title */}
                    <h4 className="mb-1 text-sm font-semibold text-slate-900">
                      {task.title}
                    </h4>

                    {/* Description */}
                    {task.description && (
                      <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-slate-500">
                        {task.description}
                      </p>
                    )}

                    {/* Comment badge */}
                    {task.comment && editingComment !== task._id && (
                      <button
                        onClick={() => {
                          setEditingComment(task._id);
                          setCommentDraft(task.comment);
                        }}
                        className="mb-3 flex w-full items-start gap-1.5 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2 text-left transition-colors hover:bg-amber-50"
                      >
                        <CommentIcon />
                        <span className="line-clamp-2 text-xs text-amber-700">
                          {task.comment}
                        </span>
                      </button>
                    )}

                    {/* Inline comment editor */}
                    {editingComment === task._id && (
                      <div className="mb-3 space-y-2">
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Add a comment…"
                          className="w-full resize-none rounded-lg border border-amber-300 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 placeholder:text-amber-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                          rows={2}
                          maxLength={500}
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveComment(task._id)}
                            className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600 active:scale-[0.97]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingComment(null);
                              setCommentDraft('');
                            }}
                            className="rounded-md px-3 py-1 text-xs text-slate-500 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add comment button (when no comment exists) */}
                    {!task.comment && editingComment !== task._id && (
                      <button
                        onClick={() => {
                          setEditingComment(task._id);
                          setCommentDraft('');
                        }}
                        className="mb-3 flex items-center gap-1 rounded-md px-1 py-0.5 text-xs text-slate-400 opacity-0 transition-all duration-200 hover:text-amber-600 group-hover:opacity-100"
                      >
                        <CommentIcon />
                        <span>Add comment</span>
                      </button>
                    )}

                    {/* Meta + date */}
                    <div className="mb-3 flex items-center gap-1.5">
                      <ClockIcon />
                      <span className="text-[11px] text-slate-400">
                        {new Date(task.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {status !== 'TODO' && (
                        <button
                          onClick={() =>
                            moveTask(
                              task._id,
                              status === 'DONE' ? 'IN_PROGRESS' : 'TODO'
                            )
                          }
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow active:scale-[0.97]"
                        >
                          <ArrowLeftIcon />
                          {status === 'DONE' ? 'In Progress' : 'To Do'}
                        </button>
                      )}
                      {status !== 'DONE' && (
                        <button
                          onClick={() =>
                            moveTask(
                              task._id,
                              status === 'TODO' ? 'IN_PROGRESS' : 'DONE'
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/8 px-2.5 py-1.5 text-xs font-medium text-accent shadow-soft-sm transition-all hover:border-accent/30 hover:bg-accent/10 hover:shadow-soft active:scale-[0.97]"
                        >
                          {status === 'TODO' ? 'In Progress' : 'Done'}
                          <ArrowRightIcon />
                        </button>
                      )}
                      {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                        <button
                          onClick={() => deleteTask(task._id)}
                          className="ml-auto flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs text-red-400 opacity-0 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 active:scale-[0.97]"
                        >
                          <TrashIcon />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {col.length === 0 && (
                  <div className="py-8 text-center">
                    <EmptyIcon />
                    <p className="text-xs text-slate-400">No tasks yet</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
