'use client';
import '@excalidraw/excalidraw/index.css';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/client/api';

/* ── Dynamic Excalidraw (client-only) ─────────────────────── */

const ExcalidrawWrapper = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-slate-400">
        Loading drawing editor…
      </div>
    ),
  }
);

/* ── Types ─────────────────────────────────────────────────── */

interface Props {
  workspaceId: string;
  boardId: string;
  initialDraftState: string;
  initialPublishedState: string;
  initialPublishedAt: string | null;
  title: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type ExcalidrawAPI = any;
type AnyElement = any;
type AnyAppState = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ParsedState {
  elements: AnyElement[];
  appState: AnyAppState;
}

/* ── Helpers ──────────────────────────────────────────────── */

function parseState(stateStr: string): ParsedState {
  try {
    const parsed = JSON.parse(stateStr);
    return {
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      appState: parsed.appState && typeof parsed.appState === 'object' ? parsed.appState : {},
    };
  } catch {
    return { elements: [], appState: {} };
  }
}

function serializeState(
  elements: readonly AnyElement[],
  appState: AnyAppState
): string {
  // Only persist minimal appState keys to keep payload small
  return JSON.stringify({
    elements,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor ?? '#ffffff',
    },
  });
}

const DRAFT_DEBOUNCE_MS = 2_000;
const AUTO_PUBLISH_INTERVAL_MS = 30_000;

/* ── Component ─────────────────────────────────────────────── */

