import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { createSseConnection } from '../services/sseService';

export function useSSE() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    const sse = createSseConnection(user.id);
    return () => {
      sse.close();
    };
  }, [user?.id]);
}
