// src/components/layouts/Header.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { useState } from 'react';
import { Menu, X, ChevronDown, Bell, LogOut, User, Settings, LayoutDashboard, Sparkles, Target } from 'lucide-react';

export default function Header() {
    const { user, logout, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully', { description: 'See you again!' });
        navigate('/login');
    };

    const getDashboardLink = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'ADMIN': return '/admin';
            case 'PT_CERTIFIED':
            case 'PT_FREELANCE': return '/pt';
            default: return '/diet';
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const navItems = {
        CUSTOMER: [
            { label: 'Diet Tracker', href: '/diet' },
            { label: 'Find PT', href: '/marketplace' },
            { label: 'Messages', href: '/chat' },
            { label: 'Profile', href: '/profile' },
            { label: 'Macro Targets', href: '/macro-targets' },
            { label: 'Verification', href: '/kyc' },
        ],
        PT_CERTIFIED: [
            { label: 'Dashboard', href: '/pt' },
            { label: 'My Clients', href: '/pt/clients' },
            { label: 'Messages', href: '/pt/chat' }, // Tab Chat
            { label: 'Reviews', href: '/pt/reviews' },
        ],
        PT_FREELANCE: [
            { label: 'Dashboard', href: '/pt' },
            { label: 'My Clients', href: '/pt/clients' },
            { label: 'Messages', href: '/pt/chat' }, // Tab Chat
            { label: 'Reviews', href: '/pt/reviews' },
        ],
        ADMIN: [
            { label: 'Dashboard', href: '/admin' },
            { label: 'PT Approvals', href: '/admin/pts' },
            { label: 'Users', href: '/admin/users' },
            { label: 'SOS Center', href: '/admin/sos' },
        ],
    };

    const currentNavItems = navItems[user?.role] || [];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">

                    <div className="flex items-center gap-10">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-slate-900">Nutrican</span>
                        </Link>

                        {isAuthenticated && user && (
                            <nav className="hidden md:flex items-center gap-1">
                                {currentNavItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.href) && item.href !== '/' || location.pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            to={item.href}
                                            className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-slate-100 text-blue-600'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                <button className="relative p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                                </button>

                                <div className="relative">
                                    <button
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                        className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-100 rounded-full border border-transparent hover:border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        {user?.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.fullName} className="h-8 w-8 rounded-full object-cover shadow-sm border border-slate-200" onError={(e) => e.target.style.display = 'none'} />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200/50 flex items-center justify-center text-blue-700 font-bold text-xs shadow-sm">
                                                {getInitials(user?.fullName)}
                                            </div>
                                        )}
                                        <div className="hidden lg:block text-left">
                                            <p className="text-sm font-bold text-slate-800 leading-none">{user?.fullName}</p>
                                            <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {profileMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-200 py-2 z-50 animate-scale-in origin-top-right">
                                                <div className="px-5 py-3 border-b border-slate-100">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</p>
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                                                </div>
                                                <div className="py-2 px-2">
                                                    <Link to={getDashboardLink()} onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                                        <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
                                                    </Link>
                                                    <Link to="/profile" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                                        <User className="w-4 h-4 text-slate-400" /> My Profile
                                                    </Link>
                                                    <Link to="/settings" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                                        <Settings className="w-4 h-4 text-slate-400" /> Settings
                                                    </Link>
                                                </div>
                                                <div className="border-t border-slate-100 pt-2 px-2">
                                                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl w-full transition-colors">
                                                        <LogOut className="w-4 h-4" /> Sign out
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
                                <Link to="/register" className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all hover:shadow-md">Get Started</Link>
                            </div>
                        )}

                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && isAuthenticated && user && (
                    <div className="md:hidden border-t border-slate-100 py-4 animate-slide-in">
                        <nav className="flex flex-col gap-1">
                            {currentNavItems.map((item) => (
                                <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}