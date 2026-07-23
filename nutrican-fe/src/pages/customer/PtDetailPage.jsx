// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { coachingPaymentService } from '../../services/coachingPaymentService';
import { Star, CheckCircle2, ArrowLeft, MessageSquare, Briefcase, Clock, Send, Award, Quote, UserCircle, Edit, Trash2, Camera, EyeOff, AlertTriangle, Target, MapPin, Banknote, ShieldCheck, GraduationCap, Link as LinkIcon, Wifi, CreditCard, Wallet, ImageIcon, ExternalLink, Users, Filter, Image as ImageIcon2, UserCheck, ShieldAlert, Check, Dumbbell, Monitor, Globe, Utensils, Flame } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ImageLightbox from '../../components/common/ImageLightbox';
import Modal from '../../components/common/Modal';
import { formatSessionRange, computePackageTotal } from '../../utils/offlineHireSlots';
import PtWeeklyCalendarPicker from '../../components/pt/PtWeeklyCalendarPicker';

const RATE_UNIT_LABEL = {
    MONTH: 'tháng',
    SESSION_60: 'buổi (60 phút)',
    SESSION_90: 'buổi (90 phút)',
    HOUR: 'giờ',
};

const GENDER_LABEL = { MALE: 'Nam giới', FEMALE: 'Nữ giới', OTHER: 'Khác' };

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
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return getPermanentUrl(url);
    }
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
    return getPermanentUrl(`${minioUrl}/${cleanPath}`);
};

