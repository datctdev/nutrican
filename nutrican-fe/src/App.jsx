// src/App.jsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import MainLayout from './components/layouts/MainLayout';
import PtProtectedRoute from './components/common/PtProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SetPasswordPage from './pages/auth/SetPasswordPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/customer/MarketplacePage';
import PtDetailPage from './pages/customer/PtDetailPage';
import DietTrackerPage from './pages/customer/DietTrackerPage';
import ProfilePage from './pages/customer/ProfilePage';
import MacroTargetsPage from './pages/customer/MacroTargetsPage';
import CoachingPage from './pages/customer/CoachingPage';
import KycPage from './pages/customer/KycPage';
import PtDashboardPage from './pages/pt/PtDashboardPage';
import ClientListPage from './pages/pt/ClientListPage';
import ClientProgressPage from './pages/pt/ClientProgressPage';
import PtMealPlanPage from './pages/pt/PtMealPlanPage';
import PtAppointmentsPage from './pages/pt/PtAppointmentsPage';
import ReviewDietLogPage from './pages/pt/ReviewDietLogPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import PtVerificationPage from './pages/admin/PtVerificationPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import SosTicketsPage from './pages/admin/SosTicketsPage';
import RefundReviewPage from './pages/admin/RefundReviewPage';
import AllergenMappingPage from './pages/admin/AllergenMappingPage';
import FoodTagsPage from './pages/admin/FoodTagsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import OnboardingGuard from './components/common/OnboardingGuard';
import ChatPage from './pages/pt/ChatPage';
import CustomerChatPage from './pages/customer/CustomerChatPage';
import OnboardingPage from './pages/customer/OnboardingPage';

function App() {
    const router = createBrowserRouter([
        {
            element: <MainLayout />,
            children: [
                { path: '/', element: <LandingPage /> },
                { path: '/login', element: <LoginPage /> },
                { path: '/register', element: <RegisterPage /> },
                { path: '/forgot-password', element: <ForgotPasswordPage /> },
                { path: '/reset-password', element: <ResetPasswordPage /> },
                {
                    path: '/set-password',
                    element: <SetPasswordPage />,
                },
                {
                    path: '/onboarding',
                    element: <ProtectedRoute allowedRoles={['CUSTOMER']}><OnboardingPage /></ProtectedRoute>,
                },
                {
                    path: '/marketplace',
                    element: <ProtectedRoute allowedRoles={['CUSTOMER']}><OnboardingGuard><MarketplacePage /></OnboardingGuard></ProtectedRoute>,
                },
                {
                    path: '/pt-profile/:id',
                    element: <ProtectedRoute allowedRoles={['CUSTOMER']}><OnboardingGuard><PtDetailPage /></OnboardingGuard></ProtectedRoute>,
                },
                {
                    path: '/diet',
                    element: <ProtectedRoute allowedRoles={['CUSTOMER']}><OnboardingGuard><DietTrackerPage /></OnboardingGuard></ProtectedRoute>,
                },
                {
                    path: '/profile',
                    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
                },
                {
                    path: '/coaching',
                    element: <ProtectedRoute allowedRoles={['CUSTOMER']}><CoachingPage /></ProtectedRoute>,
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
                    path: '/chat',
                    element: <ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerChatPage /></ProtectedRoute>,
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
                    path: '/admin/users',
                    element: <ProtectedRoute allowedRoles={['ADMIN']}><UserManagementPage /></ProtectedRoute>,
                },
                {
                    path: '/admin/sos',
                    element: <ProtectedRoute allowedRoles={['ADMIN']}><SosTicketsPage /></ProtectedRoute>,
                },
                {
                    path: '/admin/refunds',
                    element: <ProtectedRoute allowedRoles={['ADMIN']}><RefundReviewPage /></ProtectedRoute>,
                },
                {
                    path: '/admin/allergens',
                    element: <ProtectedRoute allowedRoles={['ADMIN']}><AllergenMappingPage /></ProtectedRoute>,
                },
                {
                    path: '/admin/food-tags',
                    element: <ProtectedRoute allowedRoles={['ADMIN']}><FoodTagsPage /></ProtectedRoute>,
                },
            ],
        },
        {
            element: <PtProtectedRoute><MainLayout /></PtProtectedRoute>,
            children: [
                { path: '/pt', element: <PtDashboardPage /> },
                { path: '/pt/clients', element: <ClientListPage /> },
                { path: '/pt/clients/:clientId/meal-plan', element: <PtMealPlanPage /> },
                { path: '/pt/appointments', element: <PtAppointmentsPage /> },
                { path: '/pt/progress/:clientId', element: <ClientProgressPage /> },
                { path: '/pt/reviews', element: <ReviewDietLogPage /> },
                { path: '/pt/chat', element: <ChatPage /> },
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