import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, activeRole } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roleHierarchy = {
    'ADMIN': ['ADMIN', 'CUSTOMER'],
    'PT_CERTIFIED': ['PT_CERTIFIED', 'CUSTOMER'],
    'PT_FREELANCE': ['PT_FREELANCE', 'CUSTOMER'],
    'CUSTOMER': ['CUSTOMER']
  };

  if (allowedRoles && user) {
    const effectiveRoles = roleHierarchy[user.role] || [user.role];
    const hasPermission = effectiveRoles.some(r => allowedRoles.includes(r));
    

    if (!hasPermission) {
      const dashboardMap = {
        'CUSTOMER': '/diet',
        'PT_CERTIFIED': '/pt',
        'PT_FREELANCE': '/pt',
        'ADMIN': '/admin',
      };
      return <Navigate to={dashboardMap[user.role] || '/'} replace />;
    }
  }

  return children;
}
