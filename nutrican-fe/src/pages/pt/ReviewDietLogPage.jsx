import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
    CheckCircle2, XCircle, SlidersHorizontal, Clock,
    Image as ImageIcon, RefreshCw,
    Flame, Target, Activity, EyeOff, Eye, MessageSquare,
    Star, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { workspaceService } from '../../services/workspaceService';
import { dietService } from '../../services/dietService';
import Modal from '../../components/common/Modal';
import ImageLightbox from '../../components/common/ImageLightbox';

const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    return `${minioUrl}/${url}`;
};

const getImageKey = (url) => {
    if (!url) return '';
    const unsignedUrl = url.split(/[?#]/)[0];
    try {
        return decodeURIComponent(new URL(unsignedUrl, window.location.origin).pathname).replace(/\/+$/, '');
    } catch {
        return unsignedUrl.replace(/\/+$/, '');
    }
};

const getReviewImages = (log) => {
    const legacyImage = log.imageUrl
        ? { id: null, url: getFullImageUrl(log.imageUrl), isPrimary: false }
        : null;
    const storedImages = (log.additionalImages || [])
        .map((image) => ({
            id: image.id,
            url: getFullImageUrl(image.imageUrl),
            isPrimary: Boolean(image.isPrimary),
        }))
        .filter((image) => image.url);
    const declaredPrimary = storedImages.find((image) => image.isPrimary) || legacyImage || storedImages[0];
    const primaryKey = getImageKey(declaredPrimary?.url);
    const seen = new Set();

    return [declaredPrimary, legacyImage, ...storedImages]
        .filter((image) => image?.url)
        .filter((image) => {
            const key = getImageKey(image.url);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map((image) => ({
            ...image,
            isPrimary: getImageKey(image.url) === primaryKey,
        }));
};

const getReviewImageUrl = (log) => {
    return getReviewImages(log)[0]?.url || null;
};

export default function ReviewDietLogPage({ clientPage = false }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedClientId = searchParams.get('clientId');
    const selectedClientName = searchParams.get('clientName');
    const selectedLogId = searchParams.get('logId');
    const [pendingLogs, setPendingLogs] = useState([]);
    const [reviewedLogs, setReviewedLogs] = useState([]);
    const [activeList, setActiveList] = useState('PENDING');
    const [loading, setLoading] = useState(true);
    const [reviewedLoading, setReviewedLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const [adjustingLog, setAdjustingLog] = useState(null);
    const [adjustForm, setAdjustForm] = useState({
        adjustedCalories: 0, adjustedProtein: 0, adjustedCarb: 0, adjustedFat: 0, note: '', correctionReason: 'OTHER',
    });

    const [rejectModalLog, setRejectModalLog] = useState(null);
    const [rejectReason, setRejectReason] = useState('WRONG_FOOD');

    const [blindMode, setBlindMode] = useState({});
    const [blindRevealed, setBlindRevealed] = useState({});
    const [blindForms, setBlindForms] = useState({});
    const [ptRblStats, setPtRblStats] = useState(null);
    const [pendingHiresCount, setPendingHiresCount] = useState(0);
    const [previewImage, setPreviewImage] = useState({});
    const [lightboxImage, setLightboxImage] = useState('');
    const isReviewedList = clientPage && activeList === 'APPROVED';
    const logs = isReviewedList ? reviewedLogs : pendingLogs;
    const listLoading = isReviewedList ? reviewedLoading : loading;

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
            if (clientPage && !selectedClientId) {
                setPendingLogs([]);
                return;
            }
            const response = clientPage
                ? await dietService.getClientLogsForPt(selectedClientId, {
                    size: 50,
                    reviewStatus: 'PENDING',
                })
                : await workspaceService.getPendingLogs({
                    size: 20,
                    clientId: selectedClientId || undefined,
                });
            setPendingLogs(response.data.data.content || []);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách bữa ăn');
        } finally {
            setLoading(false);
        }
    }, [clientPage, selectedClientId]);

    const fetchReviewedLogs = useCallback(async () => {
        if (!clientPage || !selectedClientId) {
            setReviewedLogs([]);
            return;
        }

        try {
            setReviewedLoading(true);
            const response = await dietService.getClientLogsForPt(selectedClientId, {
                size: 50,
                reviewStatus: 'APPROVED',
            });
            const content = response.data.data.content || [];
            setReviewedLogs(content);
            if (selectedLogId && content.some((log) => log.id === selectedLogId)) {
                setActiveList('APPROVED');
            }
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải lịch sử bữa ăn đã duyệt');
        } finally {
            setReviewedLoading(false);
        }
    }, [clientPage, selectedClientId, selectedLogId]);

    const fetchPtRblStats = useCallback(async () => {
        try {
            const res = await workspaceService.getPtRblStats();
            setPtRblStats(res.data.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchPendingClientsCount = useCallback(async () => {
        try {
            const res = await workspaceService.getClients({ page: 0, size: 10, status: 'PENDING' }).catch(() => ({ data: { data: { totalElements: 0 } } }));
            setPendingHiresCount(res.data.data.totalElements || res.data.data.content?.length || 0);
        } catch {
            setPendingHiresCount(0);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            if (clientPage) {
                await Promise.all([fetchPendingLogs(), fetchReviewedLogs()]);
                return;
            }
            await Promise.all([fetchPendingLogs(), fetchPtRblStats(), fetchPendingClientsCount()]);
        };

        if (isMounted) loadInitialData();

        const handleRealtimeUpdate = (e) => {
            console.log("Lệnh Reload đã được gọi từ WebSocket (Phía PT)!", e.type);

            setTimeout(() => {
                if (isMounted) {
                    fetchPendingLogs();
                    if (clientPage) {
                        fetchReviewedLogs();
                    } else {
                        fetchPtRblStats();
                        fetchPendingClientsCount();
                    }
                }
            }, 500);
        };

        window.addEventListener('realtime_update', handleRealtimeUpdate);
        window.addEventListener('NEW_DIET_LOG', handleRealtimeUpdate);

        return () => {
            isMounted = false;
            window.removeEventListener('realtime_update', handleRealtimeUpdate);
            window.removeEventListener('NEW_DIET_LOG', handleRealtimeUpdate);
        };
    }, [clientPage, fetchPendingLogs, fetchReviewedLogs, fetchPtRblStats, fetchPendingClientsCount]);

    useEffect(() => {
        if (!selectedLogId || listLoading) return undefined;
        const frameId = requestAnimationFrame(() => {
            document.getElementById(`review-log-${selectedLogId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        });
        return () => cancelAnimationFrame(frameId);
    }, [listLoading, logs, selectedLogId]);

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
            if (clientPage) {
                fetchReviewedLogs();
            } else {
                fetchPtRblStats();
            }
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

    const handleAdjustOrApproveSubmit = (log) => {
        const originalMacros = log.macrosJson || {};
        const isUnchanged =
            (parseFloat(adjustForm.adjustedCalories) || 0) === (originalMacros.calories || 0) &&
            (parseFloat(adjustForm.adjustedProtein) || 0) === (originalMacros.protein || 0) &&
            (parseFloat(adjustForm.adjustedCarb) || 0) === (originalMacros.carbs || originalMacros.carb || 0) &&
            (parseFloat(adjustForm.adjustedFat) || 0) === (originalMacros.fat || 0);

        if (isUnchanged) {
            handleReview(log.id, 'APPROVE');
        } else {
            handleReview(log.id, 'ADJUST_MACROS', {
                adjustedCalories: parseFloat(adjustForm.adjustedCalories) || 0,
                adjustedProtein: parseFloat(adjustForm.adjustedProtein) || 0,
                adjustedCarb: parseFloat(adjustForm.adjustedCarb) || 0,
                adjustedFat: parseFloat(adjustForm.adjustedFat) || 0,
                note: adjustForm.note,
                correctionReason: adjustForm.correctionReason,
            });
        }
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
            {!clientPage && pendingHiresCount > 0 && (
                <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-extrabold text-blue-900">Yêu cầu thuê PT mới đang chờ duyệt ({pendingHiresCount})</p>
                            <p className="text-sm text-blue-700/80 mt-0.5">Bạn đang có yêu cầu kết nối học viên mới cần phản hồi.</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => navigate('/pt/clients')}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-bold shadow-md shadow-blue-500/20 shrink-0"
                    >
                        Duyệt học viên
                    </Button>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {clientPage
                            ? `Nhật ký bữa ăn · ${selectedClientName || logs[0]?.customerName || 'Học viên'}`
                            : selectedClientId
                                ? `Duyệt bữa ăn · ${selectedClientName || logs[0]?.customerName || 'Học viên'}`
                                : 'Duyệt Bữa Ăn'}
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        {clientPage ? (
                            <>Theo dõi bữa ăn cần xử lý và lịch sử đã duyệt của học viên tại một nơi.</>
                        ) : (
                            <>
                                Hộp thư chung — chỉ log học viên ACTIVE của bạn.
                                {selectedClientId ? ' Đang lọc theo học viên này.' : ''}{' '}
                                <strong className="text-blue-600">{pendingLogs.length}</strong> bữa đang chờ.
                            </>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(clientPage || selectedClientId) && (
                        <Button onClick={() => navigate(clientPage ? '/pt/clients' : '/pt/reviews')} variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm rounded-xl font-bold h-11">
                            <ArrowLeft className="w-4 h-4 mr-2" /> {clientPage ? 'Danh sách học viên' : 'Xem tất cả'}
                        </Button>
                    )}
                    {!clientPage && selectedClientId && (
                        <Button
                            onClick={() => {
                                const params = new URLSearchParams({ clientId: selectedClientId });
                                if (selectedClientName) params.set('clientName', selectedClientName);
                                navigate(`/pt/clients/dietlog?${params.toString()}`);
                            }}
                            variant="outline"
                            className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-sm rounded-xl font-bold h-11"
                        >
                            Mở theo học viên
                        </Button>
                    )}
                    <Button
                        onClick={() => clientPage
                            ? Promise.all([fetchPendingLogs(), fetchReviewedLogs()])
                            : fetchPendingLogs()}
                        variant="outline"
                        className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl font-bold h-11"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${(loading || reviewedLoading) ? 'animate-spin' : ''}`} /> Làm mới dữ liệu
                    </Button>
                </div>
            </div>

            {!clientPage && !selectedClientId && logs.length === 0 && !listLoading && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                    Không có bữa ăn chờ duyệt. Vào từng học viên để xem lịch sử đã duyệt.
                </div>
            )}

            {clientPage && !selectedClientId && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-800 font-medium">
                    Thiếu clientId — mở lại từ danh sách học viên hoặc chat.
                </div>
            )}

            {clientPage && selectedClientId && (
                <div className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-2" role="tablist" aria-label="Trạng thái bữa ăn">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeList === 'PENDING'}
                        onClick={() => setActiveList('PENDING')}
                        className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all ${activeList === 'PENDING'
                            ? 'bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-200'
                            : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${activeList === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Clock className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-extrabold">Chờ duyệt</span>
                            <span className="mt-0.5 block text-xs font-medium opacity-70">Các bữa ăn cần PT kiểm tra</span>
                        </span>
                        <span className={`rounded-full px-3 py-1 text-sm font-black ${activeList === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {pendingLogs.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeList === 'APPROVED'}
                        onClick={() => setActiveList('APPROVED')}
                        className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all ${activeList === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-200'
                            : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${activeList === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            <CheckCircle2 className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-extrabold">Đã duyệt</span>
                            <span className="mt-0.5 block text-xs font-medium opacity-70">Lịch sử bữa ăn đã hoàn tất</span>
                        </span>
                        <span className={`rounded-full px-3 py-1 text-sm font-black ${activeList === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {reviewedLogs.length}
                        </span>
                    </button>
                </div>
            )}


            {!clientPage && ptRblStats && (
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


            {listLoading ? (
                <div className="space-y-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl bg-slate-200" />)}
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                    {isReviewedList
                        ? <Clock className="w-20 h-20 text-slate-300 mx-auto mb-5" />
                        : <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-5" />}
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                        {isReviewedList
                            ? 'Chưa có bữa ăn đã duyệt'
                            : selectedClientId ? 'Không có bữa ăn chờ duyệt' : 'Tuyệt vời! Đã hoàn thành.'}
                    </h3>
                    <p className="text-slate-500 mt-2 font-medium text-lg">
                        {isReviewedList
                            ? 'Các bữa ăn sau khi được PT phê duyệt sẽ xuất hiện tại đây.'
                            : selectedClientId
                            ? `${selectedClientName || 'Học viên này'} hiện không có bữa ăn nào cần bạn kiểm tra.`
                            : 'Tất cả bữa ăn của học viên đã được bạn phê duyệt.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {logs.map((log) => {
                        const reviewImage = previewImage[log.id] || getReviewImageUrl(log);

                        return (
                        <Card
                            key={log.id}
                            id={`review-log-${log.id}`}
                            className={`bg-white shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 rounded-3xl group ${selectedLogId === log.id
                                ? 'border-blue-400 ring-4 ring-blue-500/10'
                                : isReviewedList ? 'border-emerald-200' : 'border-slate-200'}`}
                        >
                            <div className="flex flex-col md:flex-row">


                                {reviewImage && (
                                    <div className="md:w-80 h-64 md:h-auto bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-b md:border-b-0 md:border-r border-slate-200 relative overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setLightboxImage(reviewImage)}
                                            className="h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-inset"
                                            aria-label="Xem ảnh bữa ăn rõ hơn"
                                        >
                                            <img
                                                src={reviewImage}
                                                alt="Bữa ăn"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </button>

                                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                                            <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm border border-slate-200/50">
                                                {isReviewedList
                                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                    : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isReviewedList ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    {isReviewedList ? 'Đã duyệt' : 'Chờ duyệt'}
                                                </span>
                                            </div>
                                            {log.lateTickReason && (
                                                <div className="bg-orange-50/95 backdrop-blur px-3 py-1.5 rounded-xl shadow-sm border border-orange-200 max-w-[14rem]">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-800">Tick trễ</span>
                                                    <p className="text-[10px] text-orange-900/80 line-clamp-2 mt-0.5">{log.lateTickReason}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}


                                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-white">
                                    <div>

                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
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
                                            {!reviewImage && (
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border ${isReviewedList ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                                        {isReviewedList
                                                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                            : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isReviewedList ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                            {isReviewedList ? 'Đã duyệt' : 'Chờ duyệt'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isReviewedList && (
                                            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-extrabold text-emerald-900">
                                                            {log.ptAction === 'ADJUST' ? 'Đã điều chỉnh và phê duyệt' : 'PT đã phê duyệt'}
                                                        </p>
                                                        {log.ptNote && <p className="mt-0.5 text-xs font-medium text-emerald-800/75">“{log.ptNote}”</p>}
                                                    </div>
                                                </div>
                                                {log.ptReviewedAt && (
                                                    <time className="text-xs font-bold text-emerald-700/70" dateTime={log.ptReviewedAt}>
                                                        {new Date(log.ptReviewedAt).toLocaleString('vi-VN')}
                                                    </time>
                                                )}
                                            </div>
                                        )}

                                        {!reviewImage && (
                                            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
                                                <div className="mt-0.5 rounded-xl bg-white p-2 text-slate-400 shadow-sm ring-1 ring-slate-200">
                                                    <ImageIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">Bữa ăn không có ảnh đính kèm</p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Hãy đối chiếu thông tin dựa trên tên món, khẩu phần và chỉ số dinh dưỡng học viên đã gửi.</p>
                                                </div>
                                            </div>
                                        )}


                                        <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex flex-wrap items-center gap-3 mb-4 border-b border-slate-200/60 pb-4">
                                                <p className="text-slate-800 font-black text-xl capitalize flex-1 truncate">{log.foodDescription || 'Bữa ăn không có mô tả'}</p>


                                                {!isReviewedList && <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setBlindMode((p) => ({ ...p, [log.id]: !p[log.id] }))}
                                                    className={`h-9 rounded-xl font-bold border transition-colors ${blindMode[log.id] ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                                >
                                                    {blindMode[log.id] ? <><Eye className="w-4 h-4 mr-1.5"/> Tắt Blind Mode</> : <><EyeOff className="w-4 h-4 mr-1.5"/> Bật Blind Mode</>}
                                                </Button>}
                                            </div>

                                            {(!blindMode[log.id] || blindRevealed[log.id] || log.blindSubmitted) && (log.restaurantName || log.aiConfidenceScore != null) && (
                                                <p className="text-sm font-semibold text-slate-500 mb-4 flex items-center gap-3">
                                                    {log.restaurantName && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {log.restaurantName}</span>}
                                                    {log.aiConfidenceScore != null && (
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> AI tự tin: {Math.round(log.aiConfidenceScore * 100)}%</span>
                                                    )}
                                                </p>
                                            )}


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
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                                                        <MacroCol label="AI Dự đoán" macros={log.aiPredictedMacros} color="bg-purple-50/50 border-purple-100 text-purple-900" />
                                                        <MacroCol label={isReviewedList ? 'Kết quả đã duyệt' : 'Học viên đang thấy'} macros={log.macrosJson} color={isReviewedList ? 'bg-emerald-50/60 border-emerald-100 text-emerald-950 shadow-sm' : 'bg-white border-slate-200 text-slate-800 shadow-sm'} />
                                                    </div>
                                                    {(log.modelVersion || log.matchedFoodName) && (
                                                        <p className="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-2">
                                                            {log.modelVersion && <span>Model: {log.modelVersion}</span>}
                                                            {log.matchedFoodName && <span>• DB Match: {log.matchedFoodName} (Score: {log.dbMatchScore ?? 'N/A'})</span>}
                                                        </p>
                                                    )}
                                                </>
                                            )}


                                            {(() => {
                                                const allImages = getReviewImages(log);

                                                if (allImages.length <= 1) return null;

                                                return (
                                                    <div className="flex gap-2 mt-4 flex-wrap border-t border-slate-200/60 pt-4 animate-fade-in">
                                                        {allImages.map((img, idx) => (
                                                            <button
                                                                key={img.id || getImageKey(img.url) || idx}
                                                                type="button"
                                                                className="relative cursor-zoom-in border-0 bg-transparent p-0 hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-xl"
                                                                onClick={() => {
                                                                    setPreviewImage((prev) => ({ ...prev, [log.id]: img.url }));
                                                                    setLightboxImage(img.url);
                                                                }}
                                                                aria-label={`Xem ảnh bữa ăn ${idx + 1} rõ hơn`}
                                                            >
                                                                <img
                                                                    src={img.url}
                                                                    alt="Meal thumbnail"
                                                                    className={`w-16 h-16 object-cover rounded-xl border shadow-sm transition-all ${
                                                                        (previewImage[log.id] || getReviewImageUrl(log)) === img.url
                                                                            ? 'border-blue-500 ring-2 ring-blue-500/20 scale-95'
                                                                            : 'border-slate-200 hover:scale-105'
                                                                    }`}
                                                                />
                                                                {img.isPrimary && (
                                                                    <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-900 rounded-full p-0.5 shadow-sm">
                                                                        <Star className="w-2.5 h-2.5 fill-current text-white" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>


                                        {!isReviewedList && adjustingLog === log.id && (
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
                                                {(() => {
                                                    const isUnchanged =
                                                        (parseFloat(adjustForm.adjustedCalories) || 0) === (log.macrosJson?.calories || 0) &&
                                                        (parseFloat(adjustForm.adjustedProtein) || 0) === (log.macrosJson?.protein || 0) &&
                                                        (parseFloat(adjustForm.adjustedCarb) || 0) === (log.macrosJson?.carbs || log.macrosJson?.carb || 0) &&
                                                        (parseFloat(adjustForm.adjustedFat) || 0) === (log.macrosJson?.fat || 0);
                                                    return (
                                                        <>
                                                            <div className="grid md:grid-cols-2 gap-4 mb-5">
                                                                <div>
                                                                    <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest block mb-1">
                                                                        Lý do điều chỉnh {isUnchanged && <span className="text-slate-400 font-normal">(Chỉ cần chọn khi thay đổi chỉ số)</span>}
                                                                    </label>
                                                                    <div className="relative">
                                                                        <select
                                                                            disabled={isUnchanged}
                                                                            value={adjustForm.correctionReason}
                                                                            onChange={(e) => setAdjustForm({...adjustForm, correctionReason: e.target.value})}
                                                                            className="w-full mt-1 px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none disabled:opacity-50 disabled:bg-slate-100"
                                                                        >
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
                                                                <Button
                                                                    onClick={() => handleAdjustOrApproveSubmit(log)}
                                                                    disabled={actionLoading === log.id}
                                                                    className={`rounded-xl h-11 px-6 font-bold shadow-md transition-colors ${
                                                                        isUnchanged
                                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                                                    }`}
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4 mr-2"/>
                                                                    {isUnchanged ? 'Xác nhận Phê duyệt' : 'Xác nhận Điều chỉnh'}
                                                                </Button>
                                                                <Button onClick={() => setAdjustingLog(null)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100 bg-white rounded-xl h-11 px-6 font-bold">
                                                                    Hủy bỏ
                                                                </Button>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>


                                    {!isReviewedList && !adjustingLog && (
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

                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setRejectModalLog(log);
                                                    setRejectReason('WRONG_FOOD');
                                                }}
                                                disabled={actionLoading === log.id}
                                                className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-white rounded-xl h-11 px-4 font-bold transition-all"
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Từ chối
                                            </Button>

                                            <Button
                                                onClick={() => openAdjust(log)}
                                                disabled={actionLoading === log.id}
                                                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11 px-6 font-black shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
                                            >
                                                <SlidersHorizontal className="w-4 h-4 mr-2" /> Phê duyệt Hoặc Điều chỉnh
                                            </Button>
                                        </div>
                                    )}
                                    {isReviewedList && (
                                        <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                                            <Button
                                                variant="outline"
                                                onClick={() => navigate(`/pt/chat?contextLogId=${log.id}`, {
                                                    state: { targetClientId: log.customerId },
                                                })}
                                                className="w-full rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 sm:w-auto"
                                            >
                                                <MessageSquare className="mr-2 h-4 w-4" /> Hỏi về bữa ăn
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={!!rejectModalLog}
                onClose={() => setRejectModalLog(null)}
                title="Từ chối bữa ăn"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Bạn đang từ chối bữa ăn của học viên <strong>{rejectModalLog?.customerName}</strong>. Vui lòng chọn lý do từ chối để thông báo cho học viên:
                    </p>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Lý do từ chối</label>
                        <select
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                        >
                            {CORRECTION_REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setRejectModalLog(null)}
                            className="flex-1 rounded-xl h-11 font-bold"
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={async () => {
                                const logId = rejectModalLog.id;
                                setRejectModalLog(null);
                                await handleReview(logId, 'REJECT', { correctionReason: rejectReason });
                            }}
                            disabled={actionLoading === rejectModalLog?.id}
                            className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-500/20"
                        >
                            Xác nhận Từ chối
                        </Button>
                    </div>
                </div>
            </Modal>

            <ImageLightbox
                isOpen={!!lightboxImage}
                imageUrl={lightboxImage}
                onClose={() => setLightboxImage('')}
            />
        </div>
    );
}
