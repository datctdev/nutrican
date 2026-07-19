// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { Star, CheckCircle2, ArrowLeft, MessageSquare, Briefcase, Clock, Send, Award, ExternalLink, Quote, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

// Hàm dọn dẹp Link ảnh để không bị lỗi hết hạn chữ ký
const getPermanentUrl = (url) => {
    if (!url) return '';
    return url.split('?')[0];
};

// SVG Icon tự custom để không bị lỗi thư viện cũ
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
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);

    const [hireStatus, setHireStatus] = useState('NONE');
    const [hiring, setHiring] = useState(false);

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
            console.error(err);
            toast.error('Không thể tải thông tin PT');
            navigate('/marketplace');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        try {
            setSubmittingReview(true);
            await marketplaceService.createReview(pt.userId, reviewData);
            toast.success('Đã gửi đánh giá thành công!');
            setShowReviewForm(false);
            setReviewData({ rating: 5, comment: '' });

            const revRes = await marketplaceService.getPtReviews(pt.userId, { page: 0, size: 10 });
            setReviews(revRes.data.data.content || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể gửi đánh giá');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleHirePt = async () => {
        if (!user) {
            toast.error('Bạn cần đăng nhập để thuê Huấn luyện viên');
            return;
        }

        try {
            setHiring(true);
            await marketplaceService.hirePt(pt.userId);
            setHireStatus('PENDING');
            toast.success('Đã gửi yêu cầu thuê PT!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi thuê PT');
        } finally {
            setHiring(false);
        }
    };

    const renderStars = (rating, interactive = false) => {
        return (
            <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-500 drop-shadow-sm' : 'fill-slate-100 text-slate-200'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
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

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24 animate-fade-in">
            {/* HERO SECTION */}
            <div className="relative h-[320px] md:h-[400px] w-full bg-slate-900 overflow-hidden">
                <img src={coverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent"></div>

                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white hover:text-white bg-black/30 hover:bg-black/50 px-5 py-2.5 rounded-full backdrop-blur-md transition-all font-bold border border-white/20 shadow-sm">
                    <ArrowLeft className="w-4 h-4" /> Trở lại
                </button>
            </div>

            {/* CONTAINER CHÍNH */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

                    {/* CỘT TRÁI: PROFILE CARD */}
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
                                    {hireStatus === 'ACTIVE' ? (
                                        <Button onClick={() => navigate('/chat', { state: { targetPtId: pt.userId } })} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                                            <MessageSquare className="w-4 h-4 mr-2" /> Nhắn tin ngay
                                        </Button>
                                    ) : hireStatus === 'PENDING' ? (
                                        <Button disabled className="w-full h-12 bg-amber-100 text-amber-700 border-2 border-amber-200 text-base font-bold rounded-xl cursor-not-allowed">
                                            <Clock className="w-4 h-4 mr-2" /> Đang chờ duyệt
                                        </Button>
                                    ) : (
                                        <Button onClick={handleHirePt} disabled={hiring} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all group hover:-translate-y-0.5">
                                            <Send className={`w-4 h-4 mr-2 ${hiring ? 'animate-pulse' : 'group-hover:translate-x-1 transition-transform'}`} />
                                            {hiring ? 'Đang gửi...' : 'Đăng ký Tập'}
                                        </Button>
                                    )}
                                </div>

                                {/* Social Links */}
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

                    {/* CỘT PHẢI: NỘI DUNG PORTFOLIO */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-8 lg:mt-16">

                        {/* Triết lý huấn luyện */}
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

                        {/* Giới thiệu (Bio) */}
                        {pt.bio && (
                            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <UserCircle className="w-6 h-6 text-blue-500" /> Về bản thân
                                </h3>
                                <p className="text-slate-600 font-medium text-base leading-loose whitespace-pre-wrap">{pt.bio}</p>
                            </div>
                        )}

                        {/* Transformation Gallery - LỖI ĐÃ FIX: 1 Cột, Ảnh Trên, Chữ Dưới */}
                        {transformations.length > 0 && (
                            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                                    <Award className="w-6 h-6 text-amber-500" /> Kết quả Học viên (Before & After)
                                </h3>

                                <div className="grid grid-cols-1 gap-10">
                                    {transformations.map((t, idx) => (
                                        <div key={t.id || idx} className="rounded-[2rem] border border-slate-100 overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300 bg-white flex flex-col">

                                            {/* KHỐI ẢNH - NẰM TRÊN, CỐ ĐỊNH CHIỀU CAO ĐỂ KHÔNG BỊ KÉO GIÃN */}
                                            <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] flex shrink-0 bg-slate-100 overflow-hidden">
                                                {/* Before */}
                                                <div className="w-1/2 h-full border-r-[2px] border-white relative z-10">
                                                    {t.beforeUrl ? (
                                                        <img src={getPermanentUrl(t.beforeUrl)} alt="Before" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">No Image</div>
                                                    )}
                                                    <div className="absolute bottom-4 left-4 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">Before</div>
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

                                            {/* KHỐI CHỮ - NẰM DƯỚI, TỰ DO CO GIÃN THEO ĐỘ DÀI TEXT */}
                                            <div className="p-8 sm:p-10 flex flex-col bg-slate-50/30">
                                                <h4 className="font-extrabold text-2xl text-slate-900 mb-5">{t.title || 'Hành trình thay đổi'}</h4>
                                                <p className="text-base text-slate-600 font-medium leading-relaxed whitespace-pre-line">{t.story}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Đánh giá (Reviews) */}
                        <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Đánh giá từ Học viên</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-1">Khách hàng nói gì về {pt.fullName}?</p>
                                </div>
                                {(hireStatus === 'ACTIVE' || hireStatus === 'INACTIVE') && !showReviewForm && (
                                    <Button onClick={() => setShowReviewForm(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-bold h-11 px-6 shadow-sm">
                                        Viết đánh giá
                                    </Button>
                                )}
                            </div>

                            {/* Form Review */}
                            {showReviewForm && (
                                <Card className="p-8 bg-blue-50/50 border-blue-100 rounded-3xl mb-10 animate-fade-in shadow-inner">
                                    <h4 className="font-extrabold text-blue-900 mb-5">Chia sẻ trải nghiệm của bạn</h4>
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
                                        <div className="flex gap-3 justify-end pt-2">
                                            <Button type="button" variant="ghost" onClick={() => setShowReviewForm(false)} className="text-slate-500 hover:bg-slate-100 rounded-xl font-bold h-11 px-6">Hủy</Button>
                                            <Button type="submit" disabled={submittingReview} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 h-11 px-8">
                                                {submittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            )}

                            {/* List Reviews */}
                            <div className="space-y-6">
                                {reviews.length > 0 ? reviews.map(r => (
                                    <div key={r.id} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black text-lg shadow-inner border border-slate-200/60">
                                                    {r.reviewerName?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-slate-800 text-base">{r.reviewerName || 'Học viên ẩn danh'}</p>
                                                    <div className="text-xs font-semibold text-slate-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                </div>
                                            </div>
                                            <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 w-fit">
                                                {renderStars(r.rating)}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <p className="text-slate-700 font-medium leading-relaxed text-sm">{r.comment}</p>
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
        </div>
    );
}