import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Star, MessageSquareQuote, ThumbsUp, ImageIcon, EyeOff, Calendar } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import ImageLightbox from '../../components/common/ImageLightbox';

const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    return `${minioUrl}/${url}`;
};

export default function PtRatingsPage() {
    const { user } = useAuthStore();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightboxImage, setLightboxImage] = useState('');
    const [timeFilter, setTimeFilter] = useState('ALL');

    useEffect(() => {
        const fetchReviews = async () => {
            if (!user?.id) return;
            try {
                setLoading(true);
                const res = await marketplaceService.getPtReviews(user.id, { page: 0, size: 100 });
                setReviews(res.data?.data?.content || []);
            } catch (error) {
                console.error(error);
                toast.error('Không thể tải dữ liệu đánh giá');
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, [user?.id]);

    const filteredReviews = useMemo(() => {
        const now = new Date();
        return reviews.filter(r => {
            if (timeFilter === 'ALL') return true;
            const rDate = new Date(r.createdAt);
            if (timeFilter === 'MONTH') {
                return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
            }
            if (timeFilter === 'YEAR') {
                return rDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [reviews, timeFilter]);

    const stats = useMemo(() => {
        const total = filteredReviews.length;
        if (total === 0) return { average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

        let sum = 0;
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        filteredReviews.forEach(r => {
            const star = Math.round(r.rating) || 0;
            sum += r.rating;
            if (dist[star] !== undefined) dist[star] += 1;
        });

        return {
            average: (sum / total).toFixed(1),
            total,
            distribution: dist
        };
    }, [filteredReviews]);

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'HV';

    return (
        <div className="max-w-[1200px] mx-auto space-y-8 pb-12 animate-fade-in mt-6 px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Đánh giá từ Học viên</h1>
                    <p className="text-slate-500 mt-1 font-medium">Báo cáo chi tiết phản hồi và mức độ hài lòng của khách hàng.</p>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-700 outline-none pr-4 py-1 cursor-pointer"
                    >
                        <option value="ALL">Tất cả thời gian</option>
                        <option value="MONTH">Tháng này</option>
                        <option value="YEAR">Năm nay</option>
                    </select>
                </div>
            </div>


            <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                <div className="flex flex-col lg:flex-row">

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 lg:w-1/3 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-amber-100">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-amber-500 mb-4">
                            <ThumbsUp className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-black text-amber-700/60 uppercase tracking-widest mb-1">Điểm trung bình</p>
                        <h2 className="text-6xl font-black text-amber-900 mb-2">{stats.average}</h2>
                        <div className="flex text-amber-400 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`w-5 h-5 ${star <= Math.round(stats.average) ? 'fill-current' : 'text-amber-200'}`} />
                            ))}
                        </div>
                        <p className="text-sm font-bold text-amber-800 bg-white/60 px-3 py-1 rounded-lg">Dựa trên {stats.total} đánh giá</p>
                    </div>


                    <div className="p-8 lg:w-2/3 flex flex-col justify-center space-y-3">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = stats.distribution[star];
                            const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                            return (
                                <div key={star} className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 w-12 shrink-0">
                                        <span className="text-sm font-black text-slate-700">{star}</span>
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                    </div>
                                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-12 shrink-0 text-right">
                                        <span className="text-xs font-bold text-slate-500">{percentage}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>


            <div className="space-y-4">
                {loading ? (
                    [1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-3xl bg-slate-200" />)
                ) : filteredReviews.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                        <MessageSquareQuote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">Không có dữ liệu</h3>
                        <p className="text-slate-500 mt-2 font-medium">Chưa có đánh giá nào trong khoảng thời gian này.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {filteredReviews.map((review) => (
                            <Card key={review.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shadow-sm border border-slate-200">
                                                    {getInitials(review.reviewerName)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                                        {review.reviewerName || 'Học viên ẩn danh'}
                                                        {review.isAnonymous && (
                                                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"><EyeOff className="w-3 h-3"/> Ẩn danh</span>
                                                        )}
                                                    </h4>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Gần đây'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 text-amber-400 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                                                <span className="text-sm font-black text-amber-700 mr-1">{review.rating}</span>
                                                <Star className="w-4 h-4 fill-current" />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                                            <MessageSquareQuote className="absolute top-4 right-4 w-6 h-6 text-slate-200" />
                                            <p className="text-sm text-slate-700 font-medium leading-relaxed relative z-10 whitespace-pre-line">
                                                {review.comment || <span className="italic opacity-60">Không có bình luận.</span>}
                                            </p>
                                        </div>
                                    </div>


                                    {review.imageUrl && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center gap-3">
                                            <ImageIcon className="w-5 h-5 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ảnh đính kèm:</span>
                                            <button
                                                onClick={() => setLightboxImage(getFullImageUrl(review.imageUrl))}
                                                className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden hover:opacity-80 transition-opacity cursor-zoom-in"
                                            >
                                                <img src={getFullImageUrl(review.imageUrl)} alt="Review evidence" className="w-full h-full object-cover" />
                                            </button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <ImageLightbox
                isOpen={!!lightboxImage}
                imageUrl={lightboxImage}
                onClose={() => setLightboxImage('')}
            />
        </div>
    );
}