export default function WhiteboardEditor({
  workspaceId,
  boardId,
  initialDraftState,
  initialPublishedState,
  initialPublishedAt,
  title,
}: Props) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawAPI | null>(null);
  const [viewMode, setViewMode] = useState<'draft' | 'published'>('draft');
  const [publishStatus, setPublishStatus] = useState('');
  const [lastPublished, setLastPublished] = useState<string | null>(
    initialPublishedAt
  );
  const [draftSaving, setDraftSaving] = useState(false);

  // Refs for timers and state tracking
  const dirtyRef = useRef(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const publishIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const lastSavedDraftRef = useRef(initialDraftState);
  const publishedStateRef = useRef(initialPublishedState);
  const mountedRef = useRef(true);

  /* ── Draft save (debounced) ────────────────────────────── */

  const saveDraft = useCallback(async () => {
    if (!excalidrawAPI) return;

    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const state = serializeState(elements, appState);

    // Skip if unchanged
    if (state === lastSavedDraftRef.current) return;

    setDraftSaving(true);

    const res = await apiFetch(
      `/api/workspaces/${workspaceId}/whiteboards/${boardId}/draft`,
      { method: 'PUT', body: JSON.stringify({ draftState: state }) }
    );

    if (mountedRef.current) {
      if (res.success) {
        lastSavedDraftRef.current = state;
        dirtyRef.current = true; // Mark dirty for auto-publish
      }
      setDraftSaving(false);
    }
  }, [excalidrawAPI, workspaceId, boardId]);

  /* ── Publish ───────────────────────────────────────────── */

  const publish = useCallback(async () => {
    // Save draft first to ensure latest is on server
    await saveDraft();

    setPublishStatus('Publishing…');

    const res = await apiFetch<{
      publishedAt: string;
      changed: boolean;
    }>(
      `/api/workspaces/${workspaceId}/whiteboards/${boardId}/publish`,
      { method: 'POST' }
    );

    if (mountedRef.current) {
      if (res.success) {
        dirtyRef.current = false;
        if (res.data.changed) {
          setLastPublished(res.data.publishedAt);
          publishedStateRef.current = lastSavedDraftRef.current;
          setPublishStatus('Published!');
        } else {
          setPublishStatus('Already up to date');
        }
        setTimeout(() => {
          if (mountedRef.current) setPublishStatus('');
        }, 3000);
      } else {
        setPublishStatus('Publish failed');
        setTimeout(() => {
          if (mountedRef.current) setPublishStatus('');
        }, 3000);
      }
    }
  }, [saveDraft, workspaceId, boardId]);

  /* ── Auto-publish every 30 s ───────────────────────────── */

  useEffect(() => {
    publishIntervalRef.current = setInterval(() => {
      if (dirtyRef.current) {
        publish();
      }
    }, AUTO_PUBLISH_INTERVAL_MS);

    return () => {
      if (publishIntervalRef.current)
        clearInterval(publishIntervalRef.current);
    };
  }, [publish]);

  /* ── Cleanup ───────────────────────────────────────────── */

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (publishIntervalRef.current)
        clearInterval(publishIntervalRef.current);
    };
  }, []);

  /* ── Save draft before leaving ─────────────────────────── */

  useEffect(() => {
    const handler = () => {
      if (excalidrawAPI && dirtyRef.current) {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const state = serializeState(elements, appState);

        // Use sendBeacon for reliability on page leave
        const blob = new Blob(
          [JSON.stringify({ draftState: state })],
          { type: 'application/json' }
        );
        navigator.sendBeacon(
          `/api/workspaces/${workspaceId}/whiteboards/${boardId}/draft`,
          blob
        );
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [excalidrawAPI, workspaceId, boardId]);

  /* ── onChange from Excalidraw ───────────────────────────── */

  const handleChange = useCallback(() => {
    if (viewMode !== 'draft') return;

    // Debounce draft save
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(saveDraft, DRAFT_DEBOUNCE_MS);
  }, [viewMode, saveDraft]);

  /* ── View-mode switch ──────────────────────────────────── */

  const switchView = useCallback(
    (mode: 'draft' | 'published') => {
      if (mode === viewMode) return;
      setViewMode(mode);

      if (!excalidrawAPI) return;

      const state =
        mode === 'published'
          ? parseState(publishedStateRef.current)
          : parseState(lastSavedDraftRef.current);

      excalidrawAPI.updateScene({
        elements: state.elements,
        appState: state.appState,
      });
    },
    [viewMode, excalidrawAPI]
  );

  /* ── Render ────────────────────────────────────────────── */

  const initialParsed = parseState(initialDraftState);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
     
     {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-black/5 bg-paper-raised px-4 py-2.5">
      
      {/* Left: back link + title */}
        <a
          href={`/workspace/${workspaceId}/whiteboards`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
        >
          {'\u2190'} Back
        </a>
          
        <div className="h-5 w-px bg-black/10" />
        <h2 className="truncate font-display text-sm font-semibold text-ink">
          {title}
        </h2>

        {/* Middle: status messages */}
        <div className="ml-2 flex min-w-0 flex-1 items-center gap-3">
          {draftSaving && (
            <span className="truncate text-[11px] text-ink-faint">Saving draft…</span>
          )}
          {publishStatus && (
            <span className="truncate text-xs font-medium text-emerald-600">
              {publishStatus}
            </span>
          )}
          {!publishStatus && !draftSaving && lastPublished && (
            <span className="truncate text-[11px] text-ink-faint">
              Published {new Date(lastPublished).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Right: view toggle + publish */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-black/8">
            <button
              onClick={() => switchView('draft')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'draft'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-paper-raised text-ink-muted hover:bg-ink/4'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => switchView('published')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'published'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-paper-raised text-ink-muted hover:bg-ink/4'
              }`}
            >
              Published
            </button>
          </div>

          <button
            onClick={publish}
            className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-soft-sm transition-all hover:-translate-y-px hover:shadow-soft active:scale-[0.97]"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Auto-publish info bar */}
      <div className="flex items-center justify-between border-b border-black/5 bg-paper-sunken px-4 py-1.5">
        <p className="text-[10px] text-ink-faint">
          Draft autosaves every 2s · Auto-publishes every 30s
        </p>
        {viewMode === 'published' && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            View-only snapshot
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <div
          className="h-full"
          style={{ height: '100%', width: '100%', position: 'relative' }}
        >
          <ExcalidrawWrapper
            excalidrawAPI={(api: ExcalidrawAPI) =>
              setExcalidrawAPI(api)
            }
            initialData={{
              elements: initialParsed.elements as AnyElement[],
              appState: initialParsed.appState as AnyAppState,
            }}
            onChange={handleChange}
            viewModeEnabled={viewMode === 'published'}
            UIOptions={{
              tools: { image: false },
            }}
          />
        </div>
      </div>
    </div>
  );
}
