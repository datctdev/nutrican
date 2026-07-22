import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
    Search, Activity, MessageSquare,
    Users, Clock, ShieldAlert, TrendingUp, Utensils,
    ChevronDown, UserCheck, UserX, ClipboardCheck, Wifi, MapPin, Scale, AlertTriangle
} from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';
import Modal from '../../components/common/Modal';
import WeeklySummaryForm from './components/WeeklySummaryForm';

const ALERT_META = {
    WEIGHT_CHANGED: { label: 'Cân nặng', icon: Scale, tone: 'border-sky-200 bg-sky-50 text-sky-900' },
    DIET_VIOLATION: { label: 'Dinh dưỡng', icon: AlertTriangle, tone: 'border-amber-200 bg-amber-50 text-amber-900' },
    PLAN_EXPIRED: { label: 'Thực đơn', icon: ClipboardCheck, tone: 'border-violet-200 bg-violet-50 text-violet-900' },
};

const SESSION_STATUS_VI = {
    SCHEDULED: 'Chờ dạy',
    AWAITING_CONFIRM: 'Chờ xác nhận',
    CONFIRMED: 'Đã chốt',
    AUTO_CONFIRMED: 'Tự xác nhận',
    DISPUTED: 'Tranh chấp',
    CANCELLED: 'Đã hủy',
    PENDING: 'Chờ xử lý',
    EXPIRED: 'Hết hạn',
};

function sessionStatusLabel(status) {
    if (!status) return '';
    return SESSION_STATUS_VI[status] || status;
}

