import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    Loader2,
    MapPin,
    MessageSquare,
    Percent,
    Sparkles,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { userService } from '../../services/userService';
import { coachingPaymentService } from '../../services/coachingPaymentService';
import { appointmentService } from '../../services/appointmentService';
import { useAuthStore } from '../../stores/authStore';
import { formatVnd } from '../../utils/currency';
import WithdrawModal from '../../components/wallet/WithdrawModal';
import { toast } from 'sonner';

export default function PtDashboardPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [maxClients, setMaxClients] = useState(10);
    const [savingMax, setSavingMax] = useState(false);
    const [pendingHiresCount, setPendingHiresCount] = useState(0);
    const [alerts, setAlerts] = useState([]);
    const [upcomingAppts, setUpcomingAppts] = useState([]);
    const [wallet, setWallet] = useState(null);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [platformFeeRate, setPlatformFeeRate] = useState(null);
    const [highlightCommission, setHighlightCommission] = useState(false);
    const commissionCardRef = useRef(null);
    const focusCommission = searchParams.get('focus') === 'commission';

    // --- DATA FETCHING ---
    const fetchWallet = useCallback(async () => {
        try {
            const res = await coachingPaymentService.getMyWallet();
            setWallet(res.data?.data || null);
        } catch {
            setWallet(null);
        }
    }, []);

    const fetchPlatformFeeRate = useCallback(async () => {
        try {
            const res = await userService.getPlatformFeeRate();
            const rate = res.data?.data;
            setPlatformFeeRate(rate == null ? null : Number(rate));
        } catch {
            setPlatformFeeRate(null);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [sRes, cRes, aRes, apptRes] = await Promise.all([
                workspaceService.getStats().catch(() => ({ data: { data: {} } })),
                workspaceService.getClients({ page: 0, size: 10, status: 'PENDING' }).catch(() => ({ data: { data: { totalElements: 0 } } })),
                workspaceService.getAlerts().catch(() => ({ data: { data: [] } })),
                appointmentService.getPtUpcoming().catch(() => ({ data: { data: [] } })),
            ]);

            setStats(sRes.data?.data || {});
            setPendingHiresCount(cRes.data?.data?.totalElements || cRes.data?.data?.content?.length || 0);
            setAlerts(aRes.data?.data || []);
            setUpcomingAppts((apptRes.data?.data || []).slice(0, 4)); // Lấy tối đa 4 lịch hẹn gần nhất
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchData();
            fetchWallet();
            fetchPlatformFeeRate();
            try {
                const res = await userService.getProfile();
                const max = res.data?.data?.maxClients || res.data?.data?.ptProfile?.maxClients;
                if (max) setMaxClients(max);
            } catch {
                // Ignore profile load error
            }
        };
        init();

        const handleRealtimeUpdate = () => {
            console.log("🔄 Realtime event received! Updating dashboard stats...");
            fetchData();
            fetchWallet();
        };
        window.addEventListener('realtime_update', handleRealtimeUpdate);
        const handlePlatformFeeUpdated = (event) => {
            const rate = event.detail?.newRate;
            if (rate != null && !Number.isNaN(Number(rate))) {
                setPlatformFeeRate(Number(rate));
            } else {
                fetchPlatformFeeRate();
            }
        };
        window.addEventListener('platform_fee_updated', handlePlatformFeeUpdated);

        return () => {
            window.removeEventListener('realtime_update', handleRealtimeUpdate);
            window.removeEventListener('platform_fee_updated', handlePlatformFeeUpdated);
        };
    }, [fetchData, fetchPlatformFeeRate, fetchWallet]);

    useEffect(() => {
        if (!focusCommission) return undefined;
        setHighlightCommission(true);
        const scrollTimer = window.setTimeout(() => {
            commissionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
        const highlightTimer = window.setTimeout(() => setHighlightCommission(false), 5000);
        return () => {
            window.clearTimeout(scrollTimer);
            window.clearTimeout(highlightTimer);
        };
    }, [focusCommission]);

    const handleSaveMaxClients = async () => {
        const value = Number(maxClients);
        if (value < 1 || value > 20) {
            toast.error('Số học viên tối đa phải từ 1 đến 20');
            return;
        }
        setSavingMax(true);
        try {
            await userService.setMaxClients(value);
            toast.success('Cập nhật giới hạn học viên thành công!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không thể cập nhật giới hạn');
        } finally {
            setSavingMax(false);
        }
    };

    // --- KPI CARDS CONFIG ---
    const activeClientsCount = stats?.activeClients || stats?.totalClients || 0;
    const slotsLeft = Math.max(0, maxClients - activeClientsCount);

    const kpiCards = [
        {
            label: 'Học viên đang kèm',
            value: activeClientsCount,
            subText: `Giới hạn: ${maxClients} học viên`,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50 border-blue-100',
            onClick: () => navigate('/pt/clients')
        },
        {
            label: 'Chờ duyệt nhật ký',
            value: stats?.pendingReviews || 0,
            subText: 'Nhật ký bữa ăn cần nhận xét',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-100',
            onClick: () => navigate('/pt/reviews')
        },
        {
            id: 'commission',
            label: 'Phí hoa hồng',
            value: platformFeeRate == null ? '--' : `${platformFeeRate.toLocaleString('vi-VN')}%`,
            subText: 'Mức do admin thiết lập',
            icon: Percent,
            color: 'text-fuchsia-600',
            bg: 'bg-fuchsia-50 border-fuchsia-100',
        },
        {
            label: 'Lịch tập sắp tới',
            value: upcomingAppts.length,
            subText: 'Buổi tập offline/online upcoming',
            icon: Calendar,
            color: 'text-violet-600',
            bg: 'bg-violet-50 border-violet-100',
            onClick: () => navigate('/pt/appointments')
        },
        {
            label: 'Khả năng nhận thêm',
            value: `${slotsLeft} chỗ`,
            subText: slotsLeft > 0 ? 'Sẵn sàng nhận học viên mới' : 'Đã đạt giới hạn tối đa',
            icon: Activity,
            color: slotsLeft > 0 ? 'text-emerald-600' : 'text-rose-600',
            bg: slotsLeft > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100',
            onClick: () => document.getElementById('max-client-setting')?.scrollIntoView({ behavior: 'smooth' })
        },
    ];

    if (loading) {
        return (
            <div className="max-w-[1600px] mx-auto p-6 space-y-6 flex justify-center items-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-16 animate-fade-in mt-4 px-4 sm:px-6">

            {/* 1. HEADER & WELCOME BANNER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="space-y-2 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-blue-200 backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Nền tảng Huấn luyện & Dinh dưỡng Nutrican
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                        Xin chào, Coach {user?.fullName?.split(' ').slice(-2).join(' ')}! 👋
                    </h1>
                    <p className="text-slate-300 text-sm font-medium max-w-xl">
                        Hôm nay là một ngày tuyệt vời để theo dõi tiến độ và hỗ trợ học viên đạt được mục tiêu vóc dáng mơ ước.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 z-10 shrink-0">
                    <Button
                        onClick={() => navigate('/pt/clients')}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl h-12 px-5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                    >
                        Quản lý Học viên
                    </Button>
                    <Button
                        onClick={() => navigate('/pt/reviews')}
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-2xl h-12 px-5 backdrop-blur-md transition-all cursor-pointer"
                    >
                        Duyệt nhật ký ({stats?.pendingReviews || 0})
                    </Button>
                </div>
            </div>

            {/* 2. PENDING HIRES ACTION BANNER (Nếu có yêu cầu thuê PT mới) */}
            {pendingHiresCount > 0 && (
                <div className="rounded-3xl border-2 border-blue-400 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-blue-950 text-base sm:text-lg">Bạn có {pendingHiresCount} yêu cầu thuê Coaching mới!</p>
                            <p className="text-xs sm:text-sm text-blue-800 font-medium mt-0.5">
                                Học viên đang chờ bạn chấp nhận yêu cầu và thỏa thuận chương trình huấn luyện.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate('/pt/clients')}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 px-6 font-black shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
                    >
                        Xem & Duyệt ngay <ArrowUpRight className="w-4 h-4 ml-1.5" />
                    </Button>
                </div>
            )}

            {/* 3. KPI OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
                {kpiCards.map((stat, idx) => (
                    <Card
                        key={stat.id || idx}
                        id={stat.id === 'commission' ? 'platform-fee-card' : undefined}
                        ref={stat.id === 'commission' ? commissionCardRef : undefined}
                        onClick={stat.onClick}
                        className={`bg-white border-slate-200/80 shadow-sm transition-all duration-500 rounded-3xl group ${
                            stat.onClick ? 'cursor-pointer hover:shadow-md' : ''
                        } ${
                            stat.id === 'commission' && highlightCommission
                                ? 'border-fuchsia-400 ring-4 ring-fuchsia-200 shadow-lg shadow-fuchsia-100 scale-[1.02]'
                                : ''
                        }`}
                    >
                        <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{stat.label}</span>
                                <div className={`p-3 rounded-2xl border ${stat.bg} group-hover:scale-110 transition-transform`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">{stat.subText}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 4. MAIN DASHBOARD GRID (OPERATIONS & FINTECH WALLET) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: ALERTS & UPCOMING APPOINTMENTS (8 Cols) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* A. HỌC VIÊN CẦN CHÚ Ý TRONG NGÀY */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Học viên cần chú ý trong ngày ({alerts.length})
                            </h2>
                            {alerts.length > 0 && (
                                <span className="text-xs font-bold text-slate-400">Ưu tiên kiểm tra</span>
                            )}
                        </div>

                        {alerts.length === 0 ? (
                            <Card className="bg-slate-50/70 border border-slate-200/60 shadow-2xs rounded-3xl">
                                <CardContent className="p-10 text-center space-y-3">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
                                    <h4 className="font-bold text-slate-800 text-base">Mọi thứ đều đang tiến triển tốt!</h4>
                                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                                        Không có học viên nào bị lệch mục tiêu calo, lệch cân nặng hay hết hạn gói tập trong hôm nay.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {alerts.map((alert, idx) => {
                                    let cardStyle = "bg-amber-50/60 border-amber-200 text-amber-950";
                                    let badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                                    let iconColor = "text-amber-600";
                                    let typeText = "Cần theo dõi";

                                    if (alert.alertType === "DIET_VIOLATION") {
                                        cardStyle = "bg-rose-50/70 border-rose-200 text-rose-950";
                                        badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                                        iconColor = "text-rose-600";
                                        typeText = "Lệch mục tiêu ăn";
                                    } else if (alert.alertType === "PLAN_EXPIRED") {
                                        cardStyle = "bg-purple-50/70 border-purple-200 text-purple-950";
                                        badgeStyle = "bg-purple-100 text-purple-800 border-purple-300";
                                        iconColor = "text-purple-600";
                                        typeText = "Sắp hết hạn gói";
                                    } else if (alert.alertType === "WEIGHT_CHANGED") {
                                        cardStyle = "bg-blue-50/70 border-blue-200 text-blue-950";
                                        badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                                        iconColor = "text-blue-600";
                                        typeText = "Cập nhật cân nặng";
                                    }

                                    return (
                                        <Card key={idx} className={`${cardStyle} border rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}>
                                            <CardContent className="p-5 space-y-4">
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${badgeStyle}`}>
                                                        {typeText}
                                                    </span>
                                                    <span className="text-[11px] font-semibold opacity-60 shrink-0">{alert.logDate || 'Hôm nay'}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-base text-slate-900">{alert.clientName}</h4>
                                                    <p className="text-xs mt-1 leading-relaxed opacity-90 font-medium line-clamp-2">{alert.reason}</p>
                                                </div>
                                                <div className="pt-2 flex items-center gap-2 border-t border-black/5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => navigate(`/pt/progress/${alert.clientId}`)}
                                                        className="bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold shadow-2xs text-xs flex-1 border border-slate-200/80 h-9 cursor-pointer"
                                                    >
                                                        Xem tiến độ
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => navigate('/pt/chat', { state: { targetClientId: alert.clientId } })}
                                                        className="hover:bg-black/5 text-slate-700 rounded-xl font-bold text-xs h-9 px-3 cursor-pointer"
                                                        title="Nhắn tin"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* B. LỊCH HẸN & BUỔI TẬP SẮP TỚI */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-violet-600" />
                                Buổi huấn luyện sắp tới ({upcomingAppts.length})
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/pt/appointments')}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl cursor-pointer"
                            >
                                Xem toàn bộ lịch <ChevronRight className="w-4 h-4 ml-0.5" />
                            </Button>
                        </div>

                        {upcomingAppts.length === 0 ? (
                            <Card className="bg-white border border-slate-200/80 shadow-sm rounded-3xl">
                                <CardContent className="p-8 text-center space-y-2">
                                    <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                                    <h4 className="font-bold text-slate-700 text-sm">Chưa có lịch hẹn nào sắp tới</h4>
                                    <p className="text-xs text-slate-400">Các buổi tập offline hoặc online được đặt trước sẽ hiển thị tại đây.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl divide-y divide-slate-100 overflow-hidden">
                                {upcomingAppts.map((appt) => {
                                    const isOffline = appt.type === 'OFFLINE' || appt.trainingMode === 'OFFLINE';
                                    const apptDate = new Date(appt.startTime || appt.start);
                                    const displayName = appt.clientName || appt.counterpartName || 'Học viên';
                                    return (
                                        <div key={appt.id || `${appt.clientId}-${appt.startTime}`} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                                            <div className="flex items-start gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex flex-col items-center justify-center shrink-0 text-violet-700 font-bold">
                                                    <span className="text-[10px] uppercase font-black">{apptDate.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                                    <span className="text-base font-black leading-none">{apptDate.getDate()}</span>
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-extrabold text-slate-900 text-base truncate" title={displayName}>{displayName}</h4>
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isOffline ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {isOffline ? 'Offline' : 'Online'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-3 flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            {apptDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {appt.venueName && (
                                                            <span className="flex items-center gap-1 text-slate-600 truncate">
                                                                <MapPin className="w-3.5 h-3.5 text-rose-500" /> {appt.venueName}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => navigate(`/pt/progress/${appt.clientId}`)}
                                                    className="rounded-xl text-xs font-bold h-9 cursor-pointer"
                                                >
                                                    Hồ sơ
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => navigate('/pt/appointments')}
                                                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-9 cursor-pointer"
                                                >
                                                    Chi tiết
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN: WALLET FINTECH & SETTINGS (4 Cols) */}
                <div className="lg:col-span-4 space-y-8">

                    {/* A. VÍ THU NHẬP COACHING (FINTECH CARD) */}
                    <Card className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 text-white border-none shadow-xl rounded-3xl overflow-hidden relative">
                        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                        <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Ví Coaching Nutrican</span>
                            </div>
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/5">
                                VNĐ
                            </span>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <p className="text-xs font-medium text-slate-400">Số dư khả dụng (Có thể rút)</p>
                                <p className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                                    {formatVnd(wallet?.availableBalance || 0)}
                                </p>
                            </div>

                            {Number(wallet?.lockedBalance) > 0 && (
                                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Đang tạm giữ (Escrow):
                                    </span>
                                    <span className="font-bold text-amber-300">{formatVnd(wallet.lockedBalance)}</span>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <Button
                                    onClick={() => setWithdrawOpen(true)}
                                    disabled={!(Number(wallet?.availableBalance) > 0)}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl h-12 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 transition-all"
                                >
                                    Rút tiền ngay
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/pt/ratings')}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-2xl h-12 px-4 backdrop-blur-md cursor-pointer"
                                    title="Lịch sử giao dịch"
                                >
                                    Lịch sử
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* B. QUẢN LÝ GIỚI HẠN NHẬN HỌC VIÊN */}
                    <Card id="max-client-setting" className="bg-white border-slate-200/80 shadow-sm rounded-3xl">
                        <CardHeader className="p-6 pb-3">
                            <CardTitle className="text-base font-black text-slate-900 flex items-center justify-between">
                                <span>Giới hạn học viên</span>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                    Max: {maxClients}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                Số lượng học viên ACTIVE tối đa bạn có thể huấn luyện cùng lúc (1 – 20 người). Khi đạt giới hạn, hồ sơ sẽ tạm ẩn nút thuê.
                            </p>
                            <div className="flex gap-3 items-center">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={maxClients}
                                        onChange={(e) => setMaxClients(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        Học viên
                                    </span>
                                </div>
                                <Button
                                    onClick={handleSaveMaxClients}
                                    disabled={savingMax}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl h-12 px-5 shrink-0 shadow-sm cursor-pointer"
                                >
                                    {savingMax ? 'Đang lưu...' : 'Lưu'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* C. THAO TÁC NHANH (QUICK SHORTCUTS) */}
                    <Card className="bg-white border-slate-200/80 shadow-sm rounded-3xl">
                        <CardHeader className="p-6 pb-3">
                            <CardTitle className="text-base font-black text-slate-900">Thao tác quản lý nhanh</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-2.5">
                            {[
                                { label: 'Chỉnh sửa Portfolio & Case Study', path: '/pt/portfolio', icon: Sparkles, color: 'text-amber-500 bg-amber-50' },
                                { label: 'Quản lý lịch rảnh & Địa điểm tập', path: '/pt/appointments', icon: Calendar, color: 'text-blue-500 bg-blue-50' },
                                { label: 'Xem thống kê đánh giá sao', path: '/pt/ratings', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50' },
                                { label: 'Hòm thư & Tin nhắn học viên', path: '/pt/chat', icon: MessageSquare, color: 'text-violet-500 bg-violet-50' },
                            ].map((shortcut, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(shortcut.path)}
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all group text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${shortcut.color}`}>
                                            <shortcut.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                            {shortcut.label}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                </div>

            </div>

            {/* MODAL RÚT TIỀN */}
            <WithdrawModal
                open={withdrawOpen}
                onClose={() => setWithdrawOpen(false)}
                availableBalance={wallet?.availableBalance || 0}
                onSuccess={fetchWallet}
            />

        </div>
    );
}
