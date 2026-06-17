// src/components/common/PtProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSSE } from '../../hooks/useSSE';

export default function PtProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !['PT_CERTIFIED', 'PT_FREELANCE'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  useSSE();

  return children;
}
