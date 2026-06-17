import { useNotificationStore } from '../stores/notificationStore';

const SSE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const sseConnections = new Map();

export function createSseConnection(userId, accessToken) {
  const connectionKey = `${userId}`;
  const existing = sseConnections.get(connectionKey);
  if (existing && existing.readyState === EventSource.OPEN) {
    return existing;
  }

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  const url = accessToken
    ? `${baseUrl}/workspace/stream?accessToken=${encodeURIComponent(accessToken)}`
    : `${baseUrl}/workspace/stream`;

  const eventSource = new EventSource(url, {
    withCredentials: true,
  });

  let reconnectAttempts = 0;
  const maxReconnectDelay = 30000;

  eventSource.onopen = () => {
    reconnectAttempts = 0;
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
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
    reconnectAttempts += 1;
    eventSource.close();
    setTimeout(() => createSseConnection(userId, accessToken), delay);
  };

  sseConnections.set(connectionKey, eventSource);
  return eventSource;
}

export function closeSseConnection(userId) {
  const connectionKey = `${userId}`;
  const existing = sseConnections.get(connectionKey);
  if (existing) {
    existing.close();
    sseConnections.delete(connectionKey);
  }
}
