'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/client/api';
import WhiteboardEditor from '@/components/WhiteboardEditor';

interface BoardData {
  _id: string;
  title: string;
  draftState: string;
  publishedState: string;
  publishedAt: string | null;
}

export default function WhiteboardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await apiFetch<BoardData>(
        `/api/workspaces/${workspaceId}/whiteboards/${boardId}`
      );
      if (res.success) {
        setBoard(res.data);
      } else {
        setError(res.error.message);
      }
      setLoading(false);
    })();
  }, [workspaceId, boardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Loading whiteboard…
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-500">
          {error || 'Whiteboard not found.'}
        </p>
        <Link
          href={`/workspace/${workspaceId}/whiteboards`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Whiteboards
        </Link>
      </div>
    );
  }

  return (
    <div className="-m-8">
      {/* Back button (overlaid) */}
      <div className="absolute left-72 top-[4.5rem] z-10">
        <Link
          href={`/workspace/${workspaceId}/whiteboards`}
          className="flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-sm backdrop-blur hover:bg-white hover:text-blue-600"
        >
          ← Back
        </Link>
      </div>

      <WhiteboardEditor
        workspaceId={workspaceId}
        boardId={boardId}
        initialDraftState={board.draftState}
        initialPublishedState={board.publishedState}
        initialPublishedAt={board.publishedAt}
        title={board.title}
      />
    </div>
  );
}
