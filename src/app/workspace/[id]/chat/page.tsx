'use client';

import { useParams } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel';

export default function ChatPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  return <ChatPanel workspaceId={workspaceId} />;
}
