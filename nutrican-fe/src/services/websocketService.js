// src/services/websocketService.js
import { useNotificationStore } from '../stores/notificationStore';
import { toast } from 'sonner';

let ws = null;
let reconnectAttempts = 0;
let isIntentionallyClosed = false;
let reconnectTimeoutId = null;

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

export const createWebSocketConnection = (token) => {
    if (!token) return;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }

    isIntentionallyClosed = false;

    const wsUrl = `ws://localhost:8080/ws/workspace?token=${token}`;
    console.log('🔗 Attempting to connect WebSocket to:', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ WebSocket connected securely');
        reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    ws.onclose = (event) => {
        console.log(`❌ WebSocket disconnected (Code: ${event.code})`, event.reason);

        if (!isIntentionallyClosed && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
            console.log(`Reconnecting in ${delay}ms...`);
            reconnectTimeoutId = setTimeout(() => {
                reconnectAttempts++;
                createWebSocketConnection(token);
            }, delay);
        }
    };

    ws.onerror = (error) => {
        console.error('⚠️ WebSocket encountered an error:', error);
    };
};

export const sendWebSocketMessage = (event, data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
        return true;
    } else {
        console.error("WebSocket is not connected.");
        return false;
    }
};

const handleWebSocketMessage = (message) => {
    const { event, data } = message;
    const addNotification = useNotificationStore.getState().addNotification;

    switch (event) {
        case 'NEW_DIET_LOG':
            addNotification({ id: data.logId, type: 'info', title: 'Bữa ăn mới chờ duyệt', message: `Học viên ${data.clientName} vừa tải lên một bữa ăn mới.`, isRead: false, createdAt: new Date().toISOString() });
            toast.info(`Bữa ăn mới chờ duyệt: Học viên ${data.clientName} vừa tải lên một bữa ăn.`);
            window.dispatchEvent(new CustomEvent('realtime_update'));
            break;

        case 'SOS':
            addNotification({ id: data.logId, type: 'error', title: '🆘 Yêu cầu hỗ trợ SOS', message: `Học viên ${data.clientName} báo cáo AI nhận diện sai.`, isRead: false, createdAt: new Date().toISOString() });
            toast.error(`🆘 SOS: Học viên ${data.clientName} báo cáo AI nhận diện sai.`);
            window.dispatchEvent(new CustomEvent('realtime_update'));
            break;

        case 'DIET_LOG_REVIEWED':
            addNotification({ id: data.logId, type: 'success', title: 'PT đã đánh giá bữa ăn', message: `Bữa ăn của bạn đã được PT chuyển sang trạng thái: ${data.status}.`, isRead: false, createdAt: new Date().toISOString() });
            toast.success(`PT đã đánh giá bữa ăn: Chuyển sang trạng thái ${data.status}.`);
            window.dispatchEvent(new CustomEvent('realtime_update_client'));
            break;

        case 'CHAT_MESSAGE':
            window.dispatchEvent(new CustomEvent('realtime_chat_message', { detail: data }));
            if (!window.location.pathname.includes('/chat')) {
                toast.info(`Tin nhắn mới từ ${data.senderName}`, { description: data.content });
            }
            break;

        default:
            console.log('Unhandled WebSocket event:', event);
    }
};

export const closeWebSocketConnection = () => {
    isIntentionallyClosed = true;
    if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
    if (ws) {
        ws.close(1000, 'User logged out or component unmounted');
        ws = null;
    }
};