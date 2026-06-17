import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { createSseConnection, closeSseConnection } from '../services/sseService';

export function useSSE() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    createSseConnection(user.id, user.accessToken);

    return () => {
      closeSseConnection(user.id);
    };
  }, [user?.id, user?.accessToken]);
}
