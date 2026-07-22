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

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const wsBase = import.meta.env.VITE_WS_URL || apiBase.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/workspace?token=${token}`;
    console.log('🔗 Attempting to connect WebSocket to:', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected securely');
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
        console.log(`WebSocket disconnected (Code: ${event.code})`, event.reason);

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
        console.error('WebSocket encountered an error:', error);
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

        case 'DIET_LOG_REVIEWED':
            addNotification({ id: data.logId, type: 'success', title: 'PT đã đánh giá bữa ăn', message: `Bữa ăn của bạn đã được PT chuyển sang trạng thái: ${data.status}.`, isRead: false, createdAt: new Date().toISOString() });
            toast.success(`PT đã đánh giá bữa ăn: Chuyển sang trạng thái ${data.status}.`);
            window.dispatchEvent(new CustomEvent('DIET_LOG_REVIEWED', { detail: data }));
            window.dispatchEvent(new CustomEvent('realtime_update_client'));
            break;

        case 'CHAT_MESSAGE':
            window.dispatchEvent(new CustomEvent('realtime_chat_message', { detail: data }));
            if (!window.location.pathname.includes('/chat')) {
                toast.info(`Tin nhắn mới từ ${data.senderName}`, { description: data.content });
            }
            break;

        case 'REFUND_UPDATE': {
            const status = data?.status || '';
            const isApproved = status === 'APPROVED' || status === 'AUTO_APPROVED';
            const isRejected = status === 'REJECTED';
            const title = isApproved ? 'Hoàn tiền đã được duyệt' : isRejected ? 'Yêu cầu hoàn tiền bị từ chối' : 'Cập nhật hoàn tiền';
            const message = data?.adminNote
                ? `${title}: ${data.adminNote}`
                : title;
            addNotification({
                id: data?.refundId || `refund-${Date.now()}`,
                type: isApproved ? 'success' : isRejected ? 'error' : 'info',
                title,
                message,
                isRead: false,
                createdAt: new Date().toISOString(),
            });
            if (isApproved) {
                toast.success(message);
            } else if (isRejected) {
                toast.error(message);
            } else {
                toast.info(message);
            }
            window.dispatchEvent(new CustomEvent('refund_update', { detail: data }));
            break;
        }

        case 'PT_CLIENT_ALERT': {
            const message = data?.reason || `Client ${data?.clientName || ''} cần chú ý (${data?.intakeStatus || 'AT_RISK'})`;
            addNotification({
                id: `alert-${data?.clientId || Date.now()}`,
                type: 'warning',
                title: 'Cảnh báo học viên',
                message,
                isRead: false,
                createdAt: new Date().toISOString(),
            });
            toast.warning(message);
            window.dispatchEvent(new CustomEvent('pt_client_alert', { detail: data }));
            break;
        }

        case 'WEEKLY_SUMMARY': {
            addNotification({
                id: data?.id || `weekly-${Date.now()}`,
                type: 'info',
                title: 'Tổng kết tuần từ PT',
                message: data?.summaryText || 'PT vừa gửi tổng kết tuần cho bạn.',
                isRead: false,
                createdAt: new Date().toISOString(),
            });
            toast.info('PT vừa gửi tổng kết tuần', { description: data?.summaryText?.slice(0, 80) });
            window.dispatchEvent(new CustomEvent('weekly_summary', { detail: data }));
            break;
        }

        case 'NOTIFICATION_COUNT': {
            const count = data?.unreadCount ?? 0;
            useNotificationStore.setState({ unreadCount: count });
            window.dispatchEvent(new CustomEvent('notification_count_updated'));
            break;
        }

        case 'MEAL_PLAN_REPLACEMENT_UPDATED': {
            const approved = data?.status === 'APPROVED';
            if (approved) {
                toast.success('PT đã duyệt yêu cầu thay món');
            } else {
                toast.info('PT đã phản hồi yêu cầu thay món');
            }
            window.dispatchEvent(new CustomEvent('meal_plan_replacement_updated', { detail: data }));
            break;
        }

        case 'MEAL_PLAN_PROGRESS_UPDATED':
            window.dispatchEvent(new CustomEvent('meal_plan_progress_updated', { detail: data }));
            break;

        case 'HIRE_ACCEPTED':
            toast.success(data?.message || 'PT đã chấp nhận. Vui lòng thanh toán để bắt đầu coaching.');
            window.dispatchEvent(new CustomEvent('hire_request_updated', { detail: data }));
            break;

        case 'HIRE_REJECTED':
            toast.error(data?.message || 'PT đã từ chối yêu cầu coaching.');
            window.dispatchEvent(new CustomEvent('hire_request_updated', { detail: data }));
            break;

        case 'HIRE_PAYMENT_EXPIRED':
            toast.error(data?.message || 'Yêu cầu coaching đã hết thời hạn thanh toán.');
            window.dispatchEvent(new CustomEvent('hire_request_updated', { detail: data }));
            break;

        case 'COACHING_PAYMENT_SUCCESS':
            toast.success('Thanh toán thành công. Coaching đã được kích hoạt.');
            window.dispatchEvent(new CustomEvent('hire_request_updated', { detail: data }));
            break;

        case 'COACHING_PAYMENT_RECEIVED':
            toast.success('Học viên đã thanh toán. Coaching đã được kích hoạt.');
            window.dispatchEvent(new CustomEvent('hire_request_updated', { detail: data }));
            break;

        case 'COACHING_COMPLETED':
            toast.success(data?.message || 'Coaching đã hoàn tất và escrow đã được quyết toán.');
            window.dispatchEvent(new CustomEvent('hire_request_updated', { detail: data }));
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
