// src/App.jsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import PtProtectedRoute from './components/common/PtProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PtRegistrationPage from './pages/auth/PtRegistrationPage';
import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/customer/MarketplacePage';
import PtDetailPage from './pages/customer/PtDetailPage';
import DietTrackerPage from './pages/customer/DietTrackerPage';
import ProfilePage from './pages/customer/ProfilePage';
import MacroTargetsPage from './pages/customer/MacroTargetsPage';
import KycPage from './pages/customer/KycPage';
import PtDashboardPage from './pages/pt/PtDashboardPage';
import ClientListPage from './pages/pt/ClientListPage';
import ReviewDietLogPage from './pages/pt/ReviewDietLogPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import PtVerificationPage from './pages/admin/PtVerificationPage';
import KycAdminPage from './pages/admin/KycAdminPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import SosTicketsPage from './pages/admin/SosTicketsPage';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  const router = createBrowserRouter([
    {
      element: <MainLayout />,
      children: [
        { path: '/', element: <LandingPage /> },
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { path: '/register/pt', element: <PtRegistrationPage /> },
        {
          path: '/marketplace',
          element: <ProtectedRoute allowedRoles={['CUSTOMER']}><MarketplacePage /></ProtectedRoute>,
        },
        {
          path: '/pt-profile/:id',
          element: <ProtectedRoute allowedRoles={['CUSTOMER']}><PtDetailPage /></ProtectedRoute>,
        },
        {
          path: '/diet',
          element: <ProtectedRoute allowedRoles={['CUSTOMER']}><DietTrackerPage /></ProtectedRoute>,
        },
        {
          path: '/profile',
          element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
        },
        {
          path: '/macro-targets',
          element: <ProtectedRoute allowedRoles={['CUSTOMER']}><MacroTargetsPage /></ProtectedRoute>,
        },
        {
          path: '/kyc',
          element: <ProtectedRoute><KycPage /></ProtectedRoute>,
        },
        {
          path: '/admin',
          element: <ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>,
        },
        {
          path: '/admin/pts',
          element: <ProtectedRoute allowedRoles={['ADMIN']}><PtVerificationPage /></ProtectedRoute>,
        },
        {
          path: '/admin/kyc',
          element: <ProtectedRoute allowedRoles={['ADMIN']}><KycAdminPage /></ProtectedRoute>,
        },
        {
          path: '/admin/users',
          element: <ProtectedRoute allowedRoles={['ADMIN']}><UserManagementPage /></ProtectedRoute>,
        },
        {
          path: '/admin/sos',
          element: <ProtectedRoute allowedRoles={['ADMIN']}><SosTicketsPage /></ProtectedRoute>,
        },
      ],
    },
    {
      element: <PtProtectedRoute><MainLayout /></PtProtectedRoute>,
      children: [
        { path: '/pt', element: <PtDashboardPage /> },
        { path: '/pt/clients', element: <ClientListPage /> },
        { path: '/pt/reviews', element: <ReviewDietLogPage /> },
      ],
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
