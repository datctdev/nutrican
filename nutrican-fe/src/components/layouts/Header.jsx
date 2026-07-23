import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { notificationService } from '../../services/notificationService';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Bell, LogOut, User, Settings, LayoutDashboard, Loader2 } from 'lucide-react';
import logo from '../../assets/nutrican_logo.png';
import { workspaceService } from '../../services/workspaceService';

async function fetchNotificationSnapshot() {
    const [listResponse, countResponse] = await Promise.all([
        notificationService.list({ page: 0, size: 10 }),
        notificationService.unreadCount(),
    ]);
    const notifications = listResponse.data?.data?.content || [];
    const serverUnreadCount = countResponse.data?.data ?? 0;
    return {
        notifications,
        unreadCount: notifications.length > 0 ? serverUnreadCount : 0,
    };
}

function formatNotificationBody(notification) {
    const raw = notification?.body || notification?.message || '';
    if (notification?.type !== 'CHAT_MESSAGE' || !raw.trim().startsWith('{')) {
        return raw;
    }
    try {
        const message = JSON.parse(raw);
        const sender = message.senderName?.trim();
        const content = message.content?.trim();
        let summary;
        if (message.messageType === 'IMAGE' || message.imageUrl) {
            summary = content ? `Ảnh: ${content}` : 'Đã gửi một hình ảnh';
        } else if (message.messageType === 'FILE' || message.attachmentUrl) {
            summary = content ? `Tệp PDF: ${content}` : 'Đã gửi một tệp PDF';
        } else {
            summary = content || 'Bạn có một tin nhắn mới';
        }
        return sender ? `${sender}: ${summary}` : summary;
    } catch {
        return raw;
    }
}

function getNotificationChatMappingId(notification) {
    if (notification?.linkRefId) return notification.linkRefId;
    const raw = notification?.body || notification?.message || '';
    if (notification?.type !== 'CHAT_MESSAGE' || !raw.trim().startsWith('{')) return null;
    try {
        return JSON.parse(raw).mappingId || null;
    } catch {
        return null;
    }
}

