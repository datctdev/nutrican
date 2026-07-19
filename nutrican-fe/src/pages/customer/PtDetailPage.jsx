// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { Star, ShieldCheck, CheckCircle2, ArrowLeft, MessageSquare, Briefcase, Clock, Send, EyeOff, ImageIcon, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ImageLightbox from '../../components/common/ImageLightbox';
import Modal from '../../components/common/Modal'; // Đảm bảo đã import Modal

const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    return `${minioUrl}/${url}`;
};

export default function PtDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [pt, setPt] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    // Review Modal States (Create/Edit)
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '', isAnonymous: false });
    const [reviewImage, setReviewImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Edit State
    const [editingReviewId, setEditingReviewId] = useState(null);

    // Delete Modal States (Giao diện xóa đánh giá mới)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingReview, setDeletingReview] = useState(false);

    const [lightboxImage, setLightboxImage] = useState('');
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
                const revRes = await marketplaceService.getPtReviews(ptData.userId, { page: 0, size: 50 });
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

    const myReview = useMemo(() => {
        if (!user || !reviews.length) return null;
        return reviews.find(r => r.reviewerId === user.id);
    }, [reviews, user]);

    const otherReviews = useMemo(() => {
        if (!user) return reviews;
        return reviews.filter(r => r.reviewerId !== user.id);
    }, [reviews, user]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB');
                return;
            }
            setReviewImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const openCreateModal = () => {
        setReviewData({ rating: 5, comment: '', isAnonymous: false });
        setReviewImage(null);
        setImagePreview('');
        setEditingReviewId(null);
        setIsReviewModalOpen(true);
    };

    const openEditModal = () => {
        if (!myReview) return;
        setReviewData({
            rating: myReview.rating,
            comment: myReview.comment || '',
            isAnonymous: myReview.isAnonymous
        });
        setReviewImage(null);
        setImagePreview(myReview.imageUrl ? getFullImageUrl(myReview.imageUrl) : '');
        setEditingReviewId(myReview.id);
        setIsReviewModalOpen(true);
    };

    // LOGIC THỰC THI XÓA ĐÁNH GIÁ MỚI
    const executeDeleteReview = async () => {
        if (!myReview) return;

        try {
            setDeletingReview(true);
            await marketplaceService.deleteReview(pt.userId, myReview.id);
            toast.success('Đã xóa đánh giá thành công!');

            // Đóng modal xóa
            setIsDeleteModalOpen(false);

            // Cập nhật lại data PT và Reviews
            const [ptRes, revRes] = await Promise.all([
                marketplaceService.getPtDetail(id),
                marketplaceService.getPtReviews(pt.userId, { page: 0, size: 50 })
            ]);
            setPt(ptRes.data.data);
            setReviews(revRes.data.data.content || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa đánh giá');
        } finally {
            setDeletingReview(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        try {
            setSubmittingReview(true);

            if (editingReviewId) {
                await marketplaceService.updateReview(pt.userId, editingReviewId, reviewData, reviewImage);
                toast.success('Đã cập nhật đánh giá thành công!');
            } else {
                await marketplaceService.createReview(pt.userId, reviewData, reviewImage);
                toast.success('Đã gửi đánh giá thành công!');
            }

            setIsReviewModalOpen(false);

            const [ptRes, revRes] = await Promise.all([
                marketplaceService.getPtDetail(id),
                marketplaceService.getPtReviews(pt.userId, { page: 0, size: 50 })
            ]);
            setPt(ptRes.data.data);
            setReviews(revRes.data.data.content || []);

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Không thể thao tác');
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
            toast.success('Đã gửi yêu cầu thuê PT!');
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu';
            toast.error(errorMsg);
            if (errorMsg.toLowerCase().includes('đã gửi') || errorMsg.toLowerCase().includes('chờ') || errorMsg.toLowerCase().includes('liên kết')) {
                setHireStatus('PENDING');
            }
        } finally {
            setHiring(false);
        }
    };

    const renderStars = (rating, interactive = false) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    onClick={interactive ? () => setReviewData({ ...reviewData, rating: star }) : undefined}
                    className={`w-6 h-6 ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${star <= (interactive ? reviewData.rating : rating) ? 'fill-amber-400 text-amber-500 drop-shadow-sm' : 'text-slate-200 transition-colors'}`}
                />
            ))}
        </div>
    );

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'HV';

    const ReviewCard = ({ rev, isMine }) => (
        <div className={`p-6 rounded-3xl transition-all ${isMine ? 'bg-blue-50/50 border-2 border-blue-200 shadow-md' : 'bg-white border border-slate-100 shadow-sm hover:shadow-md'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full font-black flex items-center justify-center text-lg shadow-sm shrink-0 border ${isMine ? 'bg-blue-600 text-white border-blue-700' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border-slate-200/60'}`}>
                        {rev.isAnonymous && !isMine ? <EyeOff className="w-5 h-5 opacity-70"/> : getInitials(rev.reviewerName)}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-lg flex items-center gap-2">
                            {isMine ? 'Đánh giá của bạn' : rev.reviewerName}
                            {rev.isAnonymous && <span className="text-[10px] bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold"><EyeOff className="w-3 h-3"/> Ẩn danh</span>}
                        </p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">
                            {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN', {year:'numeric', month:'long', day:'numeric'}) : ''}
                            {isMine && editingReviewId === rev.id && ' (Đã chỉnh sửa)'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                    <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 h-fit w-fit">
                        <span className="text-sm font-black text-amber-700 mr-1">{rev.rating}</span>
                        <Star className="w-4 h-4 fill-current text-amber-500" />
                    </div>
                    {isMine && (
                        <div className="flex gap-2 mt-1">
                            <button onClick={openEditModal} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-100/50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                                <Edit3 className="w-3 h-3" /> Sửa
                            </button>
                            {/* MỞ MODAL XÓA THAY VÌ CONFIRM CỦA TRÌNH DUYỆT */}
                            <button onClick={() => setIsDeleteModalOpen(true)} className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors">
                                <Trash2 className="w-3 h-3" /> Xóa
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`p-4 rounded-2xl border font-medium leading-relaxed text-[15px] ${isMine ? 'bg-white border-blue-100 text-blue-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                "{rev.comment || 'Không có bình luận.'}"
            </div>

            {rev.imageUrl && (
                <div className="mt-4">
                    <button
                        onClick={() => setLightboxImage(getFullImageUrl(rev.imageUrl))}
                        className="h-24 w-24 rounded-2xl border border-slate-200 overflow-hidden hover:opacity-85 transition-opacity shadow-sm cursor-zoom-in"
                    >
                        <img src={getFullImageUrl(rev.imageUrl)} alt="Evidence" className="w-full h-full object-cover" />
                    </button>
                </div>
            )}
        </div>
    );

    if (loading) return <div className="max-w-6xl mx-auto space-y-6 pb-12 p-4 mt-6"><Skeleton className="h-[400px] w-full rounded-3xl" /></div>;
    if (!pt) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-fade-in mt-6 px-4">
            <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 px-4 py-2 rounded-xl w-fit">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Trở lại
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
                                            <ShieldCheck className="w-3 h-3 mr-1" /> ĐÃ XÁC THỰC
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
                                ) : hireStatus === 'COMPLETED' ? (
                                    <Button
                                        disabled
                                        className="w-full h-14 bg-slate-100 text-slate-500 border border-slate-200 text-lg font-bold rounded-2xl cursor-not-allowed opacity-100"
                                    >
                                        Đã kết thúc khóa học
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

                                {hireStatus === 'COMPLETED' && !myReview && (
                                    <Button
                                        variant="outline"
                                        onClick={openCreateModal}
                                        className="w-full h-12 border-amber-200 text-amber-700 font-bold rounded-2xl hover:bg-amber-50 shadow-sm"
                                    >
                                        <Star className="w-4 h-4 mr-2 text-amber-500"/> Viết Đánh Giá
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

            <Card className="p-8 rounded-3xl bg-white shadow-sm border-slate-200">
                <h3 className="text-2xl font-black text-slate-900 mb-8">Đánh giá từ Học viên</h3>
                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold">Chưa có đánh giá nào.</p>
                        <p className="text-slate-400 text-sm mt-1">Các đánh giá của học viên sau khi kết thúc khóa sẽ hiển thị tại đây.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {myReview && <ReviewCard rev={myReview} isMine={true} />}
                        {otherReviews.map(rev => <ReviewCard key={rev.id} rev={rev} isMine={false} />)}
                    </div>
                )}
            </Card>

            {/* MODAL TẠO/SỬA ĐÁNH GIÁ */}
            <Modal
                isOpen={isReviewModalOpen}
                onClose={() => !submittingReview && setIsReviewModalOpen(false)}
                title={editingReviewId ? "Sửa đánh giá của bạn" : "Chia sẻ trải nghiệm của bạn"}
            >
                <form onSubmit={handleSubmitReview} className="space-y-6 mt-4">
                    <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Chất lượng PT</label>
                        {renderStars(reviewData.rating, true)}
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">Nhận xét chi tiết</label>
                        <textarea
                            value={reviewData.comment}
                            onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                            className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium text-slate-700 bg-slate-50 focus:bg-white transition-all"
                            rows="4"
                            placeholder="Huấn luyện viên này đã giúp bạn thay đổi như thế nào? (Kinh nghiệm, thực đơn, sự tận tâm...)"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <div>
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Đính kèm ảnh minh chứng</label>
                            <div className="flex items-center gap-3">
                                <label className="cursor-pointer bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
                                    <ImageIcon className="w-4 h-4"/> {imagePreview ? 'Đổi Ảnh' : 'Chọn Ảnh'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                                {imagePreview && (
                                    <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" />
                                )}
                            </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto mt-2 sm:mt-0">
                            <input
                                type="checkbox"
                                checked={reviewData.isAnonymous}
                                onChange={(e) => setReviewData({...reviewData, isAnonymous: e.target.checked})}
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                            />
                            <div>
                                <span className="text-sm font-bold text-slate-800 block">Đánh giá ẩn danh</span>
                                <span className="text-[10px] text-slate-500">Tên của bạn sẽ được ẩn đi.</span>
                            </div>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => setIsReviewModalOpen(false)} className="flex-1 rounded-xl font-bold h-12 border-slate-200 text-slate-600 bg-white hover:bg-slate-50">
                            Hủy
                        </Button>
                        <Button type="submit" disabled={submittingReview} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-12 shadow-md shadow-blue-500/20">
                            {submittingReview ? 'Đang lưu...' : 'Lưu Đánh Giá'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL XÓA ĐÁNH GIÁ (GIAO DIỆN MỚI THAY CHO ALERT) */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => !deletingReview && setIsDeleteModalOpen(false)}
                title={
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        Xác nhận xóa đánh giá
                    </div>
                }
            >
                <div className="space-y-4 mt-2">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác, nhưng bạn có thể viết lại đánh giá mới sau đó.
                    </p>
                    <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={deletingReview}
                            className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600 bg-white hover:bg-slate-50 h-11"
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="button"
                            onClick={executeDeleteReview}
                            disabled={deletingReview}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-500/20 h-11"
                        >
                            {deletingReview ? 'Đang xóa...' : 'Xóa Đánh Giá'}
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