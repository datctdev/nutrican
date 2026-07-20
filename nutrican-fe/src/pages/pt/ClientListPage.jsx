// src/pages/pt/ClientListPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FoodAllergySelector from '../../components/common/FoodAllergySelector';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
    Search, Activity, MessageSquare,
    Users, Clock, ShieldAlert, TrendingUp, Utensils,
    ChevronDown, UserCheck, UserX, ClipboardCheck, Wifi, MapPin
} from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';
import Modal from '../../components/common/Modal';

export default function ClientListPage() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // Bộ lọc local: GREEN, YELLOW, RED
    const [activeTab, setActiveTab] = useState('ACTIVE'); // Tab API: ACTIVE hoặc PENDING
    const [processingId, setProcessingId] = useState(null); // Trạng thái loading khi bấm Duyệt
    const [endCoachingModal, setEndCoachingModal] = useState(null); // { clientId, mappingStatus, fullName }
    const [pendingCount, setPendingCount] = useState(0);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [creatingClient, setCreatingClient] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '',
        fullName: '',
        phoneNumber: '',
        heightCm: '',
        gender: 'male',
        dateOfBirth: '',
        weight: '',
        bodyFatPercent: '',
        tdee: '',
        allergicFoodCodes: [],
        dietPreference: 'NORMAL',
    });

    const handleCreateClient = async (e) => {
        e.preventDefault();
        if (!createForm.email || !createForm.fullName) {
            toast.error('Email và Họ tên là bắt buộc');
            return;
        }
        setCreatingClient(true);
        try {
            const payload = {
                ...createForm,
                heightCm: createForm.heightCm ? Number(createForm.heightCm) : null,
                weight: createForm.weight ? Number(createForm.weight) : null,
                bodyFatPercent: createForm.bodyFatPercent ? Number(createForm.bodyFatPercent) : null,
                tdee: createForm.tdee ? Number(createForm.tdee) : null,
                dateOfBirth: createForm.dateOfBirth || null,
                allergicFoodCodes: createForm.allergicFoodCodes,
            };
            await workspaceService.createClient(payload);
            toast.success('Thêm học viên mới thành công!');
            setIsCreateModalOpen(false);
            setCreateForm({
                email: '',
                fullName: '',
                phoneNumber: '',
                heightCm: '',
                gender: 'male',
                dateOfBirth: '',
                weight: '',
                bodyFatPercent: '',
                tdee: '',
                allergicFoodCodes: [],
                dietPreference: 'NORMAL',
            });
            fetchClients();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo học viên.');
        } finally {
            setCreatingClient(false);
        }
    };

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
        return { label: s || 'ACTIVE', color: 'bg-slate-100 text-slate-600 border-slate-200' };
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
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <p className="font-bold text-amber-900 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Cảnh báo học viên ({alerts.length})
                    </p>
                    {alerts.map((a) => (
                        <div key={a.clientId} className="text-sm text-amber-800 flex justify-between gap-2">
                            <span className="font-semibold">{a.clientName}</span>
                            <span>{a.intakeStatus} — {a.reason}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh sách Học viên</h1>
                    <p className="text-slate-500 mt-1 font-medium">Quản lý tiến độ và tương tác với các học viên của bạn.</p>
                </div>
                <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 px-6 shadow-md shadow-blue-500/10 self-start md:self-end"
                >
                    + Thêm học viên mới
                </Button>
            </div>

            {/* HỆ THỐNG TAB */}
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

                    {/* Chỉ hiện Dropdown lọc khi ở Tab ACTIVE */}
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
                        // Nếu đang ở tab PENDING, ghi đè status thành PENDING để load UI màu xanh lơ
                        const currentStatus = activeTab === 'PENDING'
                            ? 'PENDING'
                            : activeTab === 'AWAITING_PAYMENT' ? 'AWAITING_PAYMENT' : client.status;
                        const badge = getStatusBadge(currentStatus);

                        return (
                            <Card key={client.clientId} className="bg-white border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden flex flex-col group">
                                <div className={`h-3 ${activeTab === 'PENDING' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} />

                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-105 transition-transform flex-shrink-0 ${activeTab === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {client.avatarUrl ? ( // Chú ý: Backend trả về avatarUrl, không phải clientAvatarUrl
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
                                                    Self-plan chờ duyệt ({pendingSelfPlanCounts[String(client.clientId)]})
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
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</span>
                                            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md border ${badge.color}`}>
                                                {badge.label}
                                            </span>
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
                                                        <span className="ml-1 text-xs font-semibold text-slate-500">/ {client.agreedRateUnit}</span>
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
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá chung</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
                                                    <Activity className={`w-4 h-4 ${client.status === 'RED' ? 'text-red-500' : client.status === 'YELLOW' ? 'text-amber-500' : 'text-emerald-500'}`} />
                                                    {client.status === 'RED' ? 'Kém' : client.status === 'YELLOW' ? 'Trung bình' : 'Tuyệt vời'}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* NÚT ACTION */}
                                    {activeTab === 'ACTIVE' ? (
                                        <div className="flex flex-col gap-2">
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
                                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 shadow-sm font-bold transition-all"
                                                >
                                                    Tiến độ <TrendingUp className="w-4 h-4 ml-1.5" />
                                                </Button>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    const params = new URLSearchParams({ clientId: client.clientId });
                                                    if (client.clientName) params.set('clientName', client.clientName);
                                                    navigate(`/pt/clients/dietlog?${params.toString()}`);
                                                }}
                                                className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl h-10 font-semibold text-sm"
                                            >
                                                <ClipboardCheck className="w-4 h-4 mr-2" /> Duyệt bữa ăn
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => navigate(`/pt/clients/${client.clientId}/meal-plan`)}
                                                className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl h-10 font-semibold text-sm"
                                            >
                                                <Utensils className="w-4 h-4 mr-2" /> Thực đơn tuần
                                            </Button>
                                            {client.mappingStatus === 'END_REQUESTED' && client.endRequestedBy === 'PT' ? (
                                                <Button
                                                    disabled
                                                    className="w-full bg-slate-100 text-slate-400 border border-slate-200 rounded-xl h-10 font-semibold text-sm cursor-not-allowed"
                                                >
                                                    Đang chờ học viên xác nhận kết thúc
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setEndCoachingModal({
                                                        clientId: client.clientId,
                                                        mappingStatus: client.mappingStatus,
                                                        fullName: client.fullName,
                                                    })}
                                                    className={`w-full rounded-xl h-10 font-semibold text-sm ${
                                                        client.mappingStatus === 'END_REQUESTED'
                                                            ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-50 bg-emerald-50/30'
                                                            : 'border-amber-200 text-amber-800 hover:bg-amber-50'
                                                    }`}
                                                >
                                                    {client.mappingStatus === 'END_REQUESTED'
                                                        ? 'Xác nhận kết thúc coaching'
                                                        : 'Kết thúc coaching'}
                                                </Button>
                                            )}
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
                    ? `Xác nhận kết thúc coaching với ${endCoachingModal?.fullName || 'khách hàng'}?`
                    : `Gửi yêu cầu kết thúc coaching với ${endCoachingModal?.fullName || 'khách hàng'}? Khách hàng cần xác nhận.`}
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

        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Thêm học viên mới">
            <form onSubmit={handleCreateClient} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email *</label>
                        <input
                            type="email"
                            required
                            value={createForm.email}
                            onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                            placeholder="client@gmail.com"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên *</label>
                        <input
                            type="text"
                            required
                            value={createForm.fullName}
                            onChange={(e) => setCreateForm({...createForm, fullName: e.target.value})}
                            placeholder="Jane Doe"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                        <input
                            type="text"
                            value={createForm.phoneNumber}
                            onChange={(e) => setCreateForm({...createForm, phoneNumber: e.target.value})}
                            placeholder="09xxxxxxxx"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày sinh</label>
                        <input
                            type="date"
                            value={createForm.dateOfBirth}
                            onChange={(e) => setCreateForm({...createForm, dateOfBirth: e.target.value})}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chiều cao (cm)</label>
                        <input
                            type="number"
                            value={createForm.heightCm}
                            onChange={(e) => setCreateForm({...createForm, heightCm: e.target.value})}
                            placeholder="170"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giới tính</label>
                        <select
                            value={createForm.gender}
                            onChange={(e) => setCreateForm({...createForm, gender: e.target.value})}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        >
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cân nặng (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={createForm.weight}
                            onChange={(e) => setCreateForm({...createForm, weight: e.target.value})}
                            placeholder="60"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tỷ lệ mỡ (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={createForm.bodyFatPercent}
                            onChange={(e) => setCreateForm({...createForm, bodyFatPercent: e.target.value})}
                            placeholder="20"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mục tiêu Calo/TDEE</label>
                        <input
                            type="number"
                            value={createForm.tdee}
                            onChange={(e) => setCreateForm({...createForm, tdee: e.target.value})}
                            placeholder="2000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chế độ ăn</label>
                        <select
                            value={createForm.dietPreference}
                            onChange={(e) => setCreateForm({...createForm, dietPreference: e.target.value})}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                        >
                            <option value="NORMAL">Bình thường</option>
                            <option value="VEGETARIAN">Ăn chay (Vegetarian)</option>
                            <option value="VEGAN">Ăn thuần chay (Vegan)</option>
                            <option value="KETO">Chế độ Keto</option>
                            <option value="EAT_CLEAN">Ăn Eat Clean</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dị ứng</label>
                        <div className="mt-2">
                            <FoodAllergySelector 
                                selectedFoodCodes={createForm.allergicFoodCodes} 
                                onChange={(codes) => setCreateForm({ ...createForm, allergicFoodCodes: codes })} 
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
                    <Button type="submit" disabled={creatingClient} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5">
                        {creatingClient ? 'Đang lưu...' : 'Lưu lại'}
                    </Button>
                </div>
            </form>
        </Modal>
        </>
    );
}
