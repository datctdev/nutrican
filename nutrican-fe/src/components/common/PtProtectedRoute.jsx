import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function PtProtectedRoute({ children }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user && !['PT_CERTIFIED', 'PT_FREELANCE'].includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