export default function ClientListPage() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [activeTab, setActiveTab] = useState('ACTIVE');
    const [processingId, setProcessingId] = useState(null);
    const [endCoachingModal, setEndCoachingModal] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [evalModal, setEvalModal] = useState(null);
    const [evalForm, setEvalForm] = useState({ status: 'GREEN', evaluation: 'EXCELLENT', note: '' });
    const [savingEval, setSavingEval] = useState(false);
    const [weeklyModalClient, setWeeklyModalClient] = useState(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [alerts, setAlerts] = useState([]);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await workspaceService.getAlerts();
            setAlerts(res.data?.data || []);
        } catch {
            setAlerts([]);
        }
    }, []);

    useEffect(() => {
        setTimeout(() => {
            fetchAlerts();
        }, 0);
        const onAlert = () => fetchAlerts();
        window.addEventListener('pt_client_alert', onAlert);
        return () => window.removeEventListener('pt_client_alert', onAlert);
    }, [fetchAlerts]);

    const fetchClients = useCallback(async () => {
        try {
            setLoading(true);
            const response = await workspaceService.getClients({ page: 0, size: 50, status: activeTab });
            setClients(response.data.data.content || []);
        } catch (err) {
            toast.error('Không thể tải danh sách học viên');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    const [pendingSelfPlanCounts, setPendingSelfPlanCounts] = useState({});

    const fetchPendingSelfPlans = useCallback(async () => {
        try {
            const res = await workspaceService.listSelfPlanSubmissions();
            const all = res.data?.data || [];
            const counts = {};
            all.forEach((s) => {
                const id = String(s.customerId);
                counts[id] = (counts[id] || 0) + 1;
            });
            setPendingSelfPlanCounts(counts);
        } catch {
            setPendingSelfPlanCounts({});
        }
    }, []);

    const fetchPendingCount = useCallback(async () => {
        try {
            const res = await workspaceService.getClients({ page: 0, size: 10, status: 'PENDING' }).catch(() => ({ data: { data: { totalElements: 0 } } }));
            setPendingCount(res.data.data.totalElements || res.data.data.content?.length || 0);
        } catch {
            setPendingCount(0);
        }
    }, []);

    useEffect(() => {
        setTimeout(() => {
            fetchClients();
            fetchPendingCount();
            fetchPendingSelfPlans();
        }, 0);
    }, [fetchClients, fetchPendingCount, fetchPendingSelfPlans]);

    useEffect(() => {
        const refreshHireRequests = () => {
            fetchClients();
            fetchPendingCount();
        };
        window.addEventListener('hire_request_updated', refreshHireRequests);
        return () => window.removeEventListener('hire_request_updated', refreshHireRequests);
    }, [fetchClients, fetchPendingCount]);

    const handleAction = async (clientId, action) => {
        try {
            setProcessingId(clientId);
            await workspaceService.updateHireRequest(clientId, action);

            toast.success(action === 'ACCEPT'
                ? 'Đã chấp nhận. Đang chờ học viên thanh toán để kích hoạt coaching.'
                : 'Đã từ chối yêu cầu.');
            fetchClients();
            fetchPendingCount();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu.');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredClients = clients.filter(client => {
        const matchName = client.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === '' || client.status === statusFilter;
        return matchName && matchStatus;
    });

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'HV';

    const formatSafeDate = (dateString) => {
        if (!dateString) return 'Chưa có hoạt động';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Chưa có hoạt động' : date.toLocaleDateString('vi-VN');
    };

    const getStatusBadge = (status) => {
        const s = status?.toUpperCase();
        if (s === 'GREEN') return { label: 'Tốt / Ổn định', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        if (s === 'YELLOW' || s === 'AMBER') return { label: 'Cần nhắc nhở', color: 'bg-amber-100 text-amber-700 border-amber-200' };
        if (s === 'RED') return { label: 'Báo động', color: 'bg-red-100 text-red-700 border-red-200' };
        if (s === 'PENDING') return { label: 'Chờ duyệt', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        if (s === 'AWAITING_PAYMENT') return { label: 'Chờ thanh toán', color: 'bg-violet-100 text-violet-700 border-violet-200' };
        if (s === 'ACTIVE') return { label: 'Đang hoạt động', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        return { label: 'Đang quản lý', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    };

    const rateUnitLabel = (unit) => {
        const u = (unit || '').toUpperCase();
        if (u === 'SESSION_60') return '/ buổi 60 phút';
        if (u === 'SESSION_90') return '/ buổi 90 phút';
        if (u === 'MONTH') return '/ tháng';
        if (u === 'WEEK') return '/ tuần';
        return unit ? `/ ${unit}` : '';
    };

    const intakeStatusLabel = (code) => {
        const map = {
            OK: 'Đúng mục tiêu',
            ON_TARGET: 'Đúng mục tiêu',
            UNDER: 'Ăn thiếu calo',
            UNDER_INTAKE: 'Ăn thiếu calo',
            OVER: 'Vượt calo',
            OVER_MACRO: 'Vượt macro / calo',
            AT_RISK: 'Cần chú ý',
        };
        return map[code] || null;
    };

    const getEvalLabel = (evaluation) => {
        const e = (evaluation || '').toUpperCase();
        if (e === 'POOR') return 'Kém';
        if (e === 'AVERAGE') return 'Trung bình';
        return 'Tuyệt vời';
    };

    const openEvalModal = (client) => {
        setEvalForm({
            status: client.statusConfirmed ? (client.status || 'GREEN') : (client.suggestedStatus || client.status || 'GREEN'),
            evaluation: client.statusConfirmed
                ? (client.evaluation || 'EXCELLENT')
                : (client.suggestedEvaluation || 'EXCELLENT'),
            note: client.coachingEvalNote || '',
        });
        setEvalModal(client);
    };

    const handleSaveEval = async () => {
        if (!evalModal) return;
        if ((evalForm.status === 'RED' || evalForm.evaluation === 'POOR') && !evalForm.note.trim()) {
            toast.error('Ghi chú bắt buộc khi chọn Báo động hoặc Kém');
            return;
        }
        setSavingEval(true);
        try {
            await workspaceService.setCoachingEvaluation(evalModal.clientId, evalForm);
            toast.success('Đã cập nhật trạng thái / đánh giá');
            setEvalModal(null);
            fetchClients();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không lưu được đánh giá');
        } finally {
            setSavingEval(false);
        }
    };

    const filterOptions = [
        { value: '', label: 'Tất cả trạng thái' },
        { value: 'GREEN', label: 'Tốt / Ổn định', hoverClass: 'hover:bg-emerald-50 hover:text-emerald-700' },
        { value: 'YELLOW', label: 'Cần nhắc nhở', hoverClass: 'hover:bg-amber-50 hover:text-amber-700' },
        { value: 'RED', label: 'Báo động', hoverClass: 'hover:bg-red-50 hover:text-red-700' },
    ];

    return (
        <>
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in mt-6 px-4 min-w-0 overflow-x-hidden">

            {alerts.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/80 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-700" />
                        <p className="font-bold text-amber-900 text-sm">Cảnh báo học viên ({alerts.length})</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {alerts.map((a) => {
                            const meta = ALERT_META[a.alertType] || ALERT_META.DIET_VIOLATION;
                            const Icon = meta.icon;
                            return (
                                <div key={`${a.clientId}-${a.alertType || a.reason}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${meta.tone}`}>
                                            <Icon className="w-3 h-3" /> {meta.label}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{a.clientName}</p>
                                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                                {a.reason || intakeStatusLabel(a.intakeStatus) || 'Cần chú ý'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-lg h-8 text-xs font-semibold"
                                            onClick={() => navigate('/pt/chat', { state: { targetClientId: a.clientId } })}
                                        >
                                            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Nhắn tin
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="rounded-lg h-8 text-xs font-semibold bg-slate-900 text-white"
                                            onClick={() => navigate(`/pt/progress/${a.clientId}`)}
                                        >
                                            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Tiến độ
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh sách Học viên</h1>
                    <p className="text-slate-500 mt-1 font-medium">Quản lý tiến độ và tương tác với các học viên của bạn.</p>
                </div>
            </div>


            <div className="flex gap-6 border-b border-slate-200">
                <button
                    className={`pb-4 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'ACTIVE' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setActiveTab('ACTIVE'); setStatusFilter(''); }}
                >
                    <Users className="w-4 h-4" /> Học viên đang quản lý
                    {activeTab === 'ACTIVE' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                </button>
                <button
                    className={`pb-4 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'PENDING' ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setActiveTab('PENDING'); setStatusFilter(''); }}
                >
                    <Clock className="w-4 h-4" /> Yêu cầu chờ duyệt
                    {pendingCount > 0 && (
                        <span className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                            {pendingCount}
                        </span>
                    )}
                    {activeTab === 'PENDING' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-600 rounded-t-full"></span>}
                </button>
                <button
                    className={`pb-4 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'AWAITING_PAYMENT' ? 'text-violet-600' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setActiveTab('AWAITING_PAYMENT'); setStatusFilter(''); }}
                >
                    <Clock className="w-4 h-4" /> Chờ học viên thanh toán
                    {activeTab === 'AWAITING_PAYMENT' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-600 rounded-t-full"></span>}
                </button>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 relative">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tên học viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                        />
                    </div>


                    {activeTab === 'ACTIVE' && (
                        <div className="relative min-w-[180px]" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center justify-between w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-700 font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <span>{filterOptions.find(opt => opt.value === statusFilter)?.label}</span>
                                <ChevronDown className={`w-4 h-4 ml-2 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-[200px] z-50 origin-top-right bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                    <div className="p-1.5 flex flex-col gap-0.5">
                                        {filterOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setStatusFilter(option.value);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-xl text-left transition-colors ${
                                                    statusFilter === option.value
                                                        ? 'bg-slate-100 text-slate-900'
                                                        : `text-slate-600 ${option.hoverClass || 'hover:bg-slate-50 hover:text-blue-600'}`
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl bg-slate-200" />)}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                    {activeTab === 'PENDING' ? (
                        <>
                            <ShieldAlert className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Không có yêu cầu nào</h3>
                            <p className="text-slate-500 mt-2 font-medium">Bạn đã xử lý hết tất cả yêu cầu thuê hiện tại.</p>
                        </>
                    ) : (
                        <>
                            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Không tìm thấy học viên</h3>
                            <p className="text-slate-500 mt-2 font-medium">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => {
                        const currentStatus = activeTab === 'PENDING'
                            ? 'PENDING'
                            : activeTab === 'AWAITING_PAYMENT' ? 'AWAITING_PAYMENT' : client.status;
                        const badge = getStatusBadge(currentStatus);

                        return (
                            <Card key={client.clientId} className="bg-white border-slate-200/80 shadow-md shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300 rounded-3xl overflow-hidden flex flex-col group ring-1 ring-slate-100">
                                <div className={`h-1.5 ${activeTab === 'PENDING' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500'}`} />

                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-105 transition-transform flex-shrink-0 ${activeTab === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {client.avatarUrl ? (
                                                <img src={client.avatarUrl} alt={client.clientName} className="w-full h-full rounded-2xl object-cover" />
                                            ) : (
                                                getInitials(client.clientName)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-extrabold text-lg text-slate-900 truncate" title={client.clientName}>
                                                {client.clientName}
                                            </h3>
                                            {activeTab === 'ACTIVE' && pendingSelfPlanCounts[String(client.clientId)] > 0 && (
                                                <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                                    Thực đơn tự chọn chờ duyệt ({pendingSelfPlanCounts[String(client.clientId)]})
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-500">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate">
                                                    {activeTab === 'PENDING'
                                                        ? 'Đang chờ phản hồi'
                                                        : activeTab === 'AWAITING_PAYMENT'
                                                            ? 'Đã chấp nhận · chờ thanh toán'
                                                            : `Log gần nhất: ${formatSafeDate(client.lastLogTime)}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 flex-1">
                                        <div className="flex justify-between items-center mb-3 gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</span>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md border ${badge.color} ${!client.statusConfirmed && activeTab === 'ACTIVE' ? 'border-dashed opacity-90' : ''}`}>
                                                    {badge.label}
                                                </span>
                                                {activeTab === 'ACTIVE' && !client.statusConfirmed && (
                                                    <span className="text-[9px] font-semibold text-slate-400">Gợi ý hệ thống — chưa lưu</span>
                                                )}
                                            </div>
                                        </div>

                                        {(activeTab === 'PENDING' || activeTab === 'AWAITING_PAYMENT') && (
                                            <div className="space-y-2 rounded-xl border border-amber-100 bg-white p-3">
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                    {client.selectedTrainingMode === 'OFFLINE'
                                                        ? <MapPin className="h-4 w-4 text-emerald-600" />
                                                        : <Wifi className="h-4 w-4 text-blue-600" />}
                                                    Coaching {client.selectedTrainingMode === 'OFFLINE' ? 'offline' : 'online'}
                                                </div>
                                                <p className="text-sm font-black text-slate-900">
                                                    {Number(client.agreedAmount || 0).toLocaleString('vi-VN')}đ
                                                    {client.selectedTrainingMode === 'OFFLINE' && client.sessionCount ? (
                                                        <span className="ml-1 text-xs font-semibold text-slate-500">· gói {client.sessionCount} buổi</span>
                                                    ) : (
                                                        <span className="ml-1 text-xs font-semibold text-slate-500">{rateUnitLabel(client.agreedRateUnit)}</span>
                                                    )}
                                                </p>
                                                {client.selectedTrainingMode === 'OFFLINE' && client.perSessionAmount && client.sessionCount && (
                                                    <p className="text-xs text-slate-500">
                                                        {client.sessionCount} × {Number(client.perSessionAmount).toLocaleString('vi-VN')}đ/buổi
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-500">Giá đã được chốt tại thời điểm học viên gửi yêu cầu.</p>
                                                {client.selectedTrainingMode === 'OFFLINE' && client.venueName && (
                                                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5">
                                                        <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                                                            Gói offline {client.sessionCount ? `· ${client.sessionCount} buổi` : ''}
                                                        </p>
                                                        <p className="mt-1 text-sm font-bold text-slate-800">{client.venueName}</p>
                                                        <p className="text-xs text-slate-600">{client.venueAddress}</p>
                                                        {(client.sessions || []).length > 0 ? (
                                                            <ul className="mt-1 space-y-0.5">
                                                                {client.sessions.map((s) => (
                                                                    <li key={s.id || s.sequence} className="text-xs font-semibold text-slate-700">
                                                                        #{s.sequence}: {new Date(s.startTime).toLocaleString('vi-VN')}
                                                                        {s.status ? ` · ${sessionStatusLabel(s.status)}` : ''}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : client.firstSessionStart && (
                                                            <p className="mt-1 text-xs font-semibold text-slate-700">
                                                                {new Date(client.firstSessionStart).toLocaleString('vi-VN')}
                                                                {client.firstSessionEnd ? ` – ${new Date(client.firstSessionEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {activeTab === 'AWAITING_PAYMENT' && client.paymentDueAt && (
                                                    <p className="text-xs font-bold text-amber-700">
                                                        Hạn thanh toán: {new Date(client.paymentDueAt).toLocaleString('vi-VN')}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'ACTIVE' && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá chung</span>
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <div className={`flex items-center gap-1 text-sm font-bold ${!client.statusConfirmed ? 'text-slate-500' : 'text-slate-700'}`}>
                                                            <Activity className={`w-4 h-4 ${
                                                                (client.statusConfirmed ? client.evaluation : client.suggestedEvaluation) === 'POOR' || client.status === 'RED'
                                                                    ? 'text-red-500'
                                                                    : (client.statusConfirmed ? client.evaluation : client.suggestedEvaluation) === 'AVERAGE' || client.status === 'YELLOW'
                                                                        ? 'text-amber-500'
                                                                        : 'text-emerald-500'
                                                            }`} />
                                                            {client.statusConfirmed
                                                                ? getEvalLabel(client.evaluation)
                                                                : getEvalLabel(client.suggestedEvaluation || 'EXCELLENT')}
                                                        </div>
                                                        {!client.statusConfirmed && (
                                                            <span className="text-[9px] font-semibold text-slate-400">Gợi ý hệ thống — chưa lưu</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => openEvalModal(client)}
                                                    className="w-full h-9 rounded-xl text-xs font-bold border-slate-200"
                                                >
                                                    Điều chỉnh trạng thái / đánh giá
                                                </Button>
                                            </div>
                                        )}

                                        {activeTab === 'ACTIVE' && client.selectedTrainingMode === 'OFFLINE' && (client.sessions || []).length > 0 && (
                                            <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3 space-y-2">
                                                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Buổi tập offline</p>
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    Mở <span className="font-bold text-slate-700">Lịch hẹn</span> → nhấn buổi trên thời khóa biểu để bấm «Đã dạy xong».
                                                </p>
                                                <ul className="space-y-1.5">
                                                    {client.sessions.map((s) => (
                                                        <li key={s.id || s.sequence} className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                                                            <span>
                                                                #{s.sequence}: {new Date(s.startTime).toLocaleString('vi-VN')}
                                                                {s.status ? ` · ${sessionStatusLabel(s.status)}` : ''}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>


                                    {activeTab === 'ACTIVE' ? (
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => navigate('/pt/chat', { state: { targetClientId: client.clientId } })}
                                                    className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl h-11 shadow-sm font-bold transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4 mr-2" /> Nhắn tin
                                                </Button>
                                                <Button
                                                    onClick={() => navigate(`/pt/progress/${client.clientId}`)}
                                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 shadow-md shadow-slate-900/15 font-bold transition-all"
                                                >
                                                    Tiến độ <TrendingUp className="w-4 h-4 ml-1.5" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        const params = new URLSearchParams({ clientId: client.clientId });
                                                        if (client.clientName) params.set('clientName', client.clientName);
                                                        navigate(`/pt/clients/dietlog?${params.toString()}`);
                                                    }}
                                                    className="border-amber-200/80 text-amber-800 hover:bg-amber-50 rounded-xl h-10 font-semibold text-xs bg-amber-50/30"
                                                >
                                                    <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Duyệt bữa
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => navigate(`/pt/clients/${client.clientId}/meal-plan`)}
                                                    className="border-emerald-200/80 text-emerald-800 hover:bg-emerald-50 rounded-xl h-10 font-semibold text-xs bg-emerald-50/30"
                                                >
                                                    <Utensils className="w-3.5 h-3.5 mr-1.5" /> Thực đơn
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setWeeklyModalClient(client)}
                                                    className="border-indigo-200/80 text-indigo-800 hover:bg-indigo-50 rounded-xl h-10 font-semibold text-xs bg-indigo-50/30"
                                                >
                                                    Tổng kết tuần
                                                </Button>
                                                {client.mappingStatus === 'END_REQUESTED' && client.endRequestedBy === 'PT' ? (
                                                    <Button
                                                        disabled
                                                        className="bg-slate-100 text-slate-400 border border-slate-200 rounded-xl h-10 font-semibold text-xs cursor-not-allowed"
                                                    >
                                                        Chờ HV xác nhận
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setEndCoachingModal({
                                                            clientId: client.clientId,
                                                            mappingStatus: client.mappingStatus,
                                                            clientName: client.clientName,
                                                        })}
                                                        className={`rounded-xl h-10 font-semibold text-xs ${
                                                            client.mappingStatus === 'END_REQUESTED'
                                                                ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-50 bg-emerald-50/30'
                                                                : 'border-rose-200/80 text-rose-700 hover:bg-rose-50 bg-rose-50/20'
                                                        }`}
                                                    >
                                                        {client.mappingStatus === 'END_REQUESTED'
                                                            ? 'Xác nhận kết thúc'
                                                            : 'Kết thúc'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : activeTab === 'PENDING' ? (
                                        <div className="flex gap-2">
                                            <Button
                                                disabled={processingId === client.clientId}
                                                onClick={() => handleAction(client.clientId, 'ACCEPT')}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 shadow-md shadow-emerald-500/20 font-bold"
                                            >
                                                <UserCheck className="w-4 h-4 mr-1.5" /> Chấp nhận
                                            </Button>
                                            <Button
                                                disabled={processingId === client.clientId}
                                                onClick={() => handleAction(client.clientId, 'REJECT')}
                                                variant="outline"
                                                className="flex-1 border-red-100 text-red-600 hover:bg-red-50 rounded-xl h-11 font-bold"
                                            >
                                                <UserX className="w-4 h-4 mr-1.5" /> Từ chối
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-bold text-violet-700">
                                            Đang chờ học viên hoàn tất thanh toán VNPay
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>

        <Modal isOpen={!!endCoachingModal} onClose={() => setEndCoachingModal(null)}
            title={endCoachingModal?.mappingStatus === 'END_REQUESTED' ? 'Xác nhận kết thúc coaching?' : 'Kết thúc coaching?'}>
            <p className="text-sm text-slate-600 mb-4">
                {endCoachingModal?.mappingStatus === 'END_REQUESTED'
                    ? `Xác nhận kết thúc coaching với ${endCoachingModal?.clientName || 'học viên'}?`
                    : `Gửi yêu cầu kết thúc coaching với ${endCoachingModal?.clientName || 'học viên'}? Học viên cần xác nhận.`}
            </p>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEndCoachingModal(null)}>Hủy</Button>
                <Button onClick={async () => {
                    if (!endCoachingModal) return;
                    try {
                        if (endCoachingModal.mappingStatus === 'END_REQUESTED') {
                            await workspaceService.confirmEndCoaching(endCoachingModal.clientId);
                            toast.success('Đã xác nhận kết thúc coaching');
                        } else {
                            await workspaceService.requestEndCoaching(endCoachingModal.clientId);
                            toast.success('Đã gửi yêu cầu kết thúc coaching');
                        }
                        setEndCoachingModal(null);
                        fetchClients();
                    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
                }}>Xác nhận</Button>
            </div>
        </Modal>

        <Modal isOpen={!!evalModal} onClose={() => setEvalModal(null)} title="Điều chỉnh trạng thái & đánh giá">
            <div className="space-y-4">
                {evalModal && !evalModal.statusConfirmed && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Gợi ý hệ thống: <strong>{evalModal.suggestedStatus || '—'}</strong>
                        {' · '}
                        <strong>{getEvalLabel(evalModal.suggestedEvaluation)}</strong>
                        — bạn cần xác nhận để lưu chính thức.
                    </div>
                )}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Trạng thái</label>
                    <select
                        value={evalForm.status}
                        onChange={(e) => setEvalForm({ ...evalForm, status: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                    >
                        <option value="GREEN">Tốt / Ổn định</option>
                        <option value="YELLOW">Cần nhắc nhở</option>
                        <option value="RED">Báo động</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Đánh giá chung</label>
                    <select
                        value={evalForm.evaluation}
                        onChange={(e) => setEvalForm({ ...evalForm, evaluation: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                    >
                        <option value="EXCELLENT">Tuyệt vời</option>
                        <option value="AVERAGE">Trung bình</option>
                        <option value="POOR">Kém</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Ghi chú {(evalForm.status === 'RED' || evalForm.evaluation === 'POOR') ? '*' : '(tuỳ chọn)'}
                    </label>
                    <textarea
                        value={evalForm.note}
                        onChange={(e) => setEvalForm({ ...evalForm, note: e.target.value })}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Lý do điều chỉnh..."
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEvalModal(null)}>Hủy</Button>
                    <Button disabled={savingEval} onClick={handleSaveEval} className="bg-blue-600 text-white font-bold">
                        {savingEval ? 'Đang lưu...' : 'Xác nhận lưu'}
                    </Button>
                </div>
            </div>
        </Modal>
        <Modal isOpen={!!weeklyModalClient} onClose={() => setWeeklyModalClient(null)} title={`Tổng kết tuần · ${weeklyModalClient?.clientName || ''}`}>
            {weeklyModalClient && (
                <WeeklySummaryForm
                    clientId={weeklyModalClient.clientId}
                    coachingStartedAt={weeklyModalClient.coachingStartedAt}
                    onDone={() => setWeeklyModalClient(null)}
                />
            )}
        </Modal>
        </>
    );
}
