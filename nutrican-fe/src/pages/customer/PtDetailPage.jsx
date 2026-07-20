// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { coachingPaymentService } from '../../services/coachingPaymentService';
import { Star, CheckCircle2, ArrowLeft, MessageSquare, Briefcase, Clock, Send, Award, Quote, UserCircle, Edit, Trash2, Camera, EyeOff, AlertTriangle, Wifi, MapPin, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ImageLightbox from '../../components/common/ImageLightbox';
import Modal from '../../components/common/Modal';

const RATE_UNIT_LABEL = {
    MONTH: 'tháng',
    SESSION_60: 'buổi 60 phút',
    SESSION_90: 'buổi 90 phút',
};

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
    const [showHireModal, setShowHireModal] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null);

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
        setShowHireModal(true);
    };

    const handleHirePt = async () => {
        if (!selectedMode) {
            toast.error('Vui lòng chọn hình thức coaching');
            return;
        }
        try {
            setHiring(true);
            const response = await marketplaceService.hirePt(pt.userId, selectedMode);
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
        <div className="min-h-screen bg-slate-50/50 pb-24 animate-fade-in">
            <div className="relative h-[320px] md:h-[400px] w-full bg-slate-900 overflow-hidden">
                <img src={coverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent"></div>

                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white hover:text-white bg-black/30 hover:bg-black/50 px-5 py-2.5 rounded-full backdrop-blur-md transition-all font-bold border border-white/20 shadow-sm">
                    <ArrowLeft className="w-4 h-4" /> Trở lại
                </button>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

                    <div className="lg:col-span-4 xl:col-span-3 sticky top-24 pt-16">
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 p-6 text-center relative">

                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20">
                                <div className="relative w-32 h-32">
                                    <div className="w-full h-full rounded-full border-[5px] border-white shadow-lg bg-slate-100 overflow-hidden">
                                        <img src={pt.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pt.fullName)}&size=200&background=random`} alt={pt.fullName} className="w-full h-full object-cover" />
                                    </div>
                                    {pt.isVerified && (
                                        <div className="absolute bottom-1 right-1 bg-white rounded-full p-0.5 shadow-md border border-slate-50 z-30">
                                            <CheckCircle2 className="w-7 h-7 text-blue-500 fill-blue-50" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-16">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{pt.fullName}</h1>
                                <p className="text-sm font-bold text-slate-500 mt-1.5 flex items-center justify-center gap-1.5">
                                    <Briefcase className="w-4 h-4" /> {pt.specialty || 'Huấn luyện viên Cá nhân'}
                                </p>

                                <div className="flex items-center justify-center gap-2 mt-4 bg-amber-50 border border-amber-100 rounded-xl w-fit mx-auto px-4 py-2">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                    <span className="text-lg font-black text-amber-900">{pt.rating ? pt.rating.toFixed(1) : '5.0'}</span>
                                    <span className="text-xs font-bold text-amber-700/60">({pt.totalReviews || 0} Đánh giá)</span>
                                </div>

                                <div className="mt-6 space-y-2.5">
                                    {hireStatus === 'ACTIVE' || hireStatus === 'END_REQUESTED' ? (
                                        <Button onClick={() => navigate('/chat', { state: { targetPtId: pt.userId } })} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                                            <MessageSquare className="w-4 h-4 mr-2" /> Nhắn tin ngay
                                        </Button>
                                    ) : hireStatus === 'AWAITING_PAYMENT' ? (
                                        <div className="space-y-2">
                                            <Button onClick={handlePayment} disabled={paying} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black rounded-xl shadow-lg shadow-emerald-500/20">
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                {paying ? 'Đang chuyển đến VNPay...' : 'Thanh toán để bắt đầu'}
                                            </Button>
                                            <p className="text-xs font-semibold text-slate-500">
                                                PT đã chấp nhận · {Number(pt.agreedAmount || 0).toLocaleString('vi-VN')}đ/{RATE_UNIT_LABEL[pt.agreedRateUnit] || pt.agreedRateUnit}
                                            </p>
                                            {pt.paymentDueAt && (
                                                <p className="text-xs font-semibold text-amber-700">
                                                    Thanh toán trước {new Date(pt.paymentDueAt).toLocaleString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                    ) : hireStatus === 'PENDING' ? (
                                        <Button disabled className="w-full h-12 bg-amber-100 text-amber-700 border-2 border-amber-200 text-base font-bold rounded-xl cursor-not-allowed">
                                            <Clock className="w-4 h-4 mr-2" /> Đang chờ duyệt
                                        </Button>
                                    ) : hireStatus === 'COMPLETED' ? (
                                        <Button disabled className="w-full h-12 bg-slate-100 text-slate-500 border border-slate-200 text-base font-bold rounded-xl cursor-not-allowed">
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Đã hoàn thành khóa
                                        </Button>
                                    ) : (
                                        <Button onClick={openHireModal} disabled={hiring} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all group hover:-translate-y-0.5">
                                            <Send className={`w-4 h-4 mr-2 ${hiring ? 'animate-pulse' : 'group-hover:translate-x-1 transition-transform'}`} />
                                            Đăng ký Coaching
                                        </Button>
                                    )}
                                </div>

                                {(pt.instagramUrl || pt.linkedinUrl) && (
                                    <div className="flex justify-center gap-3 mt-6 pt-6 border-t border-slate-100">
                                        {pt.instagramUrl && (
                                            <a href={pt.instagramUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-100 transition-all hover:scale-110 shadow-sm border border-pink-200">
                                                <InstagramIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        {pt.linkedinUrl && (
                                            <a href={pt.linkedinUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all hover:scale-110 shadow-sm border border-blue-200">
                                                <LinkedinIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 xl:col-span-9 space-y-8 lg:mt-16">

                        {pt.trainingPhilosophy && (
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 sm:p-10 rounded-[2rem] shadow-lg shadow-blue-500/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 text-white/5 group-hover:text-white/10 transition-colors duration-500">
                                    <Quote className="w-48 h-48 rotate-180" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xs font-black text-blue-200 uppercase tracking-widest mb-3">Triết lý huấn luyện</h3>
                                    <p className="text-white font-medium text-lg sm:text-2xl leading-relaxed italic">"{pt.trainingPhilosophy}"</p>
                                </div>
                            </div>
                        )}

                        {pt.bio && (
                            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <UserCircle className="w-6 h-6 text-blue-500" /> Về bản thân
                                </h3>
                                <p className="text-slate-600 font-medium text-base leading-loose whitespace-pre-wrap">{pt.bio}</p>
                            </div>
                        )}

                        {transformations.length > 0 && (
                            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                                    <Award className="w-6 h-6 text-amber-500" /> Kết quả Học viên (Before & After)
                                </h3>

                                <div className="grid grid-cols-1 gap-10">
                                    {transformations.map((t, idx) => (
                                        <div key={t.id || idx} className="rounded-[2rem] border border-slate-100 overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300 bg-white flex flex-col">

                                            <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] flex shrink-0 bg-slate-100 overflow-hidden">
                                                <div className="w-1/2 h-full border-r-[2px] border-white relative z-10">
                                                    {t.beforeUrl ? (
                                                        <img src={getPermanentUrl(t.beforeUrl)} alt="Before" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">No Image</div>
                                                    )}
                                                    <div className="absolute bottom-4 left-4 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">Before</div>
                                                </div>
                                                <div className="w-1/2 h-full relative">
                                                    {t.afterUrl ? (
                                                        <img src={getPermanentUrl(t.afterUrl)} alt="After" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">No Image</div>
                                                    )}
                                                    <div className="absolute bottom-4 right-4 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">After</div>
                                                </div>
                                            </div>

                                            <div className="p-8 sm:p-10 flex flex-col bg-slate-50/30">
                                                <h4 className="font-extrabold text-2xl text-slate-900 mb-5">{t.title || 'Hành trình thay đổi'}</h4>
                                                <p className="text-base text-slate-600 font-medium leading-relaxed whitespace-pre-line">{t.story}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div id="review-form-section" className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Đánh giá từ Học viên</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-1">Khách hàng nói gì về {pt.fullName}?</p>
                                </div>
                                {hireStatus === 'COMPLETED' && !userReview && !showReviewForm && (
                                    <Button onClick={() => setShowReviewForm(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-bold h-11 px-6 shadow-sm">
                                        Viết đánh giá
                                    </Button>
                                )}
                            </div>

                            {showReviewForm && (
                                <Card className="p-8 bg-blue-50/50 border-blue-100 rounded-3xl mb-10 animate-fade-in shadow-inner">
                                    <h4 className="font-extrabold text-blue-900 mb-5">{reviewData.id ? 'Chỉnh sửa đánh giá' : 'Chia sẻ trải nghiệm của bạn'}</h4>
                                    <form onSubmit={handleSubmitReview} className="space-y-5">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 inline-block shadow-sm">
                                            {renderStars(reviewData.rating, true)}
                                        </div>
                                        <textarea
                                            value={reviewData.comment}
                                            onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                            className="w-full p-5 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white text-sm font-medium transition-all resize-none min-h-[120px]"
                                            placeholder="Huấn luyện viên này đã giúp bạn thay đổi thế nào? Sự tận tâm, kiến thức..."
                                            required
                                        />

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={reviewData.isAnonymous}
                                                        onChange={e => setReviewData({...reviewData, isAnonymous: e.target.checked})}
                                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Đánh giá ẩn danh</span>
                                                </label>

                                                <label className="cursor-pointer flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
                                                    <Camera className="w-5 h-5 text-slate-400" />
                                                    {reviewImage ? <span className="text-blue-600 truncate max-w-[150px]">{reviewImage.name}</span> : 'Đính kèm ảnh'}
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleReviewImageSelect} />
                                                </label>
                                            </div>

                                            {reviewImagePreview && (
                                                <div className="relative">
                                                    <img src={reviewImagePreview} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-slate-200 shadow-sm" />
                                                    <button type="button" onClick={() => {setReviewImage(null); setReviewImagePreview('');}} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 hover:bg-red-200">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200/60">
                                            <Button type="button" variant="ghost" onClick={resetReviewForm} className="text-slate-500 hover:bg-slate-100 rounded-xl font-bold h-11 px-6">Hủy</Button>
                                            <Button type="submit" disabled={submittingReview} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 h-11 px-8">
                                                {submittingReview ? 'Đang lưu...' : (reviewData.id ? 'Lưu Thay Đổi' : 'Gửi Đánh Giá')}
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            )}

                            <div className="space-y-6">
                                {reviews.length > 0 ? reviews.map(r => (
                                    <div key={r.id} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative group">

                                        {user?.id === r.reviewerId && !showReviewForm && (
                                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditClick(r)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-xl transition-colors border border-transparent hover:border-blue-100" title="Sửa đánh giá">
                                                    <Edit className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => promptDeleteReview(r.id)} className="text-red-500 bg-white hover:bg-red-50 p-2.5 rounded-xl transition-all shadow-sm border border-slate-100 hover:border-red-200" title="Xóa đánh giá">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5 pr-20">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black text-lg shadow-inner border border-slate-200/60">
                                                    {r.isAnonymous ? <EyeOff className="w-5 h-5 text-slate-400" /> : (r.reviewerName?.charAt(0) || 'U')}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                                                        {r.reviewerName}
                                                        {r.isAnonymous && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">Ẩn danh</span>}
                                                    </p>
                                                    <div className="text-xs font-semibold text-slate-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-1.5 mb-3">
                                                {renderStars(r.rating)}
                                            </div>
                                            <p className="text-slate-700 font-medium leading-relaxed text-sm whitespace-pre-line">{r.comment}</p>

                                            {r.imageUrl && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setLightboxImage(getFullImageUrl(r.imageUrl))}
                                                        className="block w-24 h-24 rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in hover:opacity-80 transition-opacity shadow-sm"
                                                    >
                                                        <img src={getFullImageUrl(r.imageUrl)} alt="Minh chứng" className="w-full h-full object-cover" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                            <MessageSquare className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-700">Chưa có đánh giá nào</h4>
                                        <p className="text-slate-500 font-medium mt-1 text-sm">Hãy là người đầu tiên để lại nhận xét cho PT này.</p>
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
                            onClick={() => setSelectedMode('OFFLINE')}
                            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${selectedMode === 'OFFLINE' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><MapPin className="h-5 w-5" /></div>
                                <div className="flex-1">
                                    <p className="font-black text-slate-900">Coaching offline</p>
                                    <p className="mt-1 text-sm text-slate-500">Tập trực tiếp{pt.location ? ` tại ${pt.location}` : ''}.</p>
                                    <p className="mt-2 font-black text-emerald-700">{Number(pt.offlineRate).toLocaleString('vi-VN')}đ / {RATE_UNIT_LABEL[pt.offlineRateUnit] || pt.offlineRateUnit}</p>
                                </div>
                            </div>
                        </button>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <Button variant="outline" onClick={() => setShowHireModal(false)} disabled={hiring}>Hủy</Button>
                        <Button onClick={handleHirePt} disabled={!selectedMode || hiring} className="bg-blue-600 hover:bg-blue-700">
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
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={closeDeleteModal}
                    ></div>

                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 relative z-10 border border-slate-100 flex flex-col max-h-[90vh]">
                        <div className="p-8 text-center overflow-y-auto">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-white shadow-sm">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">Xóa đánh giá này?</h3>
                            <p className="text-slate-500 font-medium text-base leading-relaxed px-4">
                                Hành động này không thể hoàn tác. Đánh giá của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.
                            </p>
                        </div>
                        <div className="flex bg-slate-50 p-6 gap-4 border-t border-slate-100 shrink-0">
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
