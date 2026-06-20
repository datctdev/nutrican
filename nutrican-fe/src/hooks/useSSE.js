import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { createSseConnection, closeSseConnection } from '../services/sseService';

export function useSSE() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) return;

    createSseConnection(user.id);

    return () => {
      closeSseConnection(user.id);
    };
  }, [user?.id]);
}
