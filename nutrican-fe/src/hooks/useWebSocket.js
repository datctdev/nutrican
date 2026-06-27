// src/hooks/useWebSocket.js
import { useEffect } from 'react';
import { createWebSocketConnection, closeWebSocketConnection } from '../services/websocketService';
import { useAuthStore } from '../stores/authStore';

const useWebSocket = () => {
    const accessToken = useAuthStore((state) => state.accessToken);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        if (isAuthenticated && accessToken) {
            createWebSocketConnection(accessToken);
        }

        return () => {
            closeWebSocketConnection();
        };
    }, [accessToken, isAuthenticated]);
};

export default useWebSocket;