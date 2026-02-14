import { z } from 'zod';

/* ── Workspace ────────────────────────────────────────────── */

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be 100 characters or less')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Workspace name may only contain letters, numbers, spaces, hyphens, and underscores'
    ),
});

/* ── Invite ───────────────────────────────────────────────── */

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or less')
    .transform((v: string) => v.toLowerCase()),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

/* ── Task ─────────────────────────────────────────────────── */

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be 200 characters or less'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or less')
    .default(''),
  assignedTo: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID')
    .optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be 200 characters or less')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  assignedTo: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID')
    .nullable()
    .optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
});

/* ── Chat ─────────────────────────────────────────────────── */

export const sendMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be 1000 characters or less'),
});

/* ── Utilities ────────────────────────────────────────────── */

export function validateObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}
