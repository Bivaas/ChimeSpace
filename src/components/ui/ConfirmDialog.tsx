'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const shouldReduce = useReducedMotion();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduce ? 0 : 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => !loading && onCancel()}
          />

          {/* Dialog */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-2xl border border-black/5 bg-paper-raised p-6 shadow-soft-lg"
            initial={{ opacity: 0, scale: shouldReduce ? 1 : 0.96, y: shouldReduce ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: shouldReduce ? 1 : 0.96, y: shouldReduce ? 0 : 8 }}
            transition={{ duration: shouldReduce ? 0 : 0.18, ease: 'easeOut' }}
          >
            <h3 className="font-display text-lg font-semibold text-ink">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {message}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/5 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97] disabled:transform-none disabled:opacity-50 disabled:shadow-none ${
                  destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-accent'
                }`}
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}