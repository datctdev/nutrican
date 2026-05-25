import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const dashboardMap = {
      'CUSTOMER': '/diet',
      'PT_CERTIFIED': '/pt',
      'PT_FREELANCE': '/pt',
      'ADMIN': '/admin',
    };
    return <Navigate to={dashboardMap[user.role] || '/'} replace />;
  }

  return children;
}
