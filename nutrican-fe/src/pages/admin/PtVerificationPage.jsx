// src/pages/admin/PtVerificationPage.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import {
    CheckCircle2, XCircle, ShieldCheck, Mail, BookOpen,
    Award, MapPin, Phone, Monitor, Dumbbell, Globe, Calendar,
    ExternalLink, ZoomIn, Star, Loader2, Link2, UserPlus, FileEdit, RefreshCw, AlertCircle
} from 'lucide-react';

const TRAINING_MODE_LABEL = { ONLINE: 'Online', OFFLINE: 'Trực tiếp (Offline)', BOTH: 'Cả hai (Online & Offline)' };
const TRAINING_MODE_ICON = { ONLINE: Monitor, OFFLINE: Dumbbell, BOTH: Globe };
const GENDER_LABEL = { MALE: 'Nam giới', FEMALE: 'Nữ giới', OTHER: 'Khác' };

// --- BỔ SUNG ĐẦY ĐỦ TỪ ĐIỂN MAPPING TIẾNG VIỆT CHO ADMIN ---
const RATE_UNIT_LABEL = {
    SESSION_60: 'Mỗi buổi (60 phút)',
    SESSION_90: 'Mỗi buổi (90 phút)',
    HOUR: 'Mỗi giờ',
    MONTH: 'Mỗi tháng'
};

const GOAL_LABEL = {
    'WEIGHT_LOSS': 'Giảm cân / Giảm mỡ',
    'WEIGHT_GAIN': 'Tăng cân / Tăng cơ',
    'MUSCLE_GAIN': 'Tăng cơ / Thể hình',
    'FAT_LOSS': 'Đốt mỡ siêu tốc',
    'MAINTAIN': 'Duy trì vóc dáng',
    'PREGNANT': 'Dinh dưỡng thai kỳ',
    'RECOVERY': 'Phục hồi thể chất'
};

const DIET_LABEL = {
    'NORMAL': 'Ăn thường (Đầy đủ chất)',
    'VEGETARIAN': 'Ăn chay',
    'VEGAN': 'Thuần chay (Vegan)',
    'KETO': 'Chế độ Keto',
    'EAT_CLEAN': 'Eat Clean'
};

const FIELD_LABELS = {
    bio: 'Tiểu sử (Bio)',
    trainingPhilosophy: 'Triết lý huấn luyện',
    contactPhone: 'SĐT Liên hệ',
    trainingMode: 'Hình thức huấn luyện',
    location: 'Địa điểm hoạt động',
    hourlyRate: 'Phí dịch vụ',
    rateUnit: 'Đơn vị tính phí',
    onlineRateUnit: 'Đơn vị tính phí',
    offlineRateUnit: 'Đơn vị tính phí',
    specializations: 'Chuyên môn chính',
    preferredGoals: 'Mục tiêu KH hỗ trợ',
    preferredDietTypes: 'Chế độ ăn khuyến nghị',
    certifications: 'Chứng chỉ chuyên môn',
    instagramUrl: 'Instagram',
    linkedinUrl: 'LinkedIn',
    cvUrl: 'Hồ sơ CV (PDF/DOC)',
    gender: 'Giới tính',
    experienceStartDate: 'Kinh nghiệm từ tháng'
};

