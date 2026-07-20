// src/pages/customer/MarketplacePage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { marketplaceService } from '../../services/marketplaceService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { useAuthStore } from '../../stores/authStore';
import { Search, Star, CheckCircle2, ChevronRight, Award, ShieldCheck, Clock, UserCheck, StarHalf } from 'lucide-react';

export default function MarketplacePage() {
    const { user, isAuthenticated } = useAuthStore();

    const [pts, setPts] = useState([]);
    const [coachingHistory, setCoachingHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [goalFilter, setGoalFilter] = useState('');
    const [sortMode, setSortMode] = useState('tier');

    useEffect(() => {
        fetchPts();
    }, [page, goalFilter, sortMode]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'CUSTOMER') {
            fetchCoachingHistory();
        }
    }, [isAuthenticated, user]);

    const fetchPts = async (searchTerm = search) => {
        try {
            setLoading(true);
            const params = { page, size: 12, verifiedOnly: true, sort: sortMode };
            if (goalFilter) params.goalFilter = goalFilter;
            if (searchTerm) params.search = searchTerm;
            const response = await marketplaceService.getPts(params);
            setPts(response.data.data.content || []);
            setTotalPages(response.data.data.totalPages);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoachingHistory = async () => {
        try {
            setHistoryLoading(true);
            const res = await profileExtensionsService.getCoachingHistory();
            // Lọc ra các PT đã COMPLETED để hiển thị phần Đánh giá
            const completedHistory = (res.data?.data || []).filter(h => h.status === 'COMPLETED');
            setCoachingHistory(completedHistory);
        } catch (err) {
            console.error("Lỗi lấy lịch sử coaching:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0);
        fetchPts(search);
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-12 animate-fade-in">

            {/* Hero Search Section */}
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-10 md:p-16 text-center shadow-lg relative overflow-hidden mt-6 mx-4 md:mx-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 max-w-2xl mx-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-blue-200 border border-white/20 mb-6">
            <Award className="w-3 h-3 mr-1.5"/> Top 1% PT Chuyên Nghiệp
          </span>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Tìm Huấn Luyện Viên Phù Hợp</h1>
                    <form onSubmit={handleSearch} className="flex bg-white rounded-2xl p-2 shadow-2xl focus-within:ring-4 focus-within:ring-blue-500/30 transition-all">
                        <div className="flex-1 flex items-center px-4">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên, chuyên môn..."
                                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 px-3 outline-none font-medium text-sm md:text-base"
                                value={search} onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 md:px-8 h-12 shadow-sm font-bold">Tìm kiếm</Button>
                    </form>
                </div>
            </div>

            <div className="px-4 md:px-0">
                {/* PHÂN HỆ: PT ĐÃ ĐỒNG HÀNH (Chỉ hiện khi có dữ liệu) */}
                {!historyLoading && coachingHistory.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6 px-2">
                            <UserCheck className="w-7 h-7 text-emerald-600" />
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">PT bạn đã đồng hành</h2>
                                <p className="text-sm font-medium text-slate-500">Các huấn luyện viên bạn đã hoàn thành khóa học.</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {coachingHistory.map((history) => (
                                <Card key={history.mappingId} className="bg-white border-emerald-100 shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl border border-emerald-100 shrink-0">
                                                {history.ptAvatarUrl ? (
                                                    <img src={history.ptAvatarUrl} alt={history.ptName} className="w-full h-full rounded-full object-cover" />
                                                ) : getInitials(history.ptName)}
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-lg text-slate-900 line-clamp-1">{history.ptName}</h3>
                                                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3"/> Kết thúc: {new Date(history.completedAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {/* FIX URL TẠI ĐÂY NỮA */}
                                            <Link to={`/pt-profile/${history.ptProfileId}`} className="flex-1">
                                                <Button
                                                    className={`w-full rounded-xl font-bold shadow-sm h-11 ${
                                                        history.hasReviewed
                                                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                                    }`}
                                                >
                                                    {history.hasReviewed ? (
                                                        <><Star className="w-4 h-4 mr-1.5 fill-amber-500 text-amber-500"/> Sửa Đánh Giá</>
                                                    ) : (
                                                        <><StarHalf className="w-4 h-4 mr-1.5"/> Đánh giá ngay</>
                                                    )}
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* PHÂN HỆ: TÌM KIẾM CHUNG */}
                <div className="flex flex-wrap justify-between items-end gap-4 mb-6 px-2 border-t border-slate-100 pt-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Huấn luyện viên nổi bật</h2>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Khám phá các chuyên gia phù hợp với mục tiêu của bạn.</p>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {['', 'WEIGHT_LOSS', 'WEIGHT_GAIN', 'MAINTAIN'].map((g) => (
                            <button key={g || 'all'} type="button" onClick={() => { setGoalFilter(g); setPage(0); }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${goalFilter === g ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                {g === '' ? 'Tất cả' : g === 'WEIGHT_LOSS' ? 'Giảm cân' : g === 'WEIGHT_GAIN' ? 'Tăng cân' : 'Duy trì'}
                            </button>
                        ))}
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                        <select value={sortMode} onChange={(e) => { setSortMode(e.target.value); setPage(0); }}
                                className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                            <option value="tier">Sắp xếp: Theo Hạng (Tier)</option>
                            <option value="compatibility">Sắp xếp: Phù hợp nhất</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-80 w-full rounded-3xl bg-slate-200" />)}
                    </div>
                ) : pts.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                        <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-800 font-black text-xl">Không tìm thấy huấn luyện viên nào.</p>
                        <p className="text-slate-500 mt-2 font-medium">Hãy thử điều chỉnh từ khóa hoặc bộ lọc của bạn.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {pts.map((pt) => (
                                <Link to={`/pt-profile/${pt.id}`} key={pt.id} className="group">
                                    <Card className="h-full bg-white border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden rounded-3xl">
                                        <div className="h-28 bg-gradient-to-tr from-slate-100 via-blue-50/50 to-indigo-50/50 relative">
                                            {pt.tier === 'TIER_1' && (
                                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center shadow-sm border border-blue-100">
                                                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> XÁC THỰC
                                                </div>
                                            )}
                                        </div>

                                        <CardContent className="p-6 pt-0 relative flex flex-col h-[calc(100%-7rem)]">
                                            <div className="-mt-12 mb-4 relative inline-block">
                                                <div className="w-24 h-24 rounded-3xl bg-white p-1.5 shadow-lg border border-slate-100">
                                                    {pt.avatarUrl ? (
                                                        <img src={pt.avatarUrl} alt={pt.fullName} className="w-full h-full rounded-2xl object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-2xl">
                                                            {getInitials(pt.fullName)}
                                                        </div>
                                                    )}
                                                </div>
                                                {pt.isVerified && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"><CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-50" /></div>}
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="font-black text-xl text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{pt.fullName}</h3>
                                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest line-clamp-1">{pt.specialty || 'Huấn luyện viên Cá nhân'}</p>

                                                <div className="flex items-center gap-1.5 mt-3 mb-5 bg-slate-50 w-fit px-3 py-1.5 rounded-xl border border-slate-100">
                                                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                                    <span className="text-sm font-black text-slate-800">{pt.rating ? pt.rating.toFixed(1) : '5.0'}</span>
                                                    <span className="text-xs text-slate-500">({pt.totalReviews || 0})</span>
                                                </div>

                                                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed font-medium">{pt.bio || 'Đam mê giúp bạn đạt được mục tiêu thể hình bằng phương pháp khoa học.'}</p>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {pt.goalMatch && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">✓ Đúng mục tiêu</span>}
                                                    {pt.dietMatch && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">✓ Hợp chế độ ăn</span>}
                                                    {pt.slotsAvailable === false && <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">Đã kín chỗ</span>}
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          {pt.activeClientCount != null ? `${pt.activeClientCount}/${pt.maxClients || 10} học viên` : `${pt.yearsExperience || 0} năm KN`}
                        </span>
                                                <span className="text-blue-600 group-hover:text-blue-800 font-bold text-sm flex items-center transition-colors">
                            Xem hồ sơ <ChevronRight className="w-4 h-4 ml-0.5" />
                        </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-12">
                                <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 text-slate-600 bg-white font-bold h-11 px-6">
                                    &larr; Trang trước
                                </Button>
                                <div className="font-bold text-slate-500 text-sm bg-slate-100 px-4 py-2 rounded-xl">
                                    {page + 1} / {totalPages}
                                </div>
                                <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 text-slate-600 bg-white font-bold h-11 px-6">
                                    Trang sau &rarr;
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}