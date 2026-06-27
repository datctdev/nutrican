// src/components/common/PtProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import useWebSocket from '../../hooks/useWebSocket'; // Import hook WebSocket

// Nhận props { children } thay vì dùng <Outlet />
export default function PtProtectedRoute({ children }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    // Kích hoạt kết nối WebSocket cho PT
    useWebSocket();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Chặn nếu không phải PT
    if (user && !['PT_CERTIFIED', 'PT_FREELANCE'].includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // Render children (tức là <MainLayout />)
    return children;
}