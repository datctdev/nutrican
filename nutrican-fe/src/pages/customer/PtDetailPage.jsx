// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { coachingPaymentService } from '../../services/coachingPaymentService';
import { Star, CheckCircle2, ArrowLeft, MessageSquare, Briefcase, Clock, Send, Award, Quote, UserCircle, Edit, Trash2, Camera, EyeOff, AlertTriangle, Target, MapPin, Banknote, ShieldCheck, GraduationCap, LinkIcon, Wifi, CreditCard, Wallet } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ImageLightbox from '../../components/common/ImageLightbox';
import Modal from '../../components/common/Modal';
import { formatSessionRange, computePackageTotal } from '../../utils/offlineHireSlots';
import PtWeeklyCalendarPicker from '../../components/pt/PtWeeklyCalendarPicker';

const RATE_UNIT_LABEL = {
    MONTH: 'tháng',
    SESSION_60: 'buổi',
    SESSION_90: 'buổi',
};

function OfflinePackageSummary({ pt, tone = 'emerald' }) {
    if (!pt?.venueName) return null;
    const border = tone === 'amber' ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50';
    const labelColor = tone === 'amber' ? 'text-amber-700' : 'text-emerald-700';
    const sessions = pt.sessions || [];
    return (
        <div className={`rounded-xl border p-3 text-left ${border}`}>
            <p className={`text-xs font-black uppercase tracking-wider ${labelColor}`}>
                Gói offline {pt.sessionCount ? `· ${pt.sessionCount} buổi` : ''}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">{pt.venueName}</p>
            <p className="text-xs text-slate-600">{pt.venueAddress}</p>
            {pt.sessionCount && pt.perSessionAmount && (
                <p className="mt-2 text-xs font-semibold text-slate-700">
                    {pt.sessionCount} buổi × {Number(pt.perSessionAmount).toLocaleString('vi-VN')}đ = {Number(pt.agreedAmount || 0).toLocaleString('vi-VN')}đ
                </p>
            )}
            {sessions.length > 0 ? (
                <ul className="mt-2 space-y-1">
                    {sessions.map((s) => (
                        <li key={s.id || s.sequence} className="text-xs font-semibold text-slate-700">
                            #{s.sequence}: {formatSessionRange(s.startTime, s.endTime)}
                        </li>
                    ))}
                </ul>
            ) : pt.firstSessionStart && (
                <p className="mt-2 text-xs font-semibold text-slate-700">
                    {formatSessionRange(pt.firstSessionStart, pt.firstSessionEnd)}
                </p>
            )}
        </div>
    );
}

const getPermanentUrl = (url) => {
    if (!url) return '';
    return url.split('?')[0];
};

const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return getPermanentUrl(url);
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    return getPermanentUrl(`${minioUrl}/${url}`);
};

const InstagramIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
);

const LinkedinIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect width="4" height="12" x="2" y="9"/>
        <circle cx="4" cy="4" r="2"/>
    </svg>
);

// HẰNG SỐ MAPPING TEXT CHO ĐẸP
const GOAL_LABELS = { 'WEIGHT_LOSS': 'Giảm cân', 'WEIGHT_GAIN': 'Tăng cân', 'MAINTAIN': 'Duy trì', 'PREGNANT': 'Mang thai', 'RECOVERY': 'Phục hồi' };
const DIET_LABELS = { 'NORMAL': 'Ăn thường', 'VEGETARIAN': 'Ăn chay', 'VEGAN': 'Thuần chay', 'KETO': 'Keto', 'EAT_CLEAN': 'Eat clean' };
const RATE_UNIT_LABELS = { 'SESSION_60': 'buổi 60 phút', 'SESSION_90': 'buổi 90 phút', 'HOUR': 'giờ', 'MONTH': 'tháng' };
const TRAINING_MODE_LABELS = { 'OFFLINE': 'Trực tiếp (Offline)', 'ONLINE': 'Online', 'BOTH': 'Cả hai' };