function CertImageModal({ url, onClose }) {
    if (!url) return null;
    const isPdf = url.includes('.pdf') || url.includes('pdf');
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl max-w-3xl w-full border border-slate-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2.5"><ZoomIn className="w-5 h-5 text-blue-600"/> Xem tài liệu minh chứng</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-xl border border-slate-200 transition-all font-bold text-sm">✕ Đóng</button>
                </div>
                <div className="p-6 bg-slate-100/60 flex justify-center max-h-[80vh] overflow-y-auto">
                    {isPdf ? (
                        <div className="text-center py-14 bg-white w-full rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <BookOpen className="w-10 h-10" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-lg">Tài liệu định dạng PDF / DOC</h4>
                                <p className="text-sm font-medium text-slate-500 mt-1">Trình duyệt không hỗ trợ xem trước trực tiếp file này.</p>
                            </div>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 hover:-translate-y-0.5">
                                <ExternalLink className="w-4 h-4" /> Mở file trong tab mới
                            </a>
                        </div>
                    ) : (
                        <img src={url} alt="Chứng chỉ" className="rounded-2xl object-contain max-h-[70vh] shadow-md bg-white border border-slate-200" />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PtVerificationPage() {
    const [mainTab, setMainTab] = useState('NEW');

    const [pts, setPts] = useState([]);
    const [ptsPage, setPtsPage] = useState(0);
    const [ptsTotalPages, setPtsTotalPages] = useState(0);
    const [trackFilter, setTrackFilter] = useState('ALL');
    const [docTab, setDocTab] = useState({});

    const [updateRequests, setUpdateRequests] = useState([]);
    const [updatesPage, setUpdatesPage] = useState(0);
    const [updatesTotalPages, setUpdatesTotalPages] = useState(0);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectNote, setRejectNote] = useState('');

    const fetchPendingPts = async () => {
        try {
            setLoading(true);
            const response = await adminService.getPendingPts({ page: ptsPage, size: 10 });
            setPts(response.data.data.content || []);
            setPtsTotalPages(response.data.data.totalPages);
        } catch (err) {
            toast.error('Không thể tải danh sách PT chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    const fetchUpdateRequests = async () => {
        try {
            setLoading(true);
            const response = await adminService.getPendingUpdateRequests({ page: updatesPage, size: 10 });
            setUpdateRequests(response.data.data.content || []);
            setUpdatesTotalPages(response.data.data.totalPages);
        } catch (err) {
            toast.error('Không thể tải danh sách yêu cầu cập nhật hồ sơ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mainTab === 'NEW') fetchPendingPts();
        else fetchUpdateRequests();
    }, [mainTab, ptsPage, updatesPage]);

    const handleVerifyNew = async (userId, ptType) => {
        try {
            setActionLoading(userId + '_approve');
            await adminService.verifyPt(userId, { isVerified: true, ptType });
            toast.success(`Đã duyệt thành công với vai trò ${ptType === 'PT_CERTIFIED' ? 'Certified' : 'Freelance'} PT`);
            fetchPendingPts();
        } catch (err) { toast.error('Lỗi khi duyệt PT'); } finally { setActionLoading(null); }
    };

    const handleRejectNew = async () => {
        if (!rejectModal) return;
        try {
            setActionLoading(rejectModal + '_reject');
            await adminService.verifyPt(rejectModal, { action: 'REJECT', adminNote: rejectNote || undefined });
            toast.success('Đã từ chối hồ sơ đăng ký');
            setRejectModal(null);
            setRejectNote('');
            fetchPendingPts();
        } catch (err) { toast.error('Lỗi khi từ chối PT'); } finally { setActionLoading(null); }
    };

    const handleReviewUpdate = async (requestId, action) => {
        try {
            setActionLoading(requestId + '_' + action.toLowerCase());
            await adminService.reviewUpdateRequest(requestId, { action, adminNote: rejectNote || undefined });
            toast.success(action === 'APPROVE' ? 'Đã phê duyệt bản cập nhật' : 'Đã từ chối bản cập nhật');
            if (action === 'REJECT') {
                setRejectModal(null);
                setRejectNote('');
            }
            fetchUpdateRequests();
        } catch (err) { toast.error('Lỗi khi xử lý yêu cầu'); } finally { setActionLoading(null); }
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

    const formatMonthYear = (ym) => {
        if (!ym) return null;
        const [year, month] = ym.split('-');
        return `${month}/${year}`;
    };

    // --- HÀM FORMAT GIÁ TRỊ ĐÃ NÂNG CẤP MAPPING HOÀN HẢO ---
    const formatFieldValue = (key, value) => {
        if (value === null || value === undefined || value === '') return <span className="text-slate-400 italic font-medium">Trống (Không cập nhật)</span>;

        // 1. Nếu là Đơn vị tính phí
        if (key === 'rateUnit' || key === 'onlineRateUnit' || key === 'offlineRateUnit') {
            return <span className="font-extrabold text-slate-800 text-base">{RATE_UNIT_LABEL[value] || value}</span>;
        }

        // 2. Nếu là Mục tiêu KH hỗ trợ (Màu xanh lá)
        if (key === 'preferredGoals' && Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {value.map(v => (
                        <span key={v} className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-2xs">
                            {GOAL_LABEL[v] || v}
                        </span>
                    ))}
                </div>
            );
        }

        // 3. Nếu là Chế độ ăn khuyến nghị (Màu tím Indigo)
        if (key === 'preferredDietTypes' && Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {value.map(v => (
                        <span key={v} className="bg-indigo-50 text-indigo-800 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-2xs">
                            {DIET_LABEL[v] || v}
                        </span>
                    ))}
                </div>
            );
        }

        // 4. Nếu là Link CV
        if (key === 'cvUrl') {
            return (
                <div className="pt-1">
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02]"
                    >
                        <BookOpen className="w-4 h-4 shrink-0" /> Xem / Tải CV chi tiết <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
                    </a>
                </div>
            );
        }

        // 5. Nếu là Link Mạng xã hội
        if (key === 'instagramUrl' || key === 'linkedinUrl') {
            const isInsta = key === 'instagramUrl';
            return (
                <div className="pt-1">
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all border shadow-2xs hover:scale-[1.02] ${isInsta ? 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                    >
                        <Link2 className="w-3.5 h-3.5 shrink-0" /> {isInsta ? 'Mở trang Instagram' : 'Mở trang LinkedIn'} <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                    </a>
                </div>
            );
        }

        // 6. Nếu là bất kỳ URL nào khác
        if (key.includes('Url')) {
            return (
                <div className="pt-1">
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-bold text-xs bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100 shadow-2xs"
                    >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Mở liên kết đính kèm
                    </a>
                </div>
            );
        }

        // 7. Danh sách Chứng chỉ
        if (key === 'certifications') {
            return (
                <div className="space-y-2 mt-2">
                    {value.map((c, i) => (
                        <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-extrabold text-sm text-slate-800 truncate">{c.name}</p>
                                <p className="text-xs font-semibold text-slate-500 mt-0.5">{c.issuingOrganization}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Cấp: {formatMonthYear(c.issueDate)} {c.neverExpires ? '· Vô thời hạn ∞' : c.expiryDate ? `đến ${formatMonthYear(c.expiryDate)}` : ''}</p>
                            </div>
                            {c.certificateImageUrl && (
                                <button
                                    type="button"
                                    onClick={() => setPreviewUrl(c.certificateImageUrl)}
                                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200/80 shrink-0 flex items-center gap-1.5 transition-all shadow-2xs"
                                >
                                    <ZoomIn className="w-3.5 h-3.5"/> Xem ảnh
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        // 8. Các mảng khác (Chuyên môn...)
        if (Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {value.map(v => <span key={v} className="bg-white text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-2xs">{v}</span>)}
                </div>
            );
        }

        if (key === 'hourlyRate') return <span className="font-black text-emerald-600 text-base">{Number(value).toLocaleString('vi-VN')} VNĐ</span>;
        if (key === 'trainingMode') return <span className="font-extrabold text-slate-800 text-base">{TRAINING_MODE_LABEL[value] || value}</span>;
        if (key === 'gender') return <span className="font-extrabold text-slate-800 text-base">{GENDER_LABEL[value] || value}</span>;

        return <span className="text-sm font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">{String(value)}</span>;
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-16 animate-fade-in mt-6 px-4 sm:px-6">
            {previewUrl && <CertImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Xét Duyệt & Phê Duyệt PT</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Quản lý hồ sơ ứng tuyển mới và các yêu cầu cập nhật thông tin chuyên môn.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 sm:gap-6 border-b border-slate-200">
                <button
                    className={`pb-4 px-2 font-extrabold text-sm transition-all relative flex items-center gap-2 cursor-pointer ${mainTab === 'NEW' ? 'text-blue-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setMainTab('NEW'); setPtsPage(0); }}
                >
                    <UserPlus className="w-4 h-4" /> PT Đăng ký mới
                    {mainTab === 'NEW' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full shadow-sm"></span>}
                </button>
                <button
                    className={`pb-4 px-2 font-extrabold text-sm transition-all relative flex items-center gap-2 cursor-pointer ${mainTab === 'UPDATE' ? 'text-amber-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setMainTab('UPDATE'); setUpdatesPage(0); }}
                >
                    <FileEdit className="w-4 h-4" /> PT Xin đổi hồ sơ
                    {mainTab === 'UPDATE' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-600 rounded-t-full shadow-sm"></span>}
                </button>
                <Button variant="ghost" onClick={mainTab === 'NEW' ? fetchPendingPts : fetchUpdateRequests} className="ml-auto text-slate-500 hover:bg-slate-100 rounded-xl h-9 px-3 cursor-pointer">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {loading ? (
                <div className="space-y-6">{[1, 2].map(i => <Skeleton key={i} className="h-96 w-full rounded-[2rem] bg-slate-200/80" />)}</div>
            ) : mainTab === 'NEW' ? (
                <>
                    <div className="flex justify-end mb-4">
                        <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
                            {['ALL', 'CERTIFIED', 'FREELANCE'].map((t) => (
                                <button key={t} type="button" onClick={() => setTrackFilter(t)}
                                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${trackFilter === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                    {t === 'ALL' ? 'Tất cả' : t === 'CERTIFIED' ? 'PT Chuyên nghiệp' : 'PT Tự do'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {pts.filter((pt) => trackFilter === 'ALL' || pt.preferredTrack === trackFilter).length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200/80 shadow-sm border-dashed space-y-3">
                            <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto" />
                            <h3 className="text-xl font-black text-slate-800">Không có PT đăng ký mới</h3>
                            <p className="text-sm font-medium text-slate-500">Tất cả các hồ sơ ứng tuyển đều đã được kiểm duyệt.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {pts.filter((pt) => trackFilter === 'ALL' || pt.preferredTrack === trackFilter).map((pt) => {
                                const uid = pt.userId || pt.id;
                                const ModeIcon = TRAINING_MODE_ICON[pt.trainingMode] || Globe;
                                const isActing = actionLoading === uid + '_approve' || actionLoading === uid + '_reject';
                                const activeDocTab = docTab[uid] || 'CV';
                                return (
                                    <Card key={uid} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
                                        <CardContent className="p-0 flex flex-col xl:flex-row">
                                            <div className="flex-1 p-6 sm:p-8">
                                                <div className="flex gap-4 mb-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl overflow-hidden shrink-0 border border-blue-100 shadow-2xs">
                                                        {pt.avatarUrl ? <img src={pt.avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(pt.fullName)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-xl font-black text-slate-900">{pt.fullName}</h3>
                                                        <div className="flex flex-wrap gap-3 mt-1">
                                                            <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{pt.email}</span>
                                                            {pt.contactPhone && <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{pt.contactPhone}</span>}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {pt.preferredTrack && (
                                                                <span className={`text-xs font-extrabold px-3 py-1 rounded-lg flex items-center gap-1.5 ${pt.preferredTrack === 'CERTIFIED' ? 'bg-amber-100 text-amber-800 border border-amber-200/80' : 'bg-indigo-100 text-indigo-800 border border-indigo-200/80'}`}>
                                                                    {pt.preferredTrack === 'CERTIFIED' ? <Award className="w-3.5 h-3.5 text-amber-600" /> : <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />}
                                                                    Ứng tuyển {pt.preferredTrack === 'CERTIFIED' ? 'PT Chuyên nghiệp' : 'PT Tự do'}
                                                                </span>
                                                            )}
                                                            {pt.trainingMode && <span className="text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 rounded-lg flex items-center gap-1.5"><ModeIcon className="w-3.5 h-3.5 text-emerald-600" />{TRAINING_MODE_LABEL[pt.trainingMode]}</span>}
                                                            {pt.location && <span className="text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200/80 px-3 py-1 rounded-lg flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" />{pt.location}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                                                    <div className="space-y-4">
                                                        {pt.bio && (<div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giới thiệu bản thân</p><p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">{pt.bio}</p></div>)}
                                                        {pt.specializations?.length > 0 && (<div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chuyên môn</p><div className="flex flex-wrap gap-1.5">{pt.specializations.map(s => (<span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-bold">{s}</span>))}</div></div>)}
                                                    </div>
                                                    <div>
                                                        <div className="flex gap-1.5 mb-3 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/80">
                                                            {['CV', 'CERT'].map((tab) => (
                                                                <button key={tab} type="button" onClick={() => setDocTab((prev) => ({ ...prev, [uid]: tab }))}
                                                                        className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeDocTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                                                    {tab === 'CV' ? 'CV & Mạng xã hội' : `Chứng chỉ (${pt.certifications?.length || 0})`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {activeDocTab === 'CV' ? (
                                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                                                {pt.cvUrl ? (<a href={pt.cvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-extrabold text-blue-700 hover:text-blue-800 bg-blue-100/60 hover:bg-blue-100 p-3 rounded-xl gap-2 transition-all shadow-2xs"><BookOpen className="w-4 h-4" /> Mở file CV ứng tuyển (PDF/DOC) <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70"/></a>) : (<p className="text-sm text-slate-400 italic text-center py-4 font-medium">Chưa đính kèm file CV</p>)}
                                                                <div className="flex gap-2">
                                                                    {pt.instagramUrl && <a href={pt.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-bold text-pink-700 bg-pink-100/80 hover:bg-pink-100 p-2.5 rounded-xl border border-pink-200/60 transition-all">Mở Instagram</a>}
                                                                    {pt.linkedinUrl && <a href={pt.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-100 p-2.5 rounded-xl border border-blue-200/60 transition-all">Mở LinkedIn</a>}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                                                                {pt.certifications?.length > 0 ? pt.certifications.map((cert, i) => (
                                                                    <div key={i} className="flex items-start gap-3 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-extrabold text-slate-800 text-sm">{cert.name}</p>
                                                                            <p className="text-xs font-semibold text-slate-600 mt-0.5">{cert.issuingOrganization}</p>
                                                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{formatMonthYear(cert.issueDate)} {cert.neverExpires ? '· Vô thời hạn ∞' : cert.expiryDate ? `đến ${formatMonthYear(cert.expiryDate)}` : ''}</p>
                                                                        </div>
                                                                        {cert.certificateImageUrl && (
                                                                            <button onClick={() => setPreviewUrl(cert.certificateImageUrl)} className="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-300 hover:border-amber-500 transition-all relative group shadow-sm bg-white cursor-zoom-in" title="Xem ảnh">
                                                                                <img src={cert.certificateImageUrl} alt={cert.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }}/>
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ZoomIn className="w-5 h-5 text-white" /></div>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )) : <p className="text-sm text-slate-400 italic py-4 text-center font-medium">Không có dữ liệu chứng chỉ</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50/80 p-6 sm:p-8 w-full xl:w-72 flex flex-col justify-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-200/80">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Quyết định phê duyệt</p>
                                                <Button onClick={() => handleVerifyNew(uid, 'PT_CERTIFIED')} disabled={isActing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 shadow-md shadow-emerald-500/20 font-extrabold text-sm transition-all hover:scale-[1.02] cursor-pointer">
                                                    {actionLoading === uid + '_approve' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" />Duyệt PT Chuyên nghiệp</>}
                                                </Button>
                                                <Button onClick={() => handleVerifyNew(uid, 'PT_FREELANCE')} disabled={isActing} variant="outline" className="rounded-xl h-12 border-slate-300 bg-white font-extrabold text-slate-700 hover:bg-slate-100 text-sm transition-all hover:scale-[1.02] cursor-pointer">
                                                    {actionLoading === uid + '_approve' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Star className="w-5 h-5 mr-2 text-amber-500" />Duyệt PT Tự do</>}
                                                </Button>
                                                <div className="border-t border-slate-200 my-1" />
                                                <Button onClick={() => { setRejectModal(uid); setMainTab('NEW'); }} disabled={isActing} variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-12 font-bold text-sm cursor-pointer">
                                                    {actionLoading === uid + '_reject' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-5 h-5 mr-2" />Từ chối hồ sơ</>}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            {ptsTotalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-4">
                                    <Button variant="outline" disabled={ptsPage === 0} onClick={() => setPtsPage(p => p - 1)} className="rounded-xl font-bold">Trước</Button>
                                    <span className="flex items-center px-4 text-sm font-bold text-slate-600">Trang {ptsPage + 1} / {ptsTotalPages}</span>
                                    <Button variant="outline" disabled={ptsPage >= ptsTotalPages - 1} onClick={() => setPtsPage(p => p + 1)} className="rounded-xl font-bold">Sau</Button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <>
                    {updateRequests.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200/80 shadow-sm border-dashed space-y-3">
                            <FileEdit className="w-16 h-16 text-amber-400 mx-auto" />
                            <h3 className="text-xl font-black text-slate-800">Không có yêu cầu đổi hồ sơ nào</h3>
                            <p className="text-sm font-medium text-slate-500">Tất cả các yêu cầu chỉnh sửa từ HLV đều đã được xử lý.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {updateRequests.map((req) => (
                                <Card key={req.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
                                    <CardContent className="p-0 flex flex-col xl:flex-row">
                                        <div className="flex-1 p-6 sm:p-8">

                                            {/* Top PT Info */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-xl overflow-hidden shrink-0 border border-amber-200/80 shadow-2xs">
                                                        {req.ptAvatar ? <img src={req.ptAvatar} alt="" className="w-full h-full object-cover" /> : getInitials(req.ptName)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900">{req.ptName}</h3>
                                                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Gửi yêu cầu lúc: <span className="font-bold text-slate-600">{new Date(req.createdAt).toLocaleString('vi-VN')}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs w-fit border border-amber-200/80">
                                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Yêu cầu kiểm duyệt thay đổi
                                                </span>
                                            </div>

                                            {/* Reason Box */}
                                            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 mb-8 shadow-2xs">
                                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Lý do cập nhật từ HLV:
                                                </p>
                                                <p className="text-sm font-bold text-amber-950 leading-relaxed italic">"{req.reason}"</p>
                                            </div>

                                            {/* Changes Grid */}
                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <FileEdit className="w-4 h-4 text-blue-500" /> Các trường thông tin yêu cầu cập nhật mới:
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {Object.entries(req.requestedData).map(([key, value]) => {
                                                        if (!FIELD_LABELS[key]) return null;
                                                        const isWide = key === 'bio' || key === 'trainingPhilosophy' || key === 'certifications';
                                                        return (
                                                            <div key={key} className={`bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between ${isWide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">{FIELD_LABELS[key]}</p>
                                                                <div>{formatFieldValue(key, value)}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Action Sidebar */}
                                        <div className="bg-slate-50/80 p-6 sm:p-8 w-full xl:w-72 flex flex-col justify-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-200/80">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Quyết định phê duyệt</p>
                                            <Button onClick={() => handleReviewUpdate(req.id, 'APPROVE')} disabled={actionLoading === req.id + '_approve'} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 shadow-md shadow-emerald-500/20 font-extrabold text-sm transition-all hover:scale-[1.02] cursor-pointer">
                                                {actionLoading === req.id + '_approve' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" />Duyệt bản cập nhật</>}
                                            </Button>
                                            <div className="border-t border-slate-200 my-1" />
                                            <Button onClick={() => { setRejectModal(req.id); setMainTab('UPDATE'); }} disabled={actionLoading === req.id + '_reject'} variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-12 font-bold text-sm cursor-pointer">
                                                {actionLoading === req.id + '_reject' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-5 h-5 mr-2" />Từ chối yêu cầu</>}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {updatesTotalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-4">
                                    <Button variant="outline" disabled={updatesPage === 0} onClick={() => setUpdatesPage(p => p - 1)} className="rounded-xl font-bold">Trước</Button>
                                    <span className="flex items-center px-4 text-sm font-bold text-slate-600">Trang {updatesPage + 1} / {updatesTotalPages}</span>
                                    <Button variant="outline" disabled={updatesPage >= updatesTotalPages - 1} onClick={() => setUpdatesPage(p => p + 1)} className="rounded-xl font-bold">Sau</Button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Modal từ chối */}
            {rejectModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setRejectModal(null)}>
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-black text-2xl mb-2 text-slate-900">{mainTab === 'NEW' ? 'Từ chối hồ sơ PT' : 'Từ chối cập nhật hồ sơ'}</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-6">Bạn có thể ghi chú lý do chi tiết để Huấn luyện viên chỉnh sửa và gửi lại.</p>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2">Ghi chú phản hồi cho HLV *</label>
                        <textarea
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            className="w-full border border-slate-200 rounded-2xl p-4 text-sm min-h-[130px] mb-6 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold resize-none bg-slate-50 focus:bg-white transition-all"
                            placeholder="Ví dụ: Hình ảnh chứng chỉ bị mờ, không đọc được tên tổ chức cấp hoặc thông tin SĐT liên hệ chưa hợp lệ..."
                        />
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => { setRejectModal(null); setRejectNote(''); }} className="rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100 px-6 h-12">Hủy bỏ</Button>
                            <Button disabled={!rejectNote.trim() || actionLoading} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold px-6 h-12 shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5" onClick={() => mainTab === 'NEW' ? handleRejectNew() : handleReviewUpdate(rejectModal, 'REJECT')}>
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Xác nhận từ chối
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}