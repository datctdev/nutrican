// src/pages/customer/MarketplacePage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { marketplaceService } from '../../services/marketplaceService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { useAuthStore } from '../../stores/authStore';
import ProvinceSelect from '../../components/common/ProvinceSelect';
import {
    Search, Star, CheckCircle2, ChevronRight, Award, ShieldCheck,
    Clock, UserCheck, StarHalf, SlidersHorizontal, MapPin,
    Briefcase, Dumbbell, Monitor, Globe, Banknote, X, RefreshCw, Users, UserCircle
} from 'lucide-react';

const RATE_UNIT_LABEL = { SESSION_60: 'buổi (60p)', SESSION_90: 'buổi (90p)', HOUR: 'giờ', MONTH: 'tháng' };
const TRAINING_MODE_LABEL = { ONLINE: 'Online', OFFLINE: 'Trực tiếp (Offline)', BOTH: 'Cả hai (Online & Offline)' };
const GENDER_LABEL = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

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

const getPermanentUrl = (url) => url ? url.split('?')[0] : '';

const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return getPermanentUrl(url);
    }
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
    return getPermanentUrl(`${minioUrl}/${cleanPath}`);
};

export default function MarketplacePage() {
    const { user, isAuthenticated } = useAuthStore();

    const [pts, setPts] = useState([]);
    const [coachingHistory, setCoachingHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);

    // --- STATE TÌM KIẾM CƠ BẢN ---
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortMode, setSortMode] = useState('tier');

    // --- STATE BỘ LỌC NÂNG CAO (DRAWER) ---
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [advFilters, setAdvFilters] = useState({
        goalFilter: '',
        gender: '',
        trainingMode: '',
        location: '',
        minExperience: '',
        maxRate: '',
        dietFilter: '',
        minRating: ''
    });

    const activeFilterCount = useMemo(() => {
        return Object.values(advFilters).filter(v => v !== '' && v !== null && v !== 0).length;
    }, [advFilters]);

    useEffect(() => {
        fetchPts();
    }, [page, sortMode]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'CUSTOMER') {
            fetchCoachingHistory();
        }
    }, [isAuthenticated, user]);

    const fetchPts = async (searchTerm = search, customFilters = advFilters) => {
        try {
            setLoading(true);
            const params = {
                page,
                size: 12,
                verifiedOnly: true,
                sort: sortMode
            };
            if (searchTerm) params.search = searchTerm;

            if (customFilters.goalFilter) params.goalFilter = customFilters.goalFilter;
            if (customFilters.gender) params.gender = customFilters.gender;
            if (customFilters.trainingMode) params.trainingMode = customFilters.trainingMode;
            if (customFilters.location) params.location = customFilters.location;
            if (customFilters.minExperience) params.minExperience = Number(customFilters.minExperience);
            if (customFilters.maxRate) params.maxRate = Number(customFilters.maxRate);
            if (customFilters.dietFilter) params.dietFilter = customFilters.dietFilter;
            if (customFilters.minRating) params.minRating = Number(customFilters.minRating);

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
        fetchPts(search, advFilters);
    };

    const handleApplyAdvFilters = () => {
        setPage(0);
        setShowFilterDrawer(false);
        fetchPts(search, advFilters);
    };

    const handleResetAdvFilters = () => {
        const resetState = {
            goalFilter: '',
            gender: '',
            trainingMode: '',
            location: '',
            minExperience: '',
            maxRate: '',
            dietFilter: '',
            minRating: ''
        };
        setAdvFilters(resetState);
        setSortMode('tier');
        setPage(0);
        setShowFilterDrawer(false);
        fetchPts(search, resetState);
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-16 animate-fade-in">

            {/* HEADER HERO BANNER */}
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-[2.5rem] p-8 sm:p-12 md:p-16 text-center shadow-xl relative overflow-hidden mt-6 mx-4 md:mx-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 max-w-3xl mx-auto">
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black bg-white/10 text-blue-200 border border-white/20 mb-6 backdrop-blur-sm">
                        <Award className="w-3.5 h-3.5 mr-1.5 text-amber-400"/> Nền tảng kết nối PT Chuyên Nghiệp Top 1%
                    </span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
                        Tìm Huấn Luyện Viên Đồng Hành Phù Hợp
                    </h1>
                    <form onSubmit={handleSearch} className="flex bg-white rounded-2xl p-2 shadow-2xl focus-within:ring-4 focus-within:ring-blue-500/30 transition-all">
                        <div className="flex-1 flex items-center px-4">
                            <Search className="w-5 h-5 text-slate-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên HLV, từ khóa chuyên môn (Pilates, Keto...)..."
                                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 px-3 outline-none font-bold text-sm md:text-base placeholder:font-medium"
                                value={search} onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 md:px-8 h-12 shadow-md shadow-blue-500/30 font-black cursor-pointer transition-all hover:scale-105">
                            Tìm kiếm
                        </Button>
                    </form>
                </div>
            </div>

            <div className="px-4 md:px-0">

                {/* LỊCH SỬ PT ĐÃ ĐỒNG HÀNH */}
                {!historyLoading && coachingHistory.length > 0 && (
                    <div className="mb-14 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 p-8 rounded-[2.5rem] border border-emerald-100">
                        <div className="flex items-center gap-3 mb-6 px-2">
                            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-sm">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">PT bạn đã đồng hành</h2>
                                <p className="text-sm font-medium text-slate-500">Các huấn luyện viên bạn đã hoàn thành khóa học trước đây.</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {coachingHistory.map((history) => (
                                <Card key={history.mappingId} className="bg-white border-emerald-100 shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl border border-emerald-100 shrink-0 overflow-hidden">
                                                {history.ptAvatarUrl ? (
                                                    <img src={history.ptAvatarUrl} alt={history.ptName} className="w-full h-full object-cover" />
                                                ) : getInitials(history.ptName)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-extrabold text-lg text-slate-900 truncate">{history.ptName}</h3>
                                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400"/> Kết thúc: {new Date(history.completedAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Link to={`/pt-profile/${history.ptProfileId}`} className="flex-1">
                                                <Button
                                                    className={`w-full rounded-xl font-bold shadow-sm h-11 transition-all cursor-pointer ${
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

                {/* --- THANH CÔNG CỤ TÌM KIẾM SIÊU GỌN (ĐÃ XÓA 2 PHẦN LỌC DƯ THỪA) --- */}
                <div className="flex items-center justify-between gap-4 mb-8 px-2 border-t border-slate-100 pt-8">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                            Huấn Luyện Viên Nổi Bật
                            <span className="text-xs font-extrabold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{pts.length} HLV</span>
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Khám phá và chọn lọc chuyên gia phù hợp tuyệt đối với tiêu chí của bạn.</p>
                    </div>

                    <div className="flex items-center shrink-0">
                        {/* NÚT MỞ BỘ LỌC NÂNG CAO (DUY NHẤT & NỔI BẬT) */}
                        <Button
                            type="button"
                            onClick={() => setShowFilterDrawer(true)}
                            variant="outline"
                            className={`h-12 px-5 rounded-2xl font-black text-sm border-2 transition-all cursor-pointer flex items-center gap-2.5 shadow-sm hover:scale-105 ${activeFilterCount > 0 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                            <span>Bộ lọc tìm kiếm</span>
                            {activeFilterCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-black">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* --- HIỂN THỊ DANH SÁCH THẺ PT (GRID CARDS 3 CỘT SIÊU THOÁNG) --- */}
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[520px] w-full rounded-[2.5rem] bg-slate-200/80" />)}
                    </div>
                ) : pts.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-200/80 border-dashed shadow-sm space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner border border-slate-100">
                            <Search className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-slate-800 font-black text-2xl">Không tìm thấy huấn luyện viên phù hợp</h3>
                        <p className="text-slate-500 font-medium max-w-md mx-auto text-sm">Rất tiếc không có PT nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn. Hãy thử nới lỏng bộ lọc nhé!</p>
                        {activeFilterCount > 0 && (
                            <Button onClick={handleResetAdvFilters} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-6 h-11 shadow-md shadow-blue-500/20 cursor-pointer">
                                <RefreshCw className="w-4 h-4 mr-2" /> Xóa tất cả bộ lọc ({activeFilterCount})
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {pts.map((pt) => {
                                let showcase = pt.portfolioShowcase || {};
                                if (typeof showcase === 'string') {
                                    try { showcase = JSON.parse(showcase); } catch (e) { showcase = {}; }
                                }
                                const coverPhoto = getFullImageUrl(showcase.coverPhotoUrl) || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop";
                                const displayRate = pt.offlineRate || pt.onlineRate || pt.hourlyRate;
                                const displayUnit = pt.offlineRateUnit || pt.onlineRateUnit || pt.rateUnit || 'SESSION_60';
                                const isCertified = pt.tier === 'TIER_1' || pt.preferredTrack === 'CERTIFIED';

                                return (
                                    <Link to={`/pt-profile/${pt.id}`} key={pt.id} className="group flex">
                                        <Card className="w-full bg-white border-slate-200/80 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden rounded-[2.5rem] flex flex-col justify-between">

                                            {/* NỬA TRÊN: ẢNH BÌA COVER PHOTO & BADGE */}
                                            <div>
                                                <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                                                    <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                                                    {/* Huy hiệu Phân hạng */}
                                                    <div className="absolute top-4 right-4 z-10">
                                                        <span className={`text-[11px] font-black px-3.5 py-1.5 rounded-xl flex items-center shadow-md backdrop-blur-md border ${
                                                            isCertified
                                                                ? 'bg-amber-400/95 text-slate-950 border-amber-300'
                                                                : 'bg-white/95 text-slate-800 border-white/60 shadow-sm'
                                                        }`}>
                                                            <Award className={`w-3.5 h-3.5 mr-1.5 ${isCertified ? 'text-slate-950' : 'text-blue-600'}`} />
                                                            {isCertified ? 'PT CHUYÊN NGHIỆP' : 'PT TỰ DO'}
                                                        </span>
                                                    </div>

                                                    {/* Hình thức tập luyện góc trái */}
                                                    {pt.trainingMode && (
                                                        <div className="absolute bottom-3.5 right-3.5 z-10">
                                                            <span className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 shadow-sm">
                                                                {pt.trainingMode === 'ONLINE' ? <Monitor className="w-3.5 h-3.5 text-blue-400"/> : pt.trainingMode === 'OFFLINE' ? <Dumbbell className="w-3.5 h-3.5 text-emerald-400"/> : <Globe className="w-3.5 h-3.5 text-amber-400"/>}
                                                                {TRAINING_MODE_LABEL[pt.trainingMode]}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <CardContent className="p-7 pt-0 relative">
                                                    {/* AVATAR OVERLAY */}
                                                    <div className="-mt-12 mb-4 relative inline-block shrink-0">
                                                        <div className="w-[88px] h-[88px] rounded-2xl bg-white p-1 shadow-lg border border-slate-100/80 overflow-hidden flex items-center justify-center">
                                                            {pt.avatarUrl ? (
                                                                <img
                                                                    src={getFullImageUrl(pt.avatarUrl)}
                                                                    alt={pt.fullName}
                                                                    className="w-full h-full rounded-xl object-cover object-center aspect-square"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black text-2xl aspect-square">
                                                                    {getInitials(pt.fullName)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {pt.isVerified && (
                                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm z-10">
                                                                <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* THÔNG TIN CHÍNH */}
                                                    <div>
                                                        <h3 className="font-black text-2xl text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 flex items-center justify-between">
                                                            <span>{pt.fullName}</span>
                                                        </h3>

                                                        {/* Giới tính, Kinh nghiệm & Địa điểm */}
                                                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 mt-1.5 flex-wrap">
                                                            {pt.gender && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px]">{GENDER_LABEL[pt.gender] || pt.gender}</span>}
                                                            <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md"><Briefcase className="w-3.5 h-3.5 text-blue-500"/> {pt.yearsOfExperience || pt.yearsExperience || 0} năm KN</span>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md truncate"><MapPin className="w-3.5 h-3.5 text-red-500 shrink-0"/> {pt.location || 'Toàn quốc'}</span>
                                                        </div>

                                                        {/* Đánh giá sao */}
                                                        <div className="flex items-center gap-1.5 mt-3.5 mb-4 bg-amber-50/80 w-fit px-3.5 py-1 rounded-xl border border-amber-200/60">
                                                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                                            <span className="text-sm font-black text-amber-950">{pt.rating ? pt.rating.toFixed(1) : '5.0'}</span>
                                                            <span className="text-xs font-bold text-amber-700/80">({pt.totalReviews || 0} đánh giá)</span>
                                                        </div>

                                                        {/* MỨC PHÍ DỊCH VỤ NỔI BẬT MÀU XANH LÁ */}
                                                        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 mb-4 flex items-center justify-between shadow-2xs">
                                                            <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5"><Banknote className="w-4 h-4"/> Phí dịch vụ:</span>
                                                            <span className="text-base font-black text-emerald-600">
                                                                {displayRate ? `${Number(displayRate).toLocaleString('vi-VN')}đ` : 'Liên hệ'}
                                                                <span className="text-[11px] font-bold text-slate-500 ml-0.5">/ {RATE_UNIT_LABEL[displayUnit] || 'buổi'}</span>
                                                            </span>
                                                        </div>

                                                        {/* Bio */}
                                                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-semibold mb-5">{pt.bio || 'Chuyên gia huấn luyện thể chất và tư vấn dinh dưỡng khoa học đồng hành cùng bạn chinh phục mục tiêu vóc dáng bền vững.'}</p>

                                                        {/* PHÂN TÁCH 3 HÀNG CHUYÊN MÔN RÕ RÀNG */}
                                                        <div className="space-y-2 pt-4 border-t border-slate-100">
                                                            {pt.specializations?.length > 0 && (
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase w-18 shrink-0">Chuyên môn:</span>
                                                                    {pt.specializations.slice(0, 3).map((s, i) => (
                                                                        <span key={i} className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md">{s}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {pt.preferredGoals?.length > 0 && (
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase w-18 shrink-0">Mục tiêu:</span>
                                                                    {pt.preferredGoals.slice(0, 3).map((g, i) => (
                                                                        <span key={i} className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md">{GOAL_LABELS[g] || g}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {pt.preferredDietTypes?.length > 0 && (
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase w-18 shrink-0">Chế độ ăn:</span>
                                                                    {pt.preferredDietTypes.slice(0, 3).map((d, i) => (
                                                                        <span key={i} className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md">{DIET_LABELS[d] || d}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </div>

                                            {/* NỬA DƯỚI: FOOTER HIỆN TRẠNG THÁI & NÚT XEM */}
                                            <div className="px-7 py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between mt-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs font-black text-slate-700">
                                                        {pt.activeClientCount != null ? `${pt.activeClientCount}/${pt.maxClients || 10} học viên` : 'Sẵn sàng nhận học viên'}
                                                    </span>
                                                </div>

                                                <div className="inline-flex items-center gap-1 bg-white hover:bg-blue-600 text-blue-600 hover:text-white px-4 py-2 rounded-xl font-extrabold text-xs border border-slate-200/80 shadow-2xs transition-all duration-300 group-hover:border-blue-600">
                                                    <span>Xem chi tiết</span>
                                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>

                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-16">
                                <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 text-slate-600 bg-white font-bold h-12 px-6 shadow-xs cursor-pointer">
                                    &larr; Trang trước
                                </Button>
                                <div className="font-extrabold text-slate-700 text-sm bg-slate-100 px-6 py-3 rounded-xl border border-slate-200/60">
                                    {page + 1} / {totalPages}
                                </div>
                                <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 text-slate-600 bg-white font-bold h-12 px-6 shadow-xs cursor-pointer">
                                    Trang sau &rarr;
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ================================================================================= */}
            {/* --- NGĂN KÉO BỘ LỌC NÂNG CAO (ADVANCED FILTER DRAWER / MODAL) --- */}
            {/* ================================================================================= */}
            {showFilterDrawer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowFilterDrawer(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100" onClick={(e) => e.stopPropagation()}>

                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
                                    <SlidersHorizontal className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900">Bộ Lọc Tìm Kiếm Nâng Cao</h3>
                                    <p className="text-xs font-semibold text-slate-500">Lọc chính xác Huấn luyện viên theo nhu cầu của bạn</p>
                                </div>
                            </div>
                            <button onClick={() => setShowFilterDrawer(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-xl border border-slate-200 transition-all cursor-pointer font-bold">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-7 flex-1">

                            {/* ĐÃ TÍCH HỢP MỤC TIÊU & SẮP XẾP VÀO DRAWER */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Mục tiêu tập luyện</label>
                                    <select
                                        value={advFilters.goalFilter}
                                        onChange={(e) => setAdvFilters({ ...advFilters, goalFilter: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="">🎯 Tất cả mục tiêu</option>
                                        <option value="WEIGHT_LOSS">🔥 Giảm cân / Giảm mỡ</option>
                                        <option value="WEIGHT_GAIN">💪 Tăng cân / Tăng cơ</option>
                                        <option value="MUSCLE_GAIN">⚡ Tăng cơ / Thể hình</option>
                                        <option value="MAINTAIN">✨ Duy trì vóc dáng</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Sắp xếp ưu tiên</label>
                                    <select
                                        value={sortMode}
                                        onChange={(e) => { setSortMode(e.target.value); setPage(0); }}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="tier">⚡ Theo Hạng PT Chuyên nghiệp (Tier)</option>
                                        <option value="compatibility">🎯 Theo độ Phù hợp nhất</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Hình thức tập luyện</label>
                                    <select
                                        value={advFilters.trainingMode}
                                        onChange={(e) => setAdvFilters({ ...advFilters, trainingMode: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="">⚡ Tất cả hình thức</option>
                                        <option value="ONLINE">🌐 Chỉ tập Online (Từ xa)</option>
                                        <option value="OFFLINE">🏋️ Trực tiếp (Offline tại studio/gym)</option>
                                        <option value="BOTH">🔥 Cả hai (Online & Offline)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Giới tính HLV</label>
                                    <select
                                        value={advFilters.gender}
                                        onChange={(e) => setAdvFilters({ ...advFilters, gender: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="">⚡ Tất cả giới tính</option>
                                        <option value="MALE">👨 Huấn luyện viên Nam</option>
                                        <option value="FEMALE">👩 Huấn luyện viên Nữ</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Địa điểm khu vực hoạt động</label>
                                <ProvinceSelect
                                    value={advFilters.location}
                                    onChange={(v) => setAdvFilters({ ...advFilters, location: v })}
                                    placeholder="Chọn Tỉnh / Thành phố bạn muốn tập luyện..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Mức phí tối đa / buổi</label>
                                    <select
                                        value={advFilters.maxRate}
                                        onChange={(e) => setAdvFilters({ ...advFilters, maxRate: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="">💰 Mọi mức giá</option>
                                        <option value="300000">Dưới 300.000 VNĐ / buổi</option>
                                        <option value="500000">Dưới 500.000 VNĐ / buổi</option>
                                        <option value="800000">Dưới 800.000 VNĐ / buổi</option>
                                        <option value="1200000">Dưới 1.200.000 VNĐ / buổi</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Kinh nghiệm tối thiểu</label>
                                    <select
                                        value={advFilters.minExperience}
                                        onChange={(e) => setAdvFilters({ ...advFilters, minExperience: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="">🌟 Mọi kinh nghiệm</option>
                                        <option value="1">Trên 1 năm kinh nghiệm</option>
                                        <option value="3">Trên 3 năm kinh nghiệm</option>
                                        <option value="5">Trên 5 năm kinh nghiệm (Chuyên gia)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Chế độ ăn khuyến nghị</label>
                                    <select
                                        value={advFilters.dietFilter}
                                        onChange={(e) => setAdvFilters({ ...advFilters, dietFilter: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="">🥗 Tất cả chế độ ăn</option>
                                        <option value="EAT_CLEAN">Eat Clean</option>
                                        <option value="KETO">Chế độ Keto</option>
                                        <option value="VEGETARIAN">Ăn chay (Vegetarian)</option>
                                        <option value="VEGAN">Thuần chay (Vegan)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">Điểm đánh giá sao</label>
                                    <select
                                        value={advFilters.minRating}
                                        onChange={(e) => setAdvFilters({ ...advFilters, minRating: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white outline-none focus:border-blue-600 cursor-pointer"
                                    >
                                        <option value="">⭐ Mọi mức đánh giá</option>
                                        <option value="4.0">Từ 4.0 ⭐ trở lên</option>
                                        <option value="4.5">Từ 4.5 ⭐ trở lên (Xuất sắc)</option>
                                        <option value="4.8">Từ 4.8 ⭐ trở lên (Top Rated)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetAdvFilters}
                                className="h-12 px-6 rounded-xl font-extrabold text-slate-600 border-slate-200 hover:bg-slate-200/60 cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4 mr-2 text-slate-500" /> Đặt lại mặc định
                            </Button>
                            <Button
                                type="button"
                                onClick={handleApplyAdvFilters}
                                className="h-12 px-8 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 cursor-pointer transition-all hover:scale-105"
                            >
                                Áp dụng bộ lọc ngay
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}