export default function PtDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [pt, setPt] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewData, setReviewData] = useState({ id: null, rating: 5, comment: '', isAnonymous: false });
    const [reviewImage, setReviewImage] = useState(null);
    const [reviewImagePreview, setReviewImagePreview] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [lightboxImage, setLightboxImage] = useState('');

    const [hireStatus, setHireStatus] = useState('NONE');
    const [hiring, setHiring] = useState(false);
    const [paying, setPaying] = useState(false);
    const [payingWithWallet, setPayingWithWallet] = useState(false);
    const [coachingWallet, setCoachingWallet] = useState(null);
    const [showHireModal, setShowHireModal] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null);
    const [selectedVenueId, setSelectedVenueId] = useState(null);
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [calendarData, setCalendarData] = useState(null);
    const [loadingCalendar, setLoadingCalendar] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState(null);

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await marketplaceService.getPtDetail(id);
            const ptData = response.data.data;
            setPt(ptData);

            if (ptData.mappingStatus) {
                setHireStatus(ptData.mappingStatus);
            }

            try {
                const revRes = await marketplaceService.getPtReviews(ptData.userId, { page: 0, size: 10 });
                setReviews(revRes.data.data.content || []);
            } catch (err) {
                console.error('Lỗi khi tải đánh giá:', err);
            }
        } catch (err) {
            toast.error('Không thể tải thông tin PT');
            navigate('/marketplace');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        const refreshHireState = () => fetchAllData();
        window.addEventListener('hire_request_updated', refreshHireState);
        return () => window.removeEventListener('hire_request_updated', refreshHireState);
    }, [fetchAllData]);

    const refreshWallet = useCallback(() => {
        coachingPaymentService.getMyWallet()
            .then((r) => setCoachingWallet(r.data?.data || null))
            .catch(() => setCoachingWallet(null));
    }, []);

    useEffect(() => {
        if (hireStatus === 'AWAITING_PAYMENT') refreshWallet();
    }, [hireStatus, refreshWallet]);

    useEffect(() => {
        const resetPaying = () => setPaying(false);
        const onPageShow = (event) => {
            if (event.persisted) resetPaying();
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') resetPaying();
        };
        window.addEventListener('pageshow', onPageShow);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pageshow', onPageShow);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    const handleReviewImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB');
            return;
        }
        setReviewImage(file);
        setReviewImagePreview(URL.createObjectURL(file));
    };

    const resetReviewForm = () => {
        setShowReviewForm(false);
        setReviewData({ id: null, rating: 5, comment: '', isAnonymous: false });
        setReviewImage(null);
        if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview);
        setReviewImagePreview('');
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        try {
            setSubmittingReview(true);
            if (reviewData.id) {
                await marketplaceService.updateReview(pt.userId, reviewData.id, reviewData, reviewImage);
                toast.success('Cập nhật đánh giá thành công!');
            } else {
                await marketplaceService.createReview(pt.userId, reviewData, reviewImage);
                toast.success('Đã gửi đánh giá thành công!');
            }
            resetReviewForm();
            const revRes = await marketplaceService.getPtReviews(pt.userId, { page: 0, size: 10 });
            setReviews(revRes.data.data.content || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể gửi đánh giá');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleEditClick = (review) => {
        setReviewData({
            id: review.id,
            rating: review.rating,
            comment: review.comment || '',
            isAnonymous: review.isAnonymous || false
        });
        setReviewImage(null);
        setReviewImagePreview(review.imageUrl ? getFullImageUrl(review.imageUrl) : '');
        setShowReviewForm(true);
        setTimeout(() => document.getElementById('review-form-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const promptDeleteReview = (reviewId) => {
        setReviewToDelete(reviewId);
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setTimeout(() => setReviewToDelete(null), 200);
    };

    const confirmDeleteReview = async () => {
        if (!reviewToDelete) return;
        try {
            await marketplaceService.deleteReview(pt.userId, reviewToDelete);
            toast.success("Xóa đánh giá thành công!");
            const revRes = await marketplaceService.getPtReviews(pt.userId, { page: 0, size: 10 });
            setReviews(revRes.data.data.content || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa đánh giá');
        } finally {
            closeDeleteModal();
        }
    };

    const openHireModal = () => {
        if (!user) {
            toast.error('Bạn cần đăng nhập để thuê Huấn luyện viên');
            return;
        }

        const modes = [];
        if ((pt.trainingMode === 'ONLINE' || pt.trainingMode === 'BOTH') && pt.onlineRate) modes.push('ONLINE');
        if ((pt.trainingMode === 'OFFLINE' || pt.trainingMode === 'BOTH') && pt.offlineRate) modes.push('OFFLINE');
        setSelectedMode(modes.length === 1 ? modes[0] : null);
        setSelectedVenueId(null);
        setSelectedSessions([]);
        setCalendarData(null);
        setShowHireModal(true);
    };

    useEffect(() => {
        if (selectedMode !== 'OFFLINE' || !pt?.id || !showHireModal) return;
        let cancelled = false;
        const loadCalendar = async () => {
            setLoadingCalendar(true);
            try {
                const res = await marketplaceService.getPtCalendar(pt.id);
                if (!cancelled) setCalendarData(res.data?.data || null);
            } catch (err) {
                if (!cancelled) {
                    setCalendarData(null);
                    toast.error('Không thể tải lịch PT');
                }
            } finally {
                if (!cancelled) setLoadingCalendar(false);
            }
        };
        loadCalendar();
        return () => { cancelled = true; };
    }, [selectedMode, pt?.id, showHireModal]);

    const offlinePackageTotal = useMemo(() => {
        if (selectedMode !== 'OFFLINE') return 0;
        return computePackageTotal(selectedSessions.length, pt?.offlineRate);
    }, [selectedMode, selectedSessions.length, pt?.offlineRate]);

    const selectedOfflineSummary = useMemo(() => {
        if (selectedMode !== 'OFFLINE') return null;
        const venue = (calendarData?.venues || pt?.venues)?.find((v) => v.id === selectedVenueId);
        if (!venue || selectedSessions.length === 0) return null;
        return { venue, sessionCount: selectedSessions.length, total: offlinePackageTotal };
    }, [selectedMode, selectedVenueId, selectedSessions.length, calendarData?.venues, pt?.venues, offlinePackageTotal]);

    const handleHirePt = async () => {
        if (!selectedMode) {
            toast.error('Vui lòng chọn hình thức coaching');
            return;
        }
        if (selectedMode === 'OFFLINE') {
            if (!selectedVenueId) {
                toast.error('Vui lòng chọn địa điểm tập');
                return;
            }
            if (!selectedSessions.length) {
                toast.error('Vui lòng chọn ít nhất một buổi tập');
                return;
            }
        }
        try {
            setHiring(true);
            const payload = { trainingMode: selectedMode };
            if (selectedMode === 'OFFLINE') {
                payload.venueId = selectedVenueId;
                payload.sessionStarts = selectedSessions;
            }
            const response = await marketplaceService.hirePt(pt.userId, payload);
            const mapping = response.data.data;
            setHireStatus('PENDING');
            setPt((current) => ({
                ...current,
                mappingId: mapping.id,
                mappingStatus: mapping.status,
                selectedTrainingMode: mapping.selectedTrainingMode,
                agreedAmount: mapping.agreedAmount,
                agreedRateUnit: mapping.agreedRateUnit,
                paymentDueAt: mapping.paymentDueAt,
                venueId: mapping.venueId,
                venueName: mapping.venueName,
                venueAddress: mapping.venueAddress,
                venueMapsUrl: mapping.venueMapsUrl,
                firstSessionStart: mapping.firstSessionStart,
                firstSessionEnd: mapping.firstSessionEnd,
                sessionCount: mapping.sessionCount,
                perSessionAmount: mapping.perSessionAmount,
                sessions: mapping.sessions,
            }));
            setShowHireModal(false);
            toast.success('Đã gửi yêu cầu thuê PT!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi thuê PT');
        } finally {
            setHiring(false);
        }
    };

    const handlePayment = async () => {
        if (!pt.mappingId) {
            toast.error('Không tìm thấy yêu cầu coaching');
            return;
        }
        try {
            setPaying(true);
            const response = await coachingPaymentService.createVnPayPayment(pt.mappingId);
            window.location.assign(response.data.data.paymentUrl);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể khởi tạo thanh toán VNPay');
            setPaying(false);
        }
    };

    const handlePayWithWallet = async () => {
        if (!pt.mappingId) {
            toast.error('Không tìm thấy yêu cầu coaching');
            return;
        }
        try {
            setPayingWithWallet(true);
            const res = await coachingPaymentService.payWithWallet(pt.mappingId);
            toast.success(res.data?.message || 'Thanh toán bằng số dư ví thành công');
            await fetchAllData();
            refreshWallet();
            window.dispatchEvent(new Event('hire_request_updated'));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Thanh toán bằng số dư ví thất bại');
        } finally {
            setPayingWithWallet(false);
        }
    };

    const renderStars = (rating, interactive = false) => {
        return (
            <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-6 h-6 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-500 drop-shadow-sm' : 'fill-slate-100 text-slate-200'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                        onClick={() => interactive && setReviewData({ ...reviewData, rating: star })}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 space-y-8 animate-pulse">
                <Skeleton className="h-[350px] w-full rounded-3xl bg-slate-200" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <Skeleton className="lg:col-span-3 h-[400px] rounded-3xl bg-slate-200" />
                    <Skeleton className="lg:col-span-9 h-[800px] rounded-3xl bg-slate-200" />
                </div>
            </div>
        );
    }

    if (!pt) return null;

    const showcase = pt.portfolioShowcase || {};
    const transformations = showcase.transformations || [];
    const coverPhoto = getPermanentUrl(showcase.coverPhotoUrl) || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop";

    const userReview = reviews.find(r => r.reviewerId === user?.id);

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-slate-50 pb-24 animate-fade-in relative">

            {/* HERO SECTION */}
            <div className="relative h-[350px] md:h-[420px] w-full overflow-hidden shadow-inner bg-slate-100">
                <img src={coverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10"></div>
                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white hover:text-white bg-black/30 hover:bg-black/50 px-5 py-2.5 rounded-full backdrop-blur-md transition-all font-bold border border-white/20 shadow-sm">
                    <ArrowLeft className="w-4 h-4" /> Trở lại
                </button>
            </div>

            {/* CONTAINER CHÍNH */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

                    {/* CỘT TRÁI: PROFILE CARD CƠ BẢN */}
                    <div className="lg:col-span-4 xl:col-span-3 sticky top-24 pt-16">
                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-8 text-center relative backdrop-blur-xl">

                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20">
                                <div className="relative w-40 h-40">
                                    <div className="w-full h-full rounded-full border-[6px] border-white shadow-xl bg-slate-100 overflow-hidden">
                                        <img src={pt.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pt.fullName)}&size=200&background=random`} alt={pt.fullName} className="w-full h-full object-cover" />
                                    </div>
                                    {pt.isVerified && (
                                        <div className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow-lg border border-slate-50 z-30">
                                            <CheckCircle2 className="w-8 h-8 text-blue-500 fill-blue-50" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-20">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{pt.fullName}</h1>

                                <p className="text-sm font-bold text-blue-600 mt-2 flex items-center justify-center gap-1.5 bg-blue-50 w-fit mx-auto px-3 py-1 rounded-lg">
                                    <Briefcase className="w-4 h-4" /> {pt.tier === 'TIER_1' ? 'PT Chuyên Nghiệp' : 'PT Tự Do'}
                                </p>

                                <div className="flex items-center justify-center gap-2 mt-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/50 rounded-2xl w-fit mx-auto px-5 py-2.5 shadow-sm">
                                    <Star className="w-5 h-5 fill-amber-400 text-amber-500 drop-shadow-sm" />
                                    <span className="text-xl font-black text-amber-900">{pt.rating ? pt.rating.toFixed(1) : '5.0'}</span>
                                    <span className="text-sm font-bold text-amber-700/60">({pt.totalReviews || 0} Đánh giá)</span>
                                </div>

                                <div className="mt-8 space-y-3">
                                    {hireStatus === 'ACTIVE' || hireStatus === 'END_REQUESTED' ? (
                                        <Button onClick={() => navigate('/chat', { state: { targetPtId: pt.userId } })} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                                            <MessageSquare className="w-5 h-5 mr-2" /> Nhắn tin ngay
                                        </Button>
                                    ) : hireStatus === 'AWAITING_PAYMENT' ? (
                                        <div className="space-y-2">
                                            <Button onClick={handlePayment} disabled={paying || payingWithWallet} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black rounded-xl shadow-lg shadow-emerald-500/20">
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                {paying ? 'Đang chuyển đến VNPay...' : 'Thanh toán qua VNPay'}
                                            </Button>
                                            {(() => {
                                                const balance = Number(coachingWallet?.availableBalance) || 0;
                                                const amount = Number(pt.agreedAmount) || 0;
                                                const enough = balance >= amount && amount > 0;
                                                return (
                                                    <>
                                                        <Button
                                                            onClick={handlePayWithWallet}
                                                            disabled={!enough || paying || payingWithWallet}
                                                            className="w-full h-12 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-base font-black rounded-xl disabled:opacity-50"
                                                        >
                                                            <Wallet className="w-4 h-4 mr-2" />
                                                            {payingWithWallet ? 'Đang xử lý...' : 'Thanh toán bằng số dư ví'}
                                                        </Button>
                                                        <p className="text-xs font-semibold text-slate-500">
                                                            Số dư ví: {balance.toLocaleString('vi-VN')}đ
                                                            {!enough && amount > 0 && <span className="text-amber-600"> · không đủ</span>}
                                                        </p>
                                                    </>
                                                );
                                            })()}
                                            <p className="text-xs font-semibold text-slate-500">
                                                PT đã chấp nhận · {Number(pt.agreedAmount || 0).toLocaleString('vi-VN')}đ
                                                {pt.selectedTrainingMode === 'OFFLINE' && pt.sessionCount
                                                    ? ` (gói ${pt.sessionCount} buổi)`
                                                    : `/${RATE_UNIT_LABEL[pt.agreedRateUnit] || pt.agreedRateUnit}`}
                                            </p>
                                            {pt.selectedTrainingMode === 'OFFLINE' && (
                                                <OfflinePackageSummary pt={pt} />
                                            )}
                                            {pt.paymentDueAt && (
                                                <p className="text-xs font-semibold text-amber-700">
                                                    Thanh toán trước {new Date(pt.paymentDueAt).toLocaleString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                    ) : hireStatus === 'PENDING' ? (
                                        <div className="space-y-2">
                                            <Button disabled className="w-full h-14 bg-amber-100 text-amber-700 border-2 border-amber-200 text-base font-bold rounded-2xl cursor-not-allowed">
                                                <Clock className="w-5 h-5 mr-2" /> Đang chờ duyệt
                                            </Button>
                                            {pt.selectedTrainingMode === 'OFFLINE' && (
                                                <OfflinePackageSummary pt={pt} tone="amber" />
                                            )}
                                        </div>
                                    ) : hireStatus === 'COMPLETED' ? (
                                        <Button disabled className="w-full h-14 bg-slate-100 text-slate-500 border border-slate-200 text-base font-bold rounded-2xl cursor-not-allowed">
                                            <CheckCircle2 className="w-5 h-5 mr-2" /> Đã hoàn thành khóa
                                        </Button>
                                    ) : (
                                        <Button onClick={openHireModal} disabled={hiring} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all group hover:-translate-y-0.5">
                                            <Send className={`w-5 h-5 mr-2 ${hiring ? 'animate-pulse' : 'group-hover:translate-x-1 transition-transform'}`} />
                                            {hiring ? 'Đang gửi...' : 'Đăng ký Coaching'}
                                        </Button>
                                    )}
                                </div>

                                {(pt.instagramUrl || pt.linkedinUrl) && (
                                    <div className="flex justify-center gap-4 mt-8 pt-8 border-t border-slate-100">
                                        {pt.instagramUrl && (
                                            <a href={pt.instagramUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-100 transition-all hover:scale-110 shadow-sm border border-pink-200">
                                                <InstagramIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {pt.linkedinUrl && (
                                            <a href={pt.linkedinUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all hover:scale-110 shadow-sm border border-blue-200">
                                                <LinkedinIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI: NỘI DUNG CHI TIẾT */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-8 lg:mt-24">

                        {pt.trainingPhilosophy && (
                            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 sm:p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 text-white/5 group-hover:text-white/10 transition-colors duration-700">
                                    <Quote className="w-64 h-64 rotate-180" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-sm font-black text-blue-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-8 h-1 bg-blue-400 rounded-full"></span> Triết lý huấn luyện
                                    </h3>
                                    <p className="text-white font-medium text-xl sm:text-3xl leading-relaxed italic">"{pt.trainingPhilosophy}"</p>
                                </div>
                            </div>
                        )}

                        {pt.bio && (
                            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><UserCircle className="w-6 h-6" /></div> Về bản thân
                                </h3>
                                <p className="text-slate-600 font-medium text-lg leading-loose whitespace-pre-wrap">{pt.bio}</p>
                            </div>
                        )}

                        {/* MỚI: BẢNG THÔNG TIN CHI TIẾT & CHUYÊN MÔN */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Cột 1: Thông tin Dịch vụ */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Target className="w-5 h-5" /></div> Thông tin Dịch vụ
                                    </h3>

                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><MapPin className="w-4 h-4"/> Hình thức</span>
                                            <span className="font-bold text-slate-800">{TRAINING_MODE_LABELS[pt.trainingMode] || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4"/> Kinh nghiệm</span>
                                            <span className="font-bold text-slate-800">{pt.yearsOfExperience || 0} năm</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Max Học viên</span>
                                            <span className="font-bold text-slate-800">{pt.maxClients || '10'} người</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                                    <span className="text-emerald-800 font-bold flex items-center gap-2"><Banknote className="w-5 h-5"/> Phí dịch vụ</span>
                                    <span className="text-lg font-black text-emerald-600">
                                        {pt.hourlyRate ? parseInt(pt.hourlyRate).toLocaleString('vi-VN') + 'đ' : 'Liên hệ'}
                                        <span className="text-xs font-semibold text-slate-500 ml-1">/ {RATE_UNIT_LABELS[pt.rateUnit] || 'buổi'}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Cột 2: Chuyên môn & Tags */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Chuyên môn</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {pt.specializations?.length > 0 ? pt.specializations.map((spec, i) => (
                                            <span key={i} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-3 py-1.5 rounded-lg">{spec}</span>
                                        )) : <span className="text-slate-400 text-sm italic">Đang cập nhật</span>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Mục tiêu hỗ trợ</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {pt.preferredGoals?.length > 0 ? pt.preferredGoals.map((goal, i) => (
                                            <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold px-3 py-1.5 rounded-lg">{GOAL_LABELS[goal] || goal}</span>
                                        )) : <span className="text-slate-400 text-sm italic">Đang cập nhật</span>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Chế độ ăn khuyến nghị</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {pt.preferredDietTypes?.length > 0 ? pt.preferredDietTypes.map((diet, i) => (
                                            <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold px-3 py-1.5 rounded-lg">{DIET_LABELS[diet] || diet}</span>
                                        )) : <span className="text-slate-400 text-sm italic">Đang cập nhật</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Dòng full-width cho Bằng cấp & Chứng chỉ */}
                            {pt.certifications?.length > 0 && (
                                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><GraduationCap className="w-5 h-5" /></div> Bằng cấp & Chứng chỉ
                                        </div>
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {pt.certifications.map((cert, i) => (
                                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                                <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                                    <ShieldCheck className="w-6 h-6 text-amber-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 truncate">{cert.name}</h4>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">{cert.issuingOrganization}</p>
                                                    <p className="text-xs text-slate-500 mt-1">Cấp: {cert.issueDate}</p>
                                                </div>
                                                {cert.certificateImageUrl && (
                                                    <button onClick={() => setLightboxImage(getFullImageUrl(cert.certificateImageUrl))} className="shrink-0 p-2 bg-white border border-slate-200 rounded-xl text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all cursor-zoom-in" title="Xem ảnh chứng chỉ">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transformation Gallery */}
                        {transformations.length > 0 && (
                            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><Award className="w-6 h-6" /></div> Kết quả Học viên (Before & After)
                                </h3>

                                <div className="grid grid-cols-1 gap-10">
                                    {transformations.map((t, idx) => (
                                        <div key={t.id || idx} className="rounded-[2rem] border border-slate-100 overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 bg-white flex flex-col md:flex-row">

                                            <div className="relative w-full md:w-5/12 xl:w-2/5 flex shrink-0 bg-slate-100 overflow-hidden min-h-[300px]">
                                                {/* Before */}
                                                <div className="w-1/2 h-full border-r-[2px] border-white relative z-10">
                                                    {t.beforeUrl ? (
                                                        <img src={getPermanentUrl(t.beforeUrl)} alt="Before" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">No Image</div>
                                                    )}
                                                    <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">Before</div>
                                                </div>
                                                {/* After */}
                                                <div className="w-1/2 h-full relative">
                                                    {t.afterUrl ? (
                                                        <img src={getPermanentUrl(t.afterUrl)} alt="After" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">No Image</div>
                                                    )}
                                                    <div className="absolute bottom-4 right-4 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">After</div>
                                                </div>
                                            </div>

                                            <div className="p-8 sm:p-10 flex-1 flex flex-col justify-center bg-gradient-to-br from-slate-50 to-white">
                                                <h4 className="font-extrabold text-2xl text-slate-900 mb-5 leading-tight">{t.title || 'Hành trình thay đổi'}</h4>
                                                <p className="text-base text-slate-600 font-medium leading-relaxed whitespace-pre-line">{t.story}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Đánh giá (Reviews) */}
                        <div id="review-form-section" className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10 pb-8 border-b border-slate-100">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><MessageSquare className="w-6 h-6" /></div> Đánh giá từ Học viên
                                    </h3>
                                    <p className="text-sm font-medium text-slate-500 mt-2">Khách hàng nói gì về {pt.fullName}?</p>
                                </div>
                                {hireStatus === 'COMPLETED' && !userReview && !showReviewForm && (
                                    <Button onClick={() => setShowReviewForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-12 px-8 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5">
                                        Viết đánh giá
                                    </Button>
                                )}
                            </div>

                            {showReviewForm && (
                                <Card className="p-8 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 border-blue-100 rounded-3xl mb-12 animate-in slide-in-from-top-4 fade-in duration-300 shadow-sm">
                                    <h4 className="font-extrabold text-blue-900 mb-6 text-lg">{reviewData.id ? 'Chỉnh sửa đánh giá' : 'Chia sẻ trải nghiệm của bạn'}</h4>
                                    <form onSubmit={handleSubmitReview} className="space-y-6">
                                        <div className="bg-white p-4 rounded-2xl border border-blue-100 inline-block shadow-sm">
                                            {renderStars(reviewData.rating, true)}
                                        </div>
                                        <textarea
                                            value={reviewData.comment}
                                            onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                            className="w-full p-5 rounded-2xl border border-blue-100 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white text-base font-medium transition-all resize-none min-h-[140px] shadow-sm"
                                            placeholder="Huấn luyện viên này đã giúp bạn thay đổi thế nào? Hãy chia sẻ về sự tận tâm, kiến thức và kết quả nhé..."
                                            required
                                        />

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-4 rounded-2xl border border-blue-50 shadow-sm">
                                            <div className="flex items-center gap-8">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={reviewData.isAnonymous}
                                                        onChange={e => setReviewData({...reviewData, isAnonymous: e.target.checked})}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer transition-all"
                                                    />
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Đánh giá ẩn danh</span>
                                                </label>

                                                <label className="cursor-pointer flex items-center gap-2.5 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">
                                                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                                        <Camera className="w-5 h-5 text-slate-500" />
                                                    </div>
                                                    {reviewImage ? <span className="text-blue-600 truncate max-w-[150px]">{reviewImage.name}</span> : 'Đính kèm ảnh'}
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleReviewImageSelect} />
                                                </label>
                                            </div>

                                            {reviewImagePreview && (
                                                <div className="relative group">
                                                    <img src={reviewImagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-xl border-2 border-white shadow-md" />
                                                    <button type="button" onClick={() => {setReviewImage(null); setReviewImagePreview('');}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4 justify-end pt-4">
                                            <Button type="button" variant="ghost" onClick={resetReviewForm} className="text-slate-500 hover:bg-slate-100 rounded-xl font-bold h-12 px-6">Hủy</Button>
                                            <Button type="submit" disabled={submittingReview} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 h-12 px-8 transition-all hover:-translate-y-0.5">
                                                {submittingReview ? 'Đang lưu...' : (reviewData.id ? 'Lưu Thay Đổi' : 'Gửi Đánh Giá')}
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            )}

                            <div className="space-y-6">
                                {reviews.length > 0 ? reviews.map(r => (
                                    <div key={r.id} className="p-6 sm:p-8 bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow relative group">

                                        {user?.id === r.reviewerId && !showReviewForm && (
                                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                                                <button onClick={() => handleEditClick(r)} className="text-blue-500 bg-white hover:bg-blue-50 p-2.5 rounded-xl transition-all shadow-sm border border-slate-100 hover:border-blue-200" title="Sửa đánh giá">
                                                    <Edit className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => promptDeleteReview(r.id)} className="text-red-500 bg-white hover:bg-red-50 p-2.5 rounded-xl transition-all shadow-sm border border-slate-100 hover:border-red-200" title="Xóa đánh giá">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6 pr-24">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-black text-xl shadow-inner border border-white">
                                                    {r.isAnonymous ? <EyeOff className="w-6 h-6 text-blue-400" /> : (r.reviewerName?.charAt(0) || 'U')}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                                                        {r.reviewerName}
                                                        {r.isAnonymous && <span className="bg-slate-800 text-white text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider font-bold shadow-sm">Ẩn danh</span>}
                                                    </p>
                                                    <div className="text-sm font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(r.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-1.5 mb-4 bg-amber-50 w-fit px-3 py-1.5 rounded-xl border border-amber-100/50">
                                                <span className="font-black text-amber-700 mr-1">{r.rating}.0</span>
                                                {renderStars(r.rating)}
                                            </div>
                                            <p className="text-slate-700 font-medium leading-relaxed text-base whitespace-pre-line">{r.comment}</p>

                                            {r.imageUrl && (
                                                <div className="mt-5">
                                                    <button
                                                        onClick={() => setLightboxImage(getFullImageUrl(r.imageUrl))}
                                                        className="block w-32 h-32 rounded-2xl border-4 border-white shadow-md overflow-hidden cursor-zoom-in hover:scale-105 transition-transform"
                                                    >
                                                        <img src={getFullImageUrl(r.imageUrl)} alt="Minh chứng" className="w-full h-full object-cover" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                                            <MessageSquare className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-800">Chưa có đánh giá nào</h4>
                                        <p className="text-slate-500 font-medium mt-2 text-base">Hãy là người đầu tiên để lại nhận xét cho Huấn luyện viên này nhé.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <Modal
                isOpen={showHireModal}
                onClose={() => !hiring && setShowHireModal(false)}
                title="Chọn hình thức coaching"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Giá được giữ nguyên tại thời điểm gửi yêu cầu. Bạn chỉ thanh toán sau khi PT chấp nhận.
                    </p>

                    {(pt.trainingMode === 'ONLINE' || pt.trainingMode === 'BOTH') && pt.onlineRate && (
                        <button
                            type="button"
                            onClick={() => setSelectedMode('ONLINE')}
                            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${selectedMode === 'ONLINE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-blue-100 p-2 text-blue-700"><Wifi className="h-5 w-5" /></div>
                                <div className="flex-1">
                                    <p className="font-black text-slate-900">Coaching online</p>
                                    <p className="mt-1 text-sm text-slate-500">Theo dõi từ xa qua chat, thực đơn và tiến độ trên Nutrican.</p>
                                    <p className="mt-2 font-black text-blue-700">{Number(pt.onlineRate).toLocaleString('vi-VN')}đ / {RATE_UNIT_LABEL[pt.onlineRateUnit] || pt.onlineRateUnit}</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {(pt.trainingMode === 'OFFLINE' || pt.trainingMode === 'BOTH') && pt.offlineRate && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedMode('OFFLINE');
                                setSelectedVenueId(null);
                                setSelectedSessions([]);
                            }}
                            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${selectedMode === 'OFFLINE' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><MapPin className="h-5 w-5" /></div>
                                <div className="flex-1">
                                    <p className="font-black text-slate-900">Coaching offline</p>
                                    <p className="mt-1 text-sm text-slate-500">Chọn địa điểm và nhiều buổi tập trên lịch tuần.</p>
                                    <p className="mt-2 font-black text-emerald-700">{Number(pt.offlineRate).toLocaleString('vi-VN')}đ / buổi</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {selectedMode === 'OFFLINE' && (
                        <div className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                            {loadingCalendar ? (
                                <p className="text-sm text-slate-500">Đang tải lịch...</p>
                            ) : !(calendarData?.venues || pt.venues)?.length ? (
                                <p className="text-sm font-semibold text-amber-700">PT chưa cấu hình địa điểm tập. Vui lòng thử lại sau.</p>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Chọn địa điểm</p>
                                        <div className="mt-2 space-y-2">
                                            {(calendarData?.venues || pt.venues).map((venue) => (
                                                <button
                                                    key={venue.id}
                                                    type="button"
                                                    onClick={() => setSelectedVenueId(venue.id)}
                                                    className={`w-full rounded-xl border p-3 text-left ${selectedVenueId === venue.id ? 'border-emerald-500 bg-white' : 'border-slate-200 bg-white/70'}`}
                                                >
                                                    <p className="font-bold text-slate-900">{venue.name}</p>
                                                    <p className="text-xs text-slate-600">{venue.address}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {selectedVenueId && (
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Chọn buổi tập (có thể chọn nhiều tuần)</p>
                                            <div className="mt-2">
                                                <PtWeeklyCalendarPicker
                                                    availability={calendarData?.availability || pt.availability || []}
                                                    occupiedSlots={calendarData?.occupiedSlots || []}
                                                    rateUnit={calendarData?.offlineRateUnit || pt.offlineRateUnit}
                                                    perSessionRate={calendarData?.offlineRate || pt.offlineRate}
                                                    selectedSessions={selectedSessions}
                                                    onSelectedSessionsChange={setSelectedSessions}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {selectedOfflineSummary && (
                                        <div className="rounded-xl border border-emerald-200 bg-white p-3">
                                            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Tóm tắt</p>
                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {selectedOfflineSummary.venue.name} · {selectedOfflineSummary.sessionCount} buổi
                                            </p>
                                            <p className="text-sm font-black text-emerald-700">{selectedOfflineSummary.total.toLocaleString('vi-VN')}đ</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <Button variant="outline" onClick={() => setShowHireModal(false)} disabled={hiring}>Hủy</Button>
                        <Button
                            onClick={handleHirePt}
                            disabled={
                                !selectedMode
                                || hiring
                                || (selectedMode === 'OFFLINE' && (!selectedVenueId || selectedSessions.length === 0))
                            }
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {hiring ? 'Đang gửi...' : 'Gửi yêu cầu thuê PT'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ImageLightbox
                isOpen={!!lightboxImage}
                imageUrl={lightboxImage}
                onClose={() => setLightboxImage('')}
            />

            {deleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeDeleteModal}></div>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 relative z-10 border border-slate-100">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-white shadow-sm">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">Xóa đánh giá này?</h3>
                            <p className="text-slate-500 font-medium text-base leading-relaxed px-4">
                                Hành động này không thể hoàn tác. Đánh giá của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.
                            </p>
                        </div>
                        <div className="flex bg-slate-50 p-6 gap-4 border-t border-slate-100">
                            <Button
                                variant="outline"
                                onClick={closeDeleteModal}
                                className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 h-14 text-base transition-colors"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                onClick={confirmDeleteReview}
                                className="flex-1 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 h-14 text-base transition-all hover:-translate-y-0.5"
                            >
                                Xóa vĩnh viễn
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
