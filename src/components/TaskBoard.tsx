'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/client/api';

/* ── Types ─────────────────────────────────────────────────── */

interface Task {
  _id: string;
  title: string;
  description: string;
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
    bg: 'bg-slate-50 border-slate-200',
    dot: 'bg-slate-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
  },
  DONE: {
    label: 'Done',
    bg: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
  },
} as const;

/* ── Component ─────────────────────────────────────────────── */

export default function TaskBoard({ workspaceId, userRole }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);

  const fetchTasks = useCallback(async () => {
    const res = await apiFetch<{ tasks: Task[]; pagination: unknown }>(
      `/api/workspaces/${workspaceId}/tasks`
    );
    if (res.success) setTasks(res.data.tasks);
    setLoading(false);
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
      setForm({ title: '', description: '' });
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

  /* ── Render ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        Loading tasks…
      </div>
    );
  }

  const columns: Task['status'][] = ['TODO', 'IN_PROGRESS', 'DONE'];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Task
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={createTask}
          className="mb-6 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={(e) =>
              setForm((p) => ({ ...p, title: e.target.value }))
            }
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="mb-3 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            maxLength={2000}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !form.title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const col = tasks.filter((t) => t.status === status);

          return (
            <div
              key={status}
              className={`rounded-lg border p-4 ${cfg.bg}`}
            >
              <div className="mb-4 flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${cfg.dot}`} />
                <h3 className="font-medium text-slate-700">
                  {cfg.label}
                </h3>
                <span className="ml-auto text-xs text-slate-500">
                  {col.length}
                </span>
              </div>

              <div className="space-y-3">
                {col.map((task) => (
                  <div
                    key={task._id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <h4 className="mb-1 text-sm font-medium text-slate-900">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-slate-500">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      {status !== 'TODO' && (
                        <button
                          onClick={() =>
                            moveTask(
                              task._id,
                              status === 'DONE'
                                ? 'IN_PROGRESS'
                                : 'TODO'
                            )
                          }
                          className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                        >
                          ←{' '}
                          {status === 'DONE'
                            ? 'In Progress'
                            : 'To Do'}
                        </button>
                      )}
                      {status !== 'DONE' && (
                        <button
                          onClick={() =>
                            moveTask(
                              task._id,
                              status === 'TODO'
                                ? 'IN_PROGRESS'
                                : 'DONE'
                            )
                          }
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-600 hover:bg-blue-200"
                        >
                          {status === 'TODO'
                            ? 'In Progress'
                            : 'Done'}{' '}
                          →
                        </button>
                      )}
                      {(userRole === 'OWNER' ||
                        userRole === 'ADMIN') && (
                        <button
                          onClick={() => deleteTask(task._id)}
                          className="ml-auto rounded bg-red-100 px-2 py-1 text-xs text-red-600 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {col.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
