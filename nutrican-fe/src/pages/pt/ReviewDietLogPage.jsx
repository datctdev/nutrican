// src/pages/pt/ReviewDietLogPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
    CheckCircle2, XCircle, SlidersHorizontal, Clock,
    Image as ImageIcon, AlertTriangle, RefreshCw,
    Flame, Target, Activity, EyeOff, Eye, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { workspaceService } from '../../services/workspaceService';

export default function ReviewDietLogPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [sosTickets, setSosTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sosLoading, setSosLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [resolvingId, setResolvingId] = useState(null);
    const [resolveNotes, setResolveNotes] = useState({});

    const [adjustingLog, setAdjustingLog] = useState(null);
    const [adjustForm, setAdjustForm] = useState({
        adjustedCalories: 0, adjustedProtein: 0, adjustedCarb: 0, adjustedFat: 0, note: '', correctionReason: 'OTHER',
    });

    const [rejectReasons, setRejectReasons] = useState({});

    const [blindMode, setBlindMode] = useState({});
    const [blindRevealed, setBlindRevealed] = useState({});
    const [blindForms, setBlindForms] = useState({});
    const [ptRblStats, setPtRblStats] = useState(null);

    const CORRECTION_REASONS = [
        { id: 'WRONG_FOOD', label: 'Sai món ăn' },
        { id: 'WRONG_PORTION', label: 'Sai định lượng/khẩu phần' },
        { id: 'WRONG_MACROS', label: 'Sai chỉ số Macros' },
        { id: 'UNCLEAR_IMAGE', label: 'Ảnh không rõ nét' },
        { id: 'RESTAURANT_TOO_COMPLEX', label: 'Món ăn quá phức tạp' },
        { id: 'DB_MATCH_INCORRECT', label: 'Cơ sở dữ liệu ghép sai' },
        { id: 'OTHER', label: 'Lý do khác' },
    ];

    const MacroCol = ({ label, macros, color }) => (
        <div className={`p-4 rounded-2xl border ${color} flex flex-col justify-between h-full`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70 truncate">{label}</p>
            <div className="flex items-end gap-1 mb-2">
                <Flame className="w-5 h-5 opacity-70 mb-0.5" />
                <span className="text-xl font-black leading-none">{macros?.calories || 0}</span>
                <span className="text-xs font-bold opacity-60 mb-0.5">kcal</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold opacity-80 bg-white/40 px-2 py-1.5 rounded-lg">
                <span>P: {macros?.protein || 0}</span>
                <span>C: {macros?.carbs || macros?.carb || 0}</span>
                <span>F: {macros?.fat || 0}</span>
            </div>
        </div>
    );

    const getBlindForm = (logId) => blindForms[logId] || { calories: '', protein: '', carb: '', fat: '' };
    const setBlindField = (logId, key, value) => {
        setBlindForms((prev) => ({ ...prev, [logId]: { ...getBlindForm(logId), [key]: value } }));
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'HV';

    const fetchPendingLogs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await workspaceService.getPendingLogs({ size: 20 });
            setLogs(response.data.data.content || []);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách bữa ăn');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSosTickets = useCallback(async () => {
        try {
            setSosLoading(true);
            const response = await workspaceService.getSosTickets();
            setSosTickets(response.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSosLoading(false);
        }
    }, []);

    const fetchPtRblStats = useCallback(async () => {
        try {
            const res = await workspaceService.getPtRblStats();
            setPtRblStats(res.data.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            await Promise.all([
                fetchPendingLogs(),
                fetchSosTickets(),
                fetchPtRblStats()
            ]);
        };

        if (isMounted) loadInitialData();

        const handleRealtimeUpdate = (e) => {
            console.log("Lệnh Reload đã được gọi từ WebSocket (Phía PT)!", e.type);

            setTimeout(() => {
                if (isMounted) {
                    fetchPendingLogs();
                    fetchSosTickets();
                    fetchPtRblStats();
                }
            }, 500);
        };

        window.addEventListener('realtime_update', handleRealtimeUpdate);
        window.addEventListener('NEW_DIET_LOG', handleRealtimeUpdate);
        window.addEventListener('SOS', handleRealtimeUpdate);

        return () => {
            isMounted = false;
            window.removeEventListener('realtime_update', handleRealtimeUpdate);
            window.removeEventListener('NEW_DIET_LOG', handleRealtimeUpdate);
            window.removeEventListener('SOS', handleRealtimeUpdate);
        };
    }, [fetchPendingLogs, fetchSosTickets, fetchPtRblStats]);

    const handleResolveSos = async (ticketId) => {
        try {
            setResolvingId(ticketId);
            await workspaceService.resolveSosTicket(ticketId, { resolutionNote: resolveNotes[ticketId] || '' });
            toast.success('Đã giải quyết yêu cầu SOS');
            setResolveNotes((prev) => ({ ...prev, [ticketId]: '' }));
            fetchSosTickets();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi giải quyết SOS');
        } finally {
            setResolvingId(null);
        }
    };

    const handleReview = async (logId, action, extra = {}) => {
        try {
            setActionLoading(logId);
            await workspaceService.reviewLog(logId, { action, ...extra });
            toast.success(
                action === 'APPROVE' ? 'Đã phê duyệt bữa ăn!' :
                    action === 'REJECT' ? 'Đã từ chối bữa ăn.' :
                        'Đã điều chỉnh chỉ số thành công!'
            );
            fetchPendingLogs();
            fetchPtRblStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi thao tác');
        } finally {
            setActionLoading(null);
            setAdjustingLog(null);
        }
    };

    const openAdjust = (log) => {
        setAdjustingLog(log.id);
        const macros = log.macrosJson || {};
        setAdjustForm({
            adjustedCalories: macros.calories || 0,
            adjustedProtein: macros.protein || 0,
            adjustedCarb: macros.carbs || macros.carb || 0,
            adjustedFat: macros.fat || 0,
            note: '',
            correctionReason: 'OTHER',
        });
    };

    const handleAdjustSubmit = (logId) => {
        handleReview(logId, 'ADJUST_MACROS', {
            adjustedCalories: parseFloat(adjustForm.adjustedCalories) || 0,
            adjustedProtein: parseFloat(adjustForm.adjustedProtein) || 0,
            adjustedCarb: parseFloat(adjustForm.adjustedCarb) || 0,
            adjustedFat: parseFloat(adjustForm.adjustedFat) || 0,
            note: adjustForm.note,
            correctionReason: adjustForm.correctionReason,
        });
    };

    const handleBlindSubmit = async (logId) => {
        const form = getBlindForm(logId);
        try {
            await workspaceService.submitBlindEstimate(logId, {
                calories: parseFloat(form.calories) || 0,
                protein: parseFloat(form.protein) || 0,
                carb: parseFloat(form.carb) || 0,
                fat: parseFloat(form.fat) || 0,
            });
            setBlindRevealed((prev) => ({ ...prev, [logId]: true }));
            toast.success('Đã lưu Dự đoán Ẩn — AI/DB đã được mở khóa!');
            fetchPendingLogs();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi lưu dự đoán');
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in mt-6 px-4">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Duyệt Bữa Ăn</h1>
                    <p className="text-slate-500 mt-1 font-medium">Bạn có <strong className="text-blue-600">{logs.length}</strong> bữa ăn đang chờ kiểm tra và phê duyệt.</p>
                </div>
                <Button onClick={fetchPendingLogs} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl font-bold h-11">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Làm mới dữ liệu
                </Button>
            </div>

            {/* THỐNG KÊ RBL CỦA PT */}
            {ptRblStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-3xl shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Đã duyệt (30d)</p>
                        <p className="text-3xl font-black text-indigo-900">{ptRblStats.totalReviewed}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 rounded-3xl shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Gán nhãn CV</p>
                        <p className="text-3xl font-black text-emerald-900">{ptRblStats.totalLabeledCv}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100/50 rounded-3xl shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Sai số AI (MAE)</p>
                        <p className="text-3xl font-black text-purple-900">{ptRblStats.maeAiCalories ?? '—'} <span className="text-sm font-bold opacity-50">kcal</span></p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 rounded-3xl shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5"/> Tỷ lệ sửa</p>
                        <p className="text-3xl font-black text-amber-900">{ptRblStats.adjustRate != null ? `${Math.round(ptRblStats.adjustRate * 100)}%` : '—'}</p>
                    </div>
                </div>
            )}

            {/* KHU VỰC SOS TICKETS */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5 border-b border-red-200/50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-red-900 tracking-tight">Yêu cầu Khẩn cấp (SOS)</h2>
                            <p className="text-sm font-medium text-red-700/80">Học viên cần bạn hỗ trợ định lượng ngay lập tức.</p>
                        </div>
                    </div>
                    <Button onClick={fetchSosTickets} variant="outline" size="sm" className="bg-white border-red-200 text-red-700 hover:bg-red-50 rounded-xl font-bold">
                        <RefreshCw className={`w-4 h-4 mr-2 ${sosLoading ? 'animate-spin' : ''}`} /> Tải lại SOS
                    </Button>
                </div>

                {sosLoading ? (
                    <Skeleton className="h-24 w-full rounded-2xl bg-red-100/50" />
                ) : sosTickets.filter(t => t.status !== 'RESOLVED').length === 0 ? (
                    <div className="text-center py-6">
                        <CheckCircle2 className="w-8 h-8 text-red-300 mx-auto mb-2" />
                        <p className="text-sm text-red-700/70 font-bold">Hiện không có yêu cầu SOS nào.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {sosTickets.filter(t => t.status !== 'RESOLVED').map(ticket => {
                            const linkedLog = logs.find((l) => l.id === ticket.dietLogId);
                            return (
                            <div key={ticket.id} className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start gap-3 mb-4">
                                    <div>
                                        <p className="font-extrabold text-slate-800 text-lg">{ticket.customerName || 'Học viên'}</p>
                                        <span className="inline-block mt-1.5 text-[10px] font-black px-2.5 py-1 rounded-md bg-red-100 text-red-700 uppercase tracking-widest">
                                            {ticket.status === 'RESOLVED' ? 'ĐÃ GIẢI QUYẾT' : 'ĐANG CHỜ'}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={() => handleResolveSos(ticket.id)}
                                        disabled={resolvingId === ticket.id}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-bold shadow-sm shadow-emerald-500/20"
                                    >
                                        Đã giải quyết
                                    </Button>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                                    <p className="text-sm font-medium text-slate-700 italic">"{ticket.note}"</p>
                                </div>
                                {linkedLog && (
                                    <div className="mb-3 p-3 rounded-xl border border-blue-100 bg-blue-50/50 text-xs text-slate-700">
                                        <p className="font-bold text-blue-800 mb-1">Nhật ký liên quan</p>
                                        <p>{linkedLog.foodDescription || 'Bữa ăn'} · {linkedLog.mealType} · {linkedLog.logDate}</p>
                                        <p className="mt-1">~{linkedLog.macrosJson?.calories || linkedLog.aiPredictedMacros?.calories || 0} kcal</p>
                                    </div>
                                )}
                                {ticket.dietLogId && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mb-3 w-full rounded-xl text-xs"
                                        onClick={() => navigate(`/pt/chat?contextLogId=${ticket.dietLogId}`, {
                                            state: { targetClientId: linkedLog?.customerId },
                                        })}
                                    >
                                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Hỏi qua chat
                                    </Button>
                                )}
                                <input
                                    type="text"
                                    placeholder="Nhập ghi chú phản hồi cho học viên..."
                                    value={resolveNotes[ticket.id] || ''}
                                    onChange={(e) => setResolveNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:bg-white transition-colors"
                                />
                            </div>
                        );})}
                    </div>
                )}
            </div>

            {/* DANH SÁCH BỮA ĂN CHỜ DUYỆT */}
            {loading ? (
                <div className="space-y-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl bg-slate-200" />)}
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                    <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-5" />
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Tuyệt vời! Đã hoàn thành.</h3>
                    <p className="text-slate-500 mt-2 font-medium text-lg">Tất cả bữa ăn của học viên đã được bạn phê duyệt.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {logs.map((log) => (
                        <Card key={log.id} className="bg-white border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 rounded-3xl group">
                            <div className="flex flex-col md:flex-row">

                                {/* Cột Ảnh */}
                                <div className="md:w-80 h-64 md:h-auto bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-b md:border-b-0 md:border-r border-slate-200 relative overflow-hidden">
                                    {log.imageUrl ? (
                                        <img src={log.imageUrl} alt="Meal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
                                            <span className="text-sm font-bold opacity-60">Không có ảnh đính kèm</span>
                                        </>
                                    )}

                                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                                        <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm border border-slate-200/50">
                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Chờ duyệt</span>
                                        </div>
                                        {log.sosTicketFlag && (
                                            <div className="bg-red-500/95 backdrop-blur px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md border border-red-400">
                                                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">CẦN HỖ TRỢ SOS</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Cột Thông tin & Hành động */}
                                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-white">
                                    <div>
                                        {/* Tiêu đề thẻ */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black text-lg border border-blue-200/50 shadow-sm">
                                                    {getInitials(log.customerName || 'HV')}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{log.customerName}</h3>
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                        {log.mealType} • {log.logDate ? new Date(log.logDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
                                                        {log.mealSource && ` • ${log.mealSource === 'HOME_COOKED' ? 'Tự nấu' : 'Ăn ngoài'}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tên món & Chế độ Blind */}
                                        <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex flex-wrap items-center gap-3 mb-4 border-b border-slate-200/60 pb-4">
                                                <p className="text-slate-800 font-black text-xl capitalize flex-1 truncate">{log.foodDescription || 'Bữa ăn không có mô tả'}</p>

                                                {/* Nút bật/tắt Blind Mode */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setBlindMode((p) => ({ ...p, [log.id]: !p[log.id] }))}
                                                    className={`h-9 rounded-xl font-bold border transition-colors ${blindMode[log.id] ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                                >
                                                    {blindMode[log.id] ? <><Eye className="w-4 h-4 mr-1.5"/> Tắt Blind Mode</> : <><EyeOff className="w-4 h-4 mr-1.5"/> Bật Blind Mode</>}
                                                </Button>
                                            </div>

                                            {(!blindMode[log.id] || blindRevealed[log.id] || log.blindSubmitted) && (log.restaurantName || log.aiConfidenceScore != null) && (
                                                <p className="text-sm font-semibold text-slate-500 mb-4 flex items-center gap-3">
                                                    {log.restaurantName && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {log.restaurantName}</span>}
                                                    {log.aiConfidenceScore != null && (
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> AI tự tin: {Math.round(log.aiConfidenceScore * 100)}%</span>
                                                    )}
                                                </p>
                                            )}

                                            {/* Logic hiển thị RBL hoặc Lưới Macros */}
                                            {blindMode[log.id] && !blindRevealed[log.id] && !log.blindSubmitted ? (
                                                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl animate-fade-in shadow-sm">
                                                    <p className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2"><EyeOff className="w-4 h-4" /> Hãy dự đoán Macros mà không nhìn kết quả của AI.</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                        {['calories', 'protein', 'carb', 'fat'].map((k) => (
                                                            <div key={k}>
                                                                <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-1">{k}</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={getBlindForm(log.id)[k]}
                                                                    onChange={(e) => setBlindField(log.id, k, e.target.value)}
                                                                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <Button onClick={() => handleBlindSubmit(log.id)} className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 font-bold shadow-md shadow-amber-500/20">
                                                        Lưu dự đoán & Xem kết quả AI
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                                                        <MacroCol label="AI Dự đoán" macros={log.aiPredictedMacros} color="bg-purple-50/50 border-purple-100 text-purple-900" />
                                                        <MacroCol label="Database / Hybrid" macros={log.dbMatchedMacros} color="bg-emerald-50/50 border-emerald-100 text-emerald-900" />
                                                        <MacroCol label="Học viên đang thấy" macros={log.macrosJson} color="bg-white border-slate-200 text-slate-800 shadow-sm" />
                                                    </div>
                                                    {(log.modelVersion || log.matchedFoodName) && (
                                                        <p className="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-2">
                                                            {log.modelVersion && <span>Model: {log.modelVersion}</span>}
                                                            {log.matchedFoodName && <span>• DB Match: {log.matchedFoodName} (Score: {log.dbMatchScore ?? 'N/A'})</span>}
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* FORM ĐIỀU CHỈNH MACROS */}
                                        {adjustingLog === log.id && (
                                            <div className="mt-4 p-6 bg-blue-50 border border-blue-100 rounded-2xl animate-fade-in shadow-inner">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                                                    <h4 className="text-base font-black text-blue-900">Điều chỉnh Chỉ số Bữa ăn</h4>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Calo (kcal)</label>
                                                        <input type="number" value={adjustForm.adjustedCalories} onChange={(e) => setAdjustForm({...adjustForm, adjustedCalories: e.target.value})} className="w-full mt-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Protein (g)</label>
                                                        <input type="number" value={adjustForm.adjustedProtein} onChange={(e) => setAdjustForm({...adjustForm, adjustedProtein: e.target.value})} className="w-full mt-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Carb (g)</label>
                                                        <input type="number" value={adjustForm.adjustedCarb} onChange={(e) => setAdjustForm({...adjustForm, adjustedCarb: e.target.value})} className="w-full mt-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Fat (g)</label>
                                                        <input type="number" value={adjustForm.adjustedFat} onChange={(e) => setAdjustForm({...adjustForm, adjustedFat: e.target.value})} className="w-full mt-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                                    </div>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4 mb-5">
                                                    <div>
                                                        <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Lý do điều chỉnh</label>
                                                        <div className="relative">
                                                            <select value={adjustForm.correctionReason} onChange={(e) => setAdjustForm({...adjustForm, correctionReason: e.target.value})} className="w-full mt-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none">
                                                                {CORRECTION_REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Lời khuyên cho Học viên</label>
                                                        <input type="text" placeholder="Nhập lời khuyên hoặc giải thích..." value={adjustForm.note} onChange={(e) => setAdjustForm({...adjustForm, note: e.target.value})} className="w-full mt-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button onClick={() => handleAdjustSubmit(log.id)} disabled={actionLoading === log.id} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-bold shadow-md shadow-blue-500/20">
                                                        <CheckCircle2 className="w-4 h-4 mr-2"/> Xác nhận Điều chỉnh
                                                    </Button>
                                                    <Button onClick={() => setAdjustingLog(null)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100 bg-white rounded-xl h-11 px-6 font-bold">
                                                        Hủy bỏ
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* THANH HÀNH ĐỘNG CHÍNH */}
                                    {!adjustingLog && (
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">

                                            <Button
                                                variant="outline"
                                                onClick={() => navigate(`/pt/chat?contextLogId=${log.id}`, {
                                                    state: { targetClientId: log.customerId },
                                                })}
                                                className="w-full sm:w-auto text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl h-11 px-4 font-bold"
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" /> Hỏi qua chat
                                            </Button>

                                            <div className="flex w-full sm:w-auto items-center gap-2">
                                                <select
                                                    className="w-full sm:w-48 text-sm font-bold border border-slate-200 rounded-xl px-3 h-11 bg-slate-50 focus:bg-white outline-none focus:border-red-400"
                                                    value={rejectReasons[log.id] || 'OTHER'}
                                                    onChange={(e) => setRejectReasons(prev => ({...prev, [log.id]: e.target.value}))}
                                                >
                                                    {CORRECTION_REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                                </select>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleReview(log.id, 'REJECT', { correctionReason: rejectReasons[log.id] || 'OTHER' })}
                                                    disabled={actionLoading === log.id}
                                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-white rounded-xl h-11 px-4 font-bold transition-all"
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" /> Từ chối
                                                </Button>
                                            </div>

                                            <Button
                                                variant="outline"
                                                onClick={() => openAdjust(log)}
                                                disabled={actionLoading === log.id}
                                                className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 bg-white rounded-xl h-11 px-4 font-bold transition-all"
                                            >
                                                <SlidersHorizontal className="w-4 h-4 mr-2" /> Điều chỉnh
                                            </Button>

                                            <Button
                                                onClick={() => handleReview(log.id, 'APPROVE')}
                                                disabled={actionLoading === log.id}
                                                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11 px-8 font-black shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
                                            >
                                                <CheckCircle2 className="w-5 h-5 mr-2" /> Phê duyệt
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}