export default function Header() {
    const { user, logout, isAuthenticated, activeRole, setActiveRole } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const { unreadCount, notifications, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
    const [pendingHiresCount, setPendingHiresCount] = useState(0);
    /** Fail-open: keep «Lịch hẹn» until ACTIVE offline fetch succeeds with zero. */
    const [showAppointmentsNav, setShowAppointmentsNav] = useState(true);

    useEffect(() => {
        clearNotifications();
        if (!isAuthenticated) return undefined;

        let active = true;
        const refresh = () => {
            fetchNotificationSnapshot()
                .then((snapshot) => {
                    if (active) useNotificationStore.setState(snapshot);
                })
                .catch(() => { });
        };
        refresh();
        window.addEventListener('notification_count_updated', refresh);
        return () => {
            active = false;
            window.removeEventListener('notification_count_updated', refresh);
        };
    }, [clearNotifications, isAuthenticated, user?.id]);

    const handleNotificationToggle = async () => {
        const opening = !notifOpen;
        setNotifOpen(opening);
        if (!opening) return;

        setLoadingNotifications(true);
        try {
            useNotificationStore.setState(await fetchNotificationSnapshot());
        } catch {
        } finally {
            setLoadingNotifications(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !user?.role?.startsWith('PT')) return;
        const fetchPendingCount = async () => {
            try {
                const res = await workspaceService.getClients({ page: 0, size: 10, status: 'PENDING' });
                setPendingHiresCount(res.data.data.totalElements || res.data.data.content?.length || 0);
            } catch {
                // ignore pending count fetch failure
            }
        };
        fetchPendingCount();
        const handleAlert = () => fetchPendingCount();
        window.addEventListener('pt_client_alert', handleAlert);
        window.addEventListener('realtime_update', handleAlert);
        return () => {
            window.removeEventListener('pt_client_alert', handleAlert);
            window.removeEventListener('realtime_update', handleAlert);
        };
    }, [isAuthenticated, user]);

    useEffect(() => {
        if (!isAuthenticated || !user?.role?.startsWith('PT')) {
            setShowAppointmentsNav(true);
            return undefined;
        }
        let cancelled = false;
        const detectOfflineClients = async () => {
            try {
                let hasOffline = false;
                let page = 0;
                let last = false;
                while (!last && page < 30 && !hasOffline) {
                    const res = await workspaceService.getClients({ page, size: 100, status: 'ACTIVE' });
                    const data = res.data?.data;
                    const list = data?.content || [];
                    hasOffline = list.some((c) => c.selectedTrainingMode === 'OFFLINE' && c.mappingId);
                    last = data?.last != null ? Boolean(data.last) : list.length < 100;
                    page += 1;
                }
                if (!cancelled) setShowAppointmentsNav(hasOffline);
            } catch {
                if (!cancelled) setShowAppointmentsNav(true);
            }
        };
        detectOfflineClients();
        const onRefresh = () => detectOfflineClients();
        window.addEventListener('pt_client_alert', onRefresh);
        window.addEventListener('realtime_update', onRefresh);
        window.addEventListener('focus', onRefresh);
        return () => {
            cancelled = true;
            window.removeEventListener('pt_client_alert', onRefresh);
            window.removeEventListener('realtime_update', onRefresh);
            window.removeEventListener('focus', onRefresh);
        };
    }, [isAuthenticated, user]);

    const handleLogout = () => {
        logout();
        toast.success('Đăng xuất thành công', { description: 'Hẹn gặp lại bạn!' });
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

    const navigateFromNotification = (n) => {
        const role = user?.role;
        const currentMode = activeRole || role;
        const isPtMode = currentMode?.startsWith('PT');
        const link = n.linkType;
        if (n.type === 'PT_CONDUCT_REPORT') {
            if (role === 'ADMIN') return '/admin/finance?tab=pt-reports';
            return isPtMode ? '/pt/clients' : '/coaching?tab=contract';
        }
        if (n.type === 'PLATFORM_FEE_UPDATED') {
            return '/pt?focus=commission';
        }
        switch (link) {
            case 'DIET_LOG':
                return isPtMode ? '/pt/reviews' : '/diet';
            case 'CHAT':
                return isPtMode ? '/pt/chat' : '/chat';
            case 'HIRE':
                return isPtMode ? '/pt/clients' : '/coaching';
            case 'REFUND':
                return role === 'ADMIN'
                    ? '/admin/finance'
                    : isPtMode ? '/pt/clients' : '/coaching?tab=contract';
            case 'WEEKLY_SUMMARY':
                return '/profile';
            case 'MEAL_PLAN':
                return isPtMode ? '/pt/clients' : '/coaching?tab=meal-plan';
            default:
                return getDashboardLink();
        }
    };

    const handleNotificationClick = (n) => {
        if (n.id) {
            markAsRead(n.id);
            notificationService.markRead(n.id);
        }
        setNotifOpen(false);
        const base = navigateFromNotification(n);
        if (n.linkType === 'CHAT') {
            const mappingId = getNotificationChatMappingId(n);
            navigate(user?.role?.startsWith('PT')
                ? `/pt/chat${mappingId ? `?mappingId=${encodeURIComponent(mappingId)}` : ''}`
                : `/coaching?tab=chat${mappingId ? `&mappingId=${encodeURIComponent(mappingId)}` : ''}`);
            return;
        }
        if (n.linkRefId) {
            if (n.linkType === 'DIET_LOG') {
                navigate(rolePath(base, n.linkRefId, 'log'));
                return;
            }
        }
        navigate(base);
    };

    const rolePath = (base, refId, kind) => {
        if (kind === 'log' && base === '/diet') {
            return `/diet#log-${refId}`;
        }
        return base;
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const buildPtNav = () => {
        const items = [
            { label: 'Bảng điều khiển', href: '/pt' },
            { label: 'Học viên của tôi', href: '/pt/clients' },
            { label: 'Lịch hẹn', href: '/pt/appointments' },
            { label: 'Tin nhắn', href: '/pt/chat' },
            { label: 'Duyệt bữa ăn', href: '/pt/reviews' },
            { label: 'Thống kê đánh giá', href: '/pt/ratings' },
            { label: 'Portfolio', href: '/pt/portfolio' },
        ];
        // Fail-open: only hide after successful ACTIVE-client fetch with zero offline mappings.
        // Never gate on trainingMode alone (BOTH / ONLINE-with-offline-client).
        if (!showAppointmentsNav) {
            return items.filter((item) => item.href !== '/pt/appointments');
        }
        return items;
    };

    const navItems = {
        CUSTOMER: [
            { label: 'Nhật ký ăn uống', href: '/diet' },
            { label: 'Mục tiêu dinh dưỡng', href: '/macro-targets' },
            { label: 'Tìm PT', href: '/marketplace' },
            { label: "Coaching Của Tôi", href: '/coaching' },
        ],
        PT_CERTIFIED: buildPtNav(),
        PT_FREELANCE: buildPtNav(),
        ADMIN: [
            { label: 'Bảng điều khiển', href: '/admin' },
            { label: 'Duyệt PT', href: '/admin/pts' },
            { label: 'Dòng tiền', href: '/admin/finance' },
            { label: 'Người dùng', href: '/admin/users' },
        ],
    };

    const currentNavItems = navItems[activeRole || user?.role] || [];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">

                    <div className="flex items-center gap-10">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <img src={logo} alt="Nutrican Logo" className="w-9 h-9 rounded-xl shadow-md group-hover:scale-105 transition-transform object-cover" />
                            <span className="font-extrabold text-xl tracking-tight text-slate-900">Nutrican</span>
                        </Link>

                        {isAuthenticated && user && (
                            <nav className="hidden md:flex items-center gap-1">
                                {currentNavItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.href) && item.href !== '/' || location.pathname === item.href;
                                    const showBadge = item.href === '/pt/clients' && pendingHiresCount > 0;
                                    return (
                                        <Link
                                            key={item.href}
                                            to={item.href}
                                            className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${isActive
                                                ? 'bg-slate-100 text-blue-600'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span>{item.label}</span>
                                            {showBadge && (
                                                <span className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                                                    {pendingHiresCount}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                <div className="relative">
                                    <button
                                        type="button"
                                        aria-label="Thông báo"
                                        onClick={handleNotificationToggle}
                                        className="relative p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && notifications.length > 0 && (
                                            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {notifOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 z-50">
                                                <div className="flex items-center justify-between px-4 py-3 border-b">
                                                    <span className="font-semibold text-sm">Thông báo</span>
                                                    {notifications.length > 0 && unreadCount > 0 && (
                                                        <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700" onClick={() => { markAllAsRead(); notificationService.markAllRead(); }}>Đọc tất cả</button>
                                                    )}
                                                </div>
                                                {loadingNotifications ? (
                                                    <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-400">
                                                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông báo...
                                                    </div>
                                                ) : notifications?.length ? notifications.map((n) => (
                                                    <button
                                                        key={n.id}
                                                        type="button"
                                                        className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                                                        onClick={() => handleNotificationClick(n)}
                                                    >
                                                        <p className="text-sm font-medium text-slate-900">{n.title || n.type}</p>
                                                        <p className="text-xs text-slate-500 line-clamp-2">{formatNotificationBody(n)}</p>
                                                    </button>
                                                )) : (
                                                    <div className="px-4 py-8 text-center">
                                                        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                            <Bell className="h-5 w-5" />
                                                        </span>
                                                        <p className="mt-2 text-sm font-semibold text-slate-600">Chưa có thông báo</p>
                                                        <p className="mt-0.5 text-xs text-slate-400">Các cập nhật mới sẽ xuất hiện tại đây.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

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
                                                        <LayoutDashboard className="w-4 h-4 text-slate-400" /> Bảng điều khiển
                                                    </Link>
                                                    {user?.role?.startsWith('PT') && (
                                                        <button
                                                            onClick={() => {
                                                                setActiveRole(activeRole === 'CUSTOMER' ? user.role : 'CUSTOMER');
                                                                setProfileMenuOpen(false);
                                                                navigate(activeRole === 'CUSTOMER' ? '/pt' : '/diet');
                                                            }}
                                                            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <User className="w-4 h-4 text-slate-400" />
                                                                {activeRole === 'CUSTOMER' ? 'Chuyển sang Huấn luyện viên' : 'Chuyển sang Khách hàng'}
                                                            </div>
                                                        </button>
                                                    )}
                                                    <Link to="/profile" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                                        <User className="w-4 h-4 text-slate-400" /> Trang cá nhân
                                                    </Link>
                                                    {user?.role === 'CUSTOMER' && (
                                                        <Link to="/kyc" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                                            <User className="w-4 h-4 text-slate-400" /> Trở thành huấn luyện viên
                                                        </Link>
                                                    )}
                                                    <Link to="/settings" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                                        <Settings className="w-4 h-4 text-slate-400" /> Cài đặt
                                                    </Link>
                                                </div>
                                                <div className="border-t border-slate-100 pt-2 px-2">
                                                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl w-full transition-colors">
                                                        <LogOut className="w-4 h-4" /> Đăng xuất
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Đăng nhập</Link>
                                <Link to="/register" className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all hover:shadow-md">Bắt đầu ngay</Link>
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
                            {currentNavItems.map((item) => {
                                const showBadge = item.href === '/pt/clients' && pendingHiresCount > 0;
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="px-4 py-3 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-between"
                                    >
                                        <span>{item.label}</span>
                                        {showBadge && (
                                            <span className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                                                {pendingHiresCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
