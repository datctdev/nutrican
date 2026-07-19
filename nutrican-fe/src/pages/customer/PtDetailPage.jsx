import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { Star, ShieldCheck, CheckCircle2, ArrowLeft, MessageSquare, Briefcase, Clock, Send, Award, ExternalLink, Quote } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

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
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-500' : 'text-slate-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                        onClick={() => interactive && setReviewData({ ...reviewData, rating: star })}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-pulse">
                <Skeleton className="h-64 w-full rounded-3xl" />
                <div className="flex gap-8">
                    <Skeleton className="w-1/3 h-96 rounded-3xl" />
                    <Skeleton className="w-2/3 h-96 rounded-3xl" />
                </div>
            </div>
        );
    }

    if (!pt) return null;

    const showcase = pt.portfolioShowcase || {};
    const transformations = showcase.transformations || [];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* HERO SECTION - Kéo dài hết màn hình */}
            <div className="relative h-[350px] md:h-[450px] w-full bg-gradient-to-r from-slate-900 to-slate-800 overflow-hidden">
                <img src={showcase.coverPhotoUrl || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop"} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />

                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full backdrop-blur-md transition-all">
                    <ArrowLeft className="w-5 h-5" /> Quay lại
                </button>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* CỘT TRÁI: PROFILE CARD */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white/80 backdrop-blur-xl">
                            <CardContent className="p-8 text-center relative">
                                <div className="w-40 h-40 mx-auto rounded-full border-4 border-white shadow-2xl overflow-hidden relative -mt-24 mb-6 bg-white">
                                    <img src={pt.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pt.fullName)}&size=160&background=random`} alt={pt.fullName} className="w-full h-full object-cover" />
                                </div>
                                {pt.isVerified && (
                                    <div className="absolute top-24 right-1/4 bg-white rounded-full p-0.5 shadow-md">
                                        <CheckCircle2 className="w-8 h-8 text-blue-500 fill-blue-50" />
                                    </div>
                                )}

                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{pt.fullName}</h1>
                                <p className="text-lg font-bold text-slate-500 mt-2 flex items-center justify-center gap-2">
                                    <Briefcase className="w-5 h-5" /> {pt.specialty || 'Huấn luyện viên'}
                                </p>

                                <div className="flex items-center justify-center gap-2 mt-4">
                                    <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
                                    <span className="text-2xl font-black text-slate-800">{pt.rating ? pt.rating.toFixed(1) : '5.0'}</span>
                                    <span className="text-sm font-semibold text-slate-400">({pt.totalReviews || 0} Đánh giá)</span>
                                </div>

                                <div className="mt-8 space-y-3">
                                    {hireStatus === 'ACTIVE' ? (
                                        <Button onClick={() => navigate('/chat', { state: { targetPtId: pt.userId } })} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all">
                                            <MessageSquare className="w-5 h-5 mr-2" /> Nhắn tin ngay
                                        </Button>
                                    ) : hireStatus === 'PENDING' ? (
                                        <Button disabled className="w-full h-14 bg-amber-100 text-amber-700 border-2 border-amber-200 text-lg font-bold rounded-2xl cursor-not-allowed">
                                            <Clock className="w-5 h-5 mr-2" /> Đang chờ duyệt
                                        </Button>
                                    ) : (
                                        <Button onClick={handleHirePt} disabled={hiring} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-black rounded-2xl shadow-lg shadow-blue-500/30 transition-all group">
                                            <Send className={`w-5 h-5 mr-2 ${hiring ? 'animate-pulse' : 'group-hover:translate-x-1 transition-transform'}`} />
                                            {hiring ? 'Đang gửi...' : 'Đăng ký Tập'}
                                        </Button>
                                    )}
                                </div>

                                {/* Social Links */}
                                <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-slate-100">
                                    {pt.instagramUrl && (
                                        <a href={pt.instagramUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-100 transition-colors">
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
                                    {pt.linkedinUrl && (
                                        <a href={pt.linkedinUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CỘT PHẢI: NỘI DUNG PORTFOLIO */}
                    <div className="lg:col-span-2 space-y-8 mt-12 lg:mt-0">
                        {/* Triết lý huấn luyện */}
                        {pt.trainingPhilosophy && (
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 text-slate-100 group-hover:text-blue-50 transition-colors">
                                    <Quote className="w-48 h-48 rotate-180" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-4 relative z-10">Triết lý của tôi</h3>
                                <p className="text-slate-600 font-medium text-lg leading-relaxed relative z-10 italic">"{pt.trainingPhilosophy}"</p>
                            </div>
                        )}

                        {/* Giới thiệu */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-black text-slate-800 mb-4">Về bản thân</h3>
                            <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{pt.bio}</p>
                        </div>

                        {/* Transformation Gallery */}
                        {transformations.length > 0 && (
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Award className="w-6 h-6 text-amber-500" /> Kết quả Học viên (Before & After)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {transformations.map(t => (
                                        <div key={t.id} className="rounded-2xl border border-slate-100 overflow-hidden group">
                                            <div className="relative h-48 w-full overflow-hidden flex">
                                                <div className="w-1/2 h-full border-r-2 border-white relative">
                                                    <img src={t.beforeUrl} alt="Before" className="w-full h-full object-cover" />
                                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded">BEFORE</div>
                                                </div>
                                                <div className="w-1/2 h-full relative">
                                                    <img src={t.afterUrl} alt="After" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    <div className="absolute bottom-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded">AFTER</div>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50">
                                                <h4 className="font-bold text-slate-800">{t.title}</h4>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{t.story}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Đánh giá */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-slate-800">Đánh giá từ Học viên</h3>
                                {(hireStatus === 'ACTIVE' || hireStatus === 'INACTIVE') && !showReviewForm && (
                                    <Button onClick={() => setShowReviewForm(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-bold">
                                        Viết đánh giá
                                    </Button>
                                )}
                            </div>

                            {showReviewForm && (
                                <Card className="p-6 bg-slate-50 border-slate-200 rounded-2xl mb-8 animate-in slide-in-from-top-4 fade-in">
                                    <h4 className="font-bold text-slate-800 mb-4">Trải nghiệm của bạn</h4>
                                    <form onSubmit={handleSubmitReview} className="space-y-4">
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 inline-block">
                                            {renderStars(reviewData.rating, true)}
                                        </div>
                                        <textarea
                                            value={reviewData.comment}
                                            onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                            className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white text-sm"
                                            rows="3"
                                            placeholder="Huấn luyện viên này đã giúp bạn thay đổi thế nào?"
                                            required
                                        />
                                        <div className="flex gap-3 justify-end">
                                            <Button type="button" variant="ghost" onClick={() => setShowReviewForm(false)} className="text-slate-500 rounded-xl">Hủy</Button>
                                            <Button type="submit" disabled={submittingReview} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                                {submittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            )}

                            <div className="space-y-6">
                                {reviews.length > 0 ? reviews.map(r => (
                                    <div key={r.id} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                    {r.reviewerName?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{r.reviewerName || 'Ẩn danh'}</p>
                                                    <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</div>
                                                </div>
                                            </div>
                                            {renderStars(r.rating)}
                                        </div>
                                        <p className="text-slate-600 leading-relaxed text-sm">{r.comment}</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        Chưa có đánh giá nào
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