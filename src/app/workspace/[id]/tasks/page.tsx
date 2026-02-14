'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import TaskBoard from '@/components/TaskBoard';

export default function TasksPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [role, setRole] = useState('MEMBER');

  useEffect(() => {
    (async () => {
      const res = await apiFetch<{ role: string }>(
        `/api/workspaces/${workspaceId}`
      );
      if (res.success) setRole(res.data.role);
    })();
  }, [workspaceId]);

  return <TaskBoard workspaceId={workspaceId} userRole={role} />;
}
