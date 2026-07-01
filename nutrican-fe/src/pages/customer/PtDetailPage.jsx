// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { Star, ShieldCheck, CheckCircle2, ArrowLeft, MessageSquare, Briefcase, Clock, Send } from 'lucide-react';
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

            // 1. Tải chi tiết PT
            const response = await marketplaceService.getPtDetail(id);
            const ptData = response.data.data;
            setPt(ptData);

            // Cập nhật trạng thái từ Backend trả về
            if (ptData.mappingStatus) {
                setHireStatus(ptData.mappingStatus);
            }

            // 2. Tải danh sách đánh giá
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

            // Tải lại reviews
            const revRes = await marketplaceService.getPtReviews(pt.userId, { page: 0, size: 10 });
            setReviews(revRes.data.data.content || []);
        } catch (err) {
            console.error(err);
            if(err.response?.data?.message) {
                toast.error(err.response.data.message);
            } else {
                toast.error('Không thể gửi đánh giá');
            }
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleHirePt = async () => {
        if (!user) {
            toast.error('Bạn cần đăng nhập để thuê Huấn luyện viên', {
                action: { label: 'Đăng nhập', onClick: () => navigate('/login') }
            });
            return;
        }

        try {
            setHiring(true);
            await marketplaceService.hirePt(pt.userId);

            setHireStatus('PENDING');
            toast.success('Đã gửi yêu cầu thuê PT!', {
                description: 'Vui lòng chờ Huấn luyện viên xác nhận.'
            });
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu';
            toast.error(errorMsg);

            // FIX LỖI: Nhận diện từ khóa Tiếng Việt từ Backend để set PENDING
            const lowerMsg = errorMsg.toLowerCase();
            if (lowerMsg.includes('đã gửi') || lowerMsg.includes('chờ') || lowerMsg.includes('liên kết')) {
                setHireStatus('PENDING');
            }
        } finally {
            setHiring(false);
        }
    };

    const renderStars = (rating, interactive = false) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} onClick={interactive ? () => setReviewData({ ...reviewData, rating: star }) : undefined} className={`w-5 h-5 ${interactive ? 'cursor-pointer' : ''} ${star <= (interactive ? reviewData.rating : rating) ? 'fill-amber-400 text-amber-500' : 'text-slate-200 transition-colors'}`} />
            ))}
        </div>
    );

    if (loading) return <div className="max-w-6xl mx-auto space-y-6 pb-12 p-4 mt-6"><Skeleton className="h-[400px] w-full rounded-3xl" /></div>;
    if (!pt) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-fade-in mt-6 px-4">
            <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 px-4 py-2 rounded-xl w-fit">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Trở lại danh sách PT
            </button>

            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl relative">
                <div className="h-48 md:h-64 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                </div>

                <CardContent className="p-8 pt-0 relative sm:flex gap-8">
                    <div className="-mt-20 relative inline-block shrink-0 flex-col items-center">
                        <div className="w-40 h-40 rounded-3xl bg-white p-2 shadow-xl relative z-10 mx-auto">
                            {pt.avatarUrl ? (
                                <img src={pt.avatarUrl} alt={pt.fullName} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black text-4xl">
                                    {pt.fullName.slice(0,2).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {pt.isVerified && (
                            <div className="absolute bottom-2 right-2 bg-white rounded-full p-1 z-20 shadow-md">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 fill-emerald-50" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 pt-6 sm:pt-8 flex flex-col justify-between">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{pt.fullName}</h1>
                                    {pt.tier === 'TIER_1' && (
                                        <span className="bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-1 rounded-lg flex items-center border border-blue-200">
                                            <ShieldCheck className="w-3 h-3 mr-1" /> CERTIFIED
                                        </span>
                                    )}
                                </div>
                                <p className="text-lg font-bold text-slate-500 flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-slate-400" /> {pt.specialty || 'Huấn luyện viên Cá nhân'}
                                </p>
                                <div className="flex items-center gap-2 mt-4 bg-slate-50 px-4 py-2 rounded-xl w-fit border border-slate-100">
                                    <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                                    <span className="text-lg font-black text-slate-800">{pt.rating ? pt.rating.toFixed(1) : '5.0'}</span>
                                    <span className="text-sm font-semibold text-slate-400">({pt.totalReviews || 0} Đánh giá)</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[200px]">
                                {/* LOGIC NÚT ACTION CHÍNH */}
                                {hireStatus === 'ACTIVE' ? (
                                    <Button
                                        onClick={() => navigate('/chat', { state: { targetPtId: pt.userId } })}
                                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all"
                                    >
                                        <MessageSquare className="w-5 h-5 mr-2" /> Nhắn tin ngay
                                    </Button>
                                ) : hireStatus === 'PENDING' ? (
                                    <Button
                                        disabled
                                        className="w-full h-14 bg-amber-100 text-amber-700 border-2 border-amber-200 text-lg font-bold rounded-2xl cursor-not-allowed opacity-100"
                                    >
                                        <Clock className="w-5 h-5 mr-2" /> Đang chờ duyệt
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleHirePt}
                                        disabled={hiring}
                                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-black rounded-2xl shadow-lg shadow-blue-500/30 transition-all group"
                                    >
                                        <Send className={`w-5 h-5 mr-2 ${hiring ? 'animate-pulse' : 'group-hover:translate-x-1 transition-transform'}`} />
                                        {hiring ? 'Đang gửi...' : 'Thuê PT Này'}
                                    </Button>
                                )}

                                {/* LOGIC UX MỚI: ẨN NÚT ĐÁNH GIÁ NẾU CHƯA THUÊ */}
                                {(hireStatus === 'ACTIVE' || hireStatus === 'INACTIVE') && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowReviewForm(!showReviewForm)}
                                        className="w-full h-12 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50"
                                    >
                                        Viết Đánh Giá
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 border-t border-slate-100 pt-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Giới thiệu</h3>
                            <p className="text-slate-700 font-medium leading-relaxed max-w-3xl text-lg">
                                {pt.bio || 'Một huấn luyện viên tận tâm với mục tiêu giúp bạn đạt được vóc dáng mơ ước thông qua chế độ ăn uống khoa học và bài tập phù hợp.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {showReviewForm && (
                <Card className="p-8 bg-slate-50 border-slate-200 rounded-3xl animate-in slide-in-from-top-4 fade-in">
                    <h3 className="text-xl font-black text-slate-800 mb-6">Chia sẻ trải nghiệm của bạn</h3>
                    <form onSubmit={handleSubmitReview} className="space-y-6">
                        <div>
                            <label className="text-sm font-black text-slate-400 uppercase tracking-widest block mb-3">Chất lượng PT</label>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 inline-block shadow-sm">
                                {renderStars(reviewData.rating, true)}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-black text-slate-400 uppercase tracking-widest block mb-3">Nhận xét chi tiết</label>
                            <textarea
                                value={reviewData.comment}
                                onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                                className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium text-slate-700 bg-white"
                                rows="4"
                                placeholder="Huấn luyện viên này đã giúp bạn thay đổi như thế nào?..."
                                required
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button type="submit" disabled={submittingReview} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold px-8 h-12">
                                {submittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)} className="rounded-xl font-bold h-12 border-slate-200 text-slate-600 bg-white hover:bg-slate-50">
                                Hủy
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="p-8 rounded-3xl bg-white shadow-sm border-slate-200">
                <h3 className="text-2xl font-black text-slate-900 mb-8">Đánh giá từ Học viên</h3>
                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold">Chưa có đánh giá nào.</p>
                        <p className="text-slate-400 text-sm mt-1">Hãy là người đầu tiên để lại nhận xét!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {reviews.map(rev => (
                            <div key={rev.id} className="border border-slate-100 p-6 rounded-2xl bg-white shadow-sm">
                                <div className="flex gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-black flex items-center justify-center text-lg border border-slate-200/60 shadow-sm">
                                        {rev.reviewerName?.slice(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-lg">{rev.reviewerName}</p>
                                        <div className="mt-1">
                                            {renderStars(rev.rating)}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl text-[15px]">
                                    "{rev.comment}"
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}