// src/components/common/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, activeRole } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Define role hierarchy: what a role is allowed to act as
  const roleHierarchy = {
    'ADMIN': ['ADMIN', 'CUSTOMER'],
    'PT_CERTIFIED': ['PT_CERTIFIED', 'CUSTOMER'],
    'PT_FREELANCE': ['PT_FREELANCE', 'CUSTOMER'],
    'CUSTOMER': ['CUSTOMER']
  };

  if (allowedRoles && user) {
    const effectiveRoles = roleHierarchy[user.role] || [user.role];
    // Check if the user has any of the allowedRoles according to hierarchy
    const hasPermission = effectiveRoles.some(r => allowedRoles.includes(r));
    
    // For PTs, if they are navigating to a CUSTOMER route, they should be allowed.
    // (Optional: we could strictly enforce activeRole here, but for smooth navigation
    // it's better to just check the hierarchy. If they go to /diet, it renders.)

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