const formatMonthYear = (ym) => {
    if (!ym) return null;
    const [year, month] = ym.split('-');
    return `${month}/${year}`;
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

const GOAL_LABELS = {
    'WEIGHT_LOSS': 'Giảm cân',
    'WEIGHT_GAIN': 'Tăng cân',
    'MUSCLE_GAIN': 'Tăng cơ',
    'FAT_LOSS': 'Đốt mỡ',
    'MAINTAIN': 'Duy trì',
    'PREGNANT': 'Mang thai',
    'RECOVERY': 'Phục hồi'
};

const DIET_LABELS = {
    'NORMAL': 'Ăn thường',
    'VEGETARIAN': 'Ăn chay',
    'VEGAN': 'Thuần chay',
    'KETO': 'Keto',
    'EAT_CLEAN': 'Eat clean'
};

const RATE_UNIT_LABELS = { 'SESSION_60': 'buổi (60 phút)', 'SESSION_90': 'buổi (90 phút)', 'HOUR': 'giờ', 'MONTH': 'tháng' };
const TRAINING_MODE_LABELS = { 'OFFLINE': 'Trực tiếp (Offline)', 'ONLINE': 'Online', 'BOTH': 'Cả hai (Online & Offline)' };

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

    const [starFilter, setStarFilter] = useState('ALL');
    const [selectedReviewer, setSelectedReviewer] = useState(null);

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
                const revRes = await marketplaceService.getPtReviews(ptData.userId, { page: 0, size: 100 });
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

    const reviewStats = useMemo(() => {
        const total = reviews.length;
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let hasImageCount = 0;
        let sum = 0;

        reviews.forEach(r => {
            const star = Math.round(r.rating) || 5;
            if (dist[star] !== undefined) dist[star] += 1;
            if (r.imageUrl) hasImageCount += 1;
            sum += r.rating || 5;
        });

        const avg = total > 0 ? (sum / total).toFixed(1) : (pt?.rating ? pt.rating.toFixed(1) : '5.0');
        return { total, dist, hasImageCount, avg };
    }, [reviews, pt?.rating]);

    const displayedReviews = useMemo(() => {
        return reviews.filter(r => {
            if (starFilter === 'ALL') return true;
            if (starFilter === 'IMAGE') return !!r.imageUrl;
            return Math.round(r.rating) === Number(starFilter);
        });
    }, [reviews, starFilter]);

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
            const revRes = await marketplaceService.getPtReviews(pt.userId, { page: 0, size: 100 });
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
            const revRes = await marketplaceService.getPtReviews(pt.userId, { page: 0, size: 100 });
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

    let showcase = pt.portfolioShowcase || pt.ptProfile?.portfolioShowcase || pt.showcase || {};
    if (typeof showcase === 'string') {
        try { showcase = JSON.parse(showcase); } catch (e) { showcase = {}; }
    }

    let transformations = showcase.transformations || pt.transformations || pt.ptProfile?.transformations || [];
    if (typeof transformations === 'string') {
        try { transformations = JSON.parse(transformations); } catch (e) { transformations = []; }
    }

    let certifications = pt.certifications || pt.ptProfile?.certifications || [];
    if (typeof certifications === 'string') {
        try { certifications = JSON.parse(certifications); } catch (e) { certifications = []; }
    }

    const displayRate = pt.offlineRate || pt.onlineRate || pt.hourlyRate;
    const displayUnit = pt.offlineRateUnit || pt.onlineRateUnit || pt.rateUnit || 'SESSION_60';

    const coverPhoto = getFullImageUrl(showcase.coverPhotoUrl || pt.coverPhotoUrl) || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop";
    const userReview = reviews.find(r => r.reviewerId === user?.id);

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-slate-50 pb-24 animate-fade-in relative">

            <div className="relative h-[350px] md:h-[420px] w-full overflow-hidden shadow-inner bg-slate-100">
                <img src={coverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10"></div>
                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white hover:text-white bg-black/30 hover:bg-black/50 px-5 py-2.5 rounded-full backdrop-blur-md transition-all font-bold border border-white/20 shadow-sm cursor-pointer">
                    <ArrowLeft className="w-4 h-4" /> Trở lại
                </button>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

                    <div className="lg:col-span-4 xl:col-span-3 sticky top-24 pt-16">
                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-8 text-center relative backdrop-blur-xl">

                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20">
                                <div className="relative w-40 h-40">
                                    <div className="w-full h-full rounded-full border-[6px] border-white shadow-xl bg-slate-100 overflow-hidden">
                                        <img src={getFullImageUrl(pt.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pt.fullName)}&size=200&background=random`} alt={pt.fullName} className="w-full h-full object-cover" />
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
                                    <span className="text-xl font-black text-amber-900">{reviewStats.avg}</span>
                                    <span className="text-sm font-bold text-amber-700/60">({reviewStats.total} Đánh giá)</span>
                                </div>

                                <div className="mt-8 space-y-3">
                                    {hireStatus === 'ACTIVE' || hireStatus === 'END_REQUESTED' ? (
                                        <Button onClick={() => navigate('/chat', { state: { targetPtId: pt.userId } })} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 cursor-pointer">
                                            <MessageSquare className="w-5 h-5 mr-2" /> Nhắn tin ngay
                                        </Button>
                                    ) : hireStatus === 'AWAITING_PAYMENT' ? (
                                        <div className="space-y-2">
                                            <Button onClick={handlePayment} disabled={paying || payingWithWallet} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer">
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
                                                            className="w-full h-12 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-base font-black rounded-xl disabled:opacity-50 cursor-pointer"
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
                                    ) : (
                                        <div className="space-y-2">
                                            {hireStatus === 'COMPLETED' && (
                                                <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    Đã hoàn thành khóa trước đó — có thể đăng ký lại
                                                </p>
                                            )}
                                            <Button onClick={openHireModal} disabled={hiring} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all group hover:-translate-y-0.5 cursor-pointer">
                                                <Send className={`w-5 h-5 mr-2 ${hiring ? 'animate-pulse' : 'group-hover:translate-x-1 transition-transform'}`} />
                                                {hiring ? 'Đang gửi...' : hireStatus === 'COMPLETED' ? 'Đăng ký lại Coaching' : 'Đăng ký Coaching'}
                                            </Button>
                                        </div>
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

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Target className="w-5 h-5" /></div> Thông tin Dịch vụ
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><MapPin className="w-4 h-4"/> Hình thức</span>
                                            <span className="font-bold text-slate-800">{TRAINING_MODE_LABELS[pt.trainingMode] || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><MapPin className="w-4 h-4"/> Địa điểm</span>
                                            <span className="font-bold text-slate-800">{pt.location || 'Toàn quốc'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><UserCircle className="w-4 h-4"/> Giới tính</span>
                                            <span className="font-bold text-slate-800">{GENDER_LABEL[pt.gender] || pt.gender || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4"/> Kinh nghiệm</span>
                                            <span className="font-bold text-slate-800">{pt.yearsOfExperience || 0} năm</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                            <span className="text-slate-500 font-semibold flex items-center gap-2"><Users className="w-4 h-4"/> Max Học viên</span>
                                            <span className="font-bold text-slate-800">{pt.maxClients || 10} người</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                                    <span className="text-emerald-800 font-bold flex items-center gap-2"><Banknote className="w-5 h-5"/> Phí dịch vụ</span>
                                    <span className="text-lg font-black text-emerald-600">
                                        {displayRate ? parseInt(displayRate).toLocaleString('vi-VN') + 'đ' : 'Liên hệ'}
                                        <span className="text-xs font-semibold text-slate-500 ml-1">/ {RATE_UNIT_LABELS[displayUnit] || displayUnit}</span>
                                    </span>
                                </div>
                            </div>

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
                                            <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold px-3 py-1.5 rounded-lg">
                                                {GOAL_LABELS[goal] || (goal === 'MUSCLE_GAIN' ? 'Tăng cơ' : goal)}
                                            </span>
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

                            {certifications.length > 0 && (
                                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><GraduationCap className="w-5 h-5" /></div> Bằng cấp & Chứng chỉ ({certifications.length})
                                        </div>
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {certifications.map((cert, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                                        <ShieldCheck className="w-6 h-6 text-amber-500" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-extrabold text-slate-800 truncate text-sm">{cert.name}</h4>
                                                        <p className="text-xs font-bold text-slate-500 mt-0.5">{cert.issuingOrganization}</p>
                                                        <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-wider">
                                                            Cấp: {formatMonthYear(cert.issueDate) || '—'} {cert.neverExpires ? '· Vô thời hạn ∞' : cert.expiryDate ? `đến ${formatMonthYear(cert.expiryDate)}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                {cert.certificateImageUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setLightboxImage(getFullImageUrl(cert.certificateImageUrl))}
                                                        className="shrink-0 p-2.5 bg-white border border-slate-200 rounded-xl text-blue-600 hover:bg-blue-50 transition-all cursor-zoom-in shadow-2xs"
                                                        title="Xem ảnh chứng chỉ"
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {transformations.length > 0 && (
                            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm animate-fade-in">
                                <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><Award className="w-6 h-6" /></div> Kết quả Học viên (Before & After)
                                </h3>

                                <div className="grid grid-cols-1 gap-10">
                                    {transformations.map((t, idx) => (
                                        <div key={t.id || idx} className="rounded-[2rem] border border-slate-100 overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 bg-white flex flex-col md:flex-row">

                                            <div className="relative w-full md:w-5/12 xl:w-2/5 flex shrink-0 bg-slate-100 overflow-hidden min-h-[300px]">

                                                <div className="w-1/2 h-full border-r-[2px] border-white relative z-10 group/img">
                                                    {t.beforeUrl ? (
                                                        <>
                                                            <img src={getFullImageUrl(t.beforeUrl)} alt="Before" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                                            <button onClick={() => setLightboxImage(getFullImageUrl(t.beforeUrl))} className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">Phóng to</button>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">No Image</div>
                                                    )}
                                                    <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm pointer-events-none">Before</div>
                                                </div>

                                                <div className="w-1/2 h-full relative group/img">
                                                    {t.afterUrl ? (
                                                        <>
                                                            <img src={getFullImageUrl(t.afterUrl)} alt="After" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                                            <button onClick={() => setLightboxImage(getFullImageUrl(t.afterUrl))} className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">Phóng to</button>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">No Image</div>
                                                    )}
                                                    <div className="absolute bottom-4 right-4 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm pointer-events-none">After</div>
                                                </div>
                                            </div>

                                            <div className="p-8 sm:p-10 flex-1 flex flex-col justify-center bg-gradient-to-br from-slate-50 to-white">
                                                <h4 className="font-extrabold text-2xl text-slate-900 mb-5 leading-tight">{t.title || 'Hành trình thay đổi ngoạn mục'}</h4>
                                                <p className="text-base text-slate-600 font-medium leading-relaxed whitespace-pre-line">{t.story}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- SECTION ĐÁNH GIÁ TỪ HỌC VIÊN --- */}
                        <div id="review-form-section" className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">

                            {/* Title Header */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><MessageSquare className="w-6 h-6" /></div> Đánh giá từ Học viên
                                    </h3>
                                    <p className="text-sm font-medium text-slate-500 mt-2">Khách hàng nói gì về {pt.fullName}?</p>
                                </div>
                                {hireStatus === 'COMPLETED' && !userReview && !showReviewForm && (
                                    <Button onClick={() => setShowReviewForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-12 px-8 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 cursor-pointer">
                                        Viết đánh giá
                                    </Button>
                                )}
                            </div>

                            {/* KHỐI THỐNG KÊ TỔNG QUAN */}
                            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/20 p-6 sm:p-8 rounded-[2rem] border border-slate-200/80 mb-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-2xs">
                                <div className="md:col-span-5 flex flex-col items-center justify-center text-center md:border-r border-slate-200/60 md:pr-6">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Điểm đánh giá trung bình</p>
                                    <h4 className="text-6xl font-black text-amber-500 tracking-tight">{reviewStats.avg}</h4>
                                    <div className="my-2.5">
                                        {renderStars(Number(reviewStats.avg))}
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200/60 shadow-2xs">
                                        Dựa trên <span className="text-blue-600">{reviewStats.total}</span> đánh giá từ học viên
                                    </p>
                                </div>

                                <div className="md:col-span-7 space-y-2.5 md:pl-2">
                                    {[5, 4, 3, 2, 1].map(star => {
                                        const count = reviewStats.dist[star] || 0;
                                        const percentage = reviewStats.total > 0 ? Math.round((count / reviewStats.total) * 100) : 0;
                                        return (
                                            <div key={star} className="flex items-center gap-3 text-xs font-bold">
                                                <div className="flex items-center gap-1 w-12 shrink-0 text-slate-700">
                                                    <span>{star}</span>
                                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                                </div>
                                                <div className="flex-1 h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-400 rounded-full transition-all duration-700 ease-out"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className="w-16 shrink-0 text-right text-slate-500 font-semibold">
                                                    {count} <span className="text-[10px] text-slate-400">({percentage}%)</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* BỘ LỌC ĐÁNH GIÁ */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-slate-100 no-scrollbar">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2 shrink-0">
                                    <Filter className="w-3.5 h-3.5 text-blue-600" /> Lọc theo:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setStarFilter('ALL')}
                                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${starFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 border border-slate-200/60'}`}
                                >
                                    Tất cả ({reviewStats.total})
                                </button>
                                {[5, 4, 3, 2, 1].map(star => {
                                    const count = reviewStats.dist[star] || 0;
                                    if (count === 0 && reviewStats.total > 0) return null;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setStarFilter(String(star))}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${starFilter === String(star) ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 border border-slate-200/60'}`}
                                        >
                                            <span>{star}</span>
                                            <Star className={`w-3 h-3 ${starFilter === String(star) ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'}`} />
                                            <span>({count})</span>
                                        </button>
                                    );
                                })}
                                {reviewStats.hasImageCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setStarFilter('IMAGE')}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ml-auto ${starFilter === 'IMAGE' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'}`}
                                    >
                                        <ImageIcon2 className="w-3.5 h-3.5" />
                                        <span>Có hình ảnh ({reviewStats.hasImageCount})</span>
                                    </button>
                                )}
                            </div>

                            {/* Form viết/sửa đánh giá */}
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

                            {/* --- DANH SÁCH ĐÁNH GIÁ --- */}
                            <div className="space-y-6">
                                {displayedReviews.length > 0 ? displayedReviews.map(r => (
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
                                            <div
                                                className={`flex items-center gap-4 ${!r.isAnonymous ? 'cursor-pointer group/user' : ''}`}
                                                onClick={() => !r.isAnonymous && setSelectedReviewer(r)}
                                                title={!r.isAnonymous ? "Bấm để xem hồ sơ xác thực học viên" : ""}
                                            >
                                                <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-black text-xl shadow-inner border-2 border-white transition-transform ${!r.isAnonymous ? 'group-hover/user:scale-105 group-hover/user:border-blue-400' : ''}`}>
                                                    {r.isAnonymous ? <EyeOff className="w-6 h-6 text-blue-400" /> : (r.reviewerName?.charAt(0) || 'U')}
                                                </div>
                                                <div>
                                                    <p className={`font-extrabold text-slate-900 text-lg flex items-center gap-2 transition-colors ${!r.isAnonymous ? 'group-hover/user:text-blue-600' : ''}`}>
                                                        <span>{r.reviewerName || 'Học viên ẩn danh'}</span>
                                                        {r.isAnonymous ? (
                                                            <span className="bg-slate-800 text-white text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider font-bold shadow-sm">Ẩn danh</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                                                                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Đã xác thực coaching
                                                            </span>
                                                        )}
                                                    </p>
                                                    <div className="text-sm font-semibold text-slate-400 mt-1 flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(r.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                        {!r.isAnonymous && <span className="text-xs text-blue-500 font-bold group-hover/user:underline">  </span>}
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
                                                        type="button"
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
                                    <div className="text-center py-16 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 shadow-2xs">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                            <Filter className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-700">Không tìm thấy đánh giá nào phù hợp</h4>
                                        <p className="text-slate-400 font-medium mt-1 text-sm">Hãy thử chọn mức sao khác hoặc bấm &quot;Tất cả&quot; để xem toàn bộ danh sách.</p>
                                        <button
                                            type="button"
                                            onClick={() => setStarFilter('ALL')}
                                            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                                        >
                                            Quay lại xem Tất cả ({reviewStats.total})
                                        </button>
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
                            className={`w-full rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${selectedMode === 'ONLINE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}
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
                            className={`w-full rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${selectedMode === 'OFFLINE' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}
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
                                                    className={`w-full rounded-xl border p-3 text-left cursor-pointer ${selectedVenueId === venue.id ? 'border-emerald-500 bg-white' : 'border-slate-200 bg-white/70'}`}
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

            {/* ================================================================================= */}
            {/* --- MODAL CHI TIẾT HỌC VIÊN ĐÁNH GIÁ (XÁC THỰC UY TÍN - SIÊU THOÁNG MAX-W-2XL) --- */}
            {/* ================================================================================= */}
            {selectedReviewer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedReviewer(null)}>

                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100 relative no-scrollbar" onClick={(e) => e.stopPropagation()}>

                        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 h-24 relative p-5 flex justify-end">
                            <button onClick={() => setSelectedReviewer(null)} className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md font-bold">
                                ✕
                            </button>
                        </div>

                        <div className="px-8 pb-8 pt-0 relative">

                            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
                                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left w-full">

                                    <div className="-mt-14 relative inline-block shrink-0 z-10">
                                        <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-xl border-2 border-slate-100 flex items-center justify-center">
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-black text-3xl flex items-center justify-center">
                                                {selectedReviewer.reviewerName?.charAt(0) || 'U'}
                                            </div>
                                        </div>
                                        <div className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-1.5 shadow-md border-2 border-white" title="Khách hàng đã xác thực">
                                            <Check className="w-4 h-4 stroke-[3]" />
                                        </div>
                                    </div>

                                    <div className="pt-2 sm:pt-0 sm:pb-1 flex-1 min-w-0">
                                        <h3 className="text-2xl font-black text-slate-900 leading-tight truncate">{selectedReviewer.reviewerName}</h3>
                                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-black px-3 py-1 rounded-full border border-emerald-200/80 shadow-2xs">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Học viên xác thực
                                            </span>
                                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-black px-3 py-1 rounded-full border border-blue-200/80 shadow-2xs">
                                                <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Thành viên Nutrican
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- HUYỆT ĐẠO UY TÍN: 4 THÔNG SỐ TRẢI NGHIỆM ĐỒNG HÀNH --- */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                                <div className="p-3 bg-white rounded-xl border border-slate-200/60 text-center sm:text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">HLV đồng hành:</p>
                                    <p className="text-xs font-black text-slate-800 truncate mt-0.5">{pt.fullName}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200/60 text-center sm:text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Hình thức học:</p>
                                    <p className="text-xs font-black text-blue-600 truncate mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                                        {selectedReviewer.trainingMode === 'ONLINE' ? <Monitor className="w-3 h-3"/> : <Dumbbell className="w-3 h-3 text-emerald-600"/>}
                                        {selectedReviewer.trainingMode === 'ONLINE' ? 'Online' : 'Trực tiếp'}
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200/60 text-center sm:text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Hài lòng:</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                                        <span className="text-amber-600 font-black text-xs">{selectedReviewer.rating}.0</span>
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                    </div>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200/60 text-center sm:text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ngày nhận xét:</p>
                                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">{new Date(selectedReviewer.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>

                            {/* --- BỔ SUNG MỚI: HỒ SƠ THỂ CHẤT & DINH DƯỠNG CỦA HỌC VIÊN --- */}
                            <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-left space-y-2.5">
                                <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5 text-blue-600" /> Mục tiêu & Chế độ ăn của học viên này:
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 bg-white text-emerald-700 border border-emerald-200/80 px-3 py-1 rounded-lg text-xs font-black shadow-2xs">
                                        <Flame className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                                        Mục tiêu: {GOAL_LABELS[selectedReviewer.reviewerGoal] || selectedReviewer.reviewerGoal || 'Giảm cân / Giảm mỡ'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 bg-white text-indigo-700 border border-indigo-200/80 px-3 py-1 rounded-lg text-xs font-black shadow-2xs">
                                        <Utensils className="w-3.5 h-3.5 text-indigo-500" />
                                        Chế độ ăn: {DIET_LABELS[selectedReviewer.reviewerDiet] || selectedReviewer.reviewerDiet || 'Eat Clean'}
                                    </span>
                                </div>
                            </div>

                            {/* Lời nhận xét trích dẫn */}
                            <div className="mt-4 p-5 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-left">
                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Quote className="w-3.5 h-3.5 text-amber-600" /> Lời đánh giá thực tế:
                                </p>
                                <p className="text-sm font-bold text-amber-950 italic leading-relaxed">
                                    "{selectedReviewer.comment}"
                                </p>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 text-center sm:text-left">
                                    <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Để bảo vệ quyền riêng tư cá nhân, thông tin liên lạc chi tiết của học viên được bảo mật bởi hệ thống.</span>
                                </div>

                                <Button
                                    onClick={() => setSelectedReviewer(null)}
                                    className="w-full sm:w-auto px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-11 shadow-md cursor-pointer shrink-0"
                                >
                                    Đóng hồ sơ
                                </Button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

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
                                className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 h-14 text-base transition-colors cursor-pointer"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                onClick={confirmDeleteReview}
                                className="flex-1 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 h-14 text-base transition-all hover:-translate-y-0.5 cursor-pointer"
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