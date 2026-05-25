import { useNotificationStore } from '../stores/notificationStore';

const SSE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export function createSseConnection(userId) {
  const eventSource = new EventSource(`${SSE_BASE_URL}/workspace/stream`, {
    withCredentials: true,
  });

  eventSource.onopen = () => {
    console.log('SSE connected');
  };

  eventSource.addEventListener('NEW_DIET_LOG', (event) => {
    try {
      const data = JSON.parse(event.data);
      useNotificationStore.getState().addNotification({
        id: Date.now(),
        type: 'NEW_DIET_LOG',
        message: data.message,
        isRead: false,
      });
    } catch (e) {
      console.error('Failed to parse SSE data', e);
    }
  });

  eventSource.addEventListener('SOS_TICKET', (event) => {
    try {
      const data = JSON.parse(event.data);
      useNotificationStore.getState().addNotification({
        id: Date.now(),
        type: 'SOS',
        message: `SOS: ${data.client_name} needs help!`,
        isRead: false,
      });
    } catch (e) {
      console.error('Failed to parse SSE data', e);
    }
  });

  eventSource.onerror = () => {
    console.error('SSE error, reconnecting...');
    eventSource.close();
    setTimeout(() => createSseConnection(userId), 5000);
  };

  return eventSource;
}
