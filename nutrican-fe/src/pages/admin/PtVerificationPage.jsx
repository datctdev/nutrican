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

const TRAINING_MODE_LABEL = { ONLINE: 'Online', OFFLINE: 'Trực tiếp', BOTH: 'Cả hai' };
const TRAINING_MODE_ICON = { ONLINE: Monitor, OFFLINE: Dumbbell, BOTH: Globe };
const RATE_UNIT_LABEL = { SESSION_60: '/buổi 60p', SESSION_90: '/buổi 90p', HOUR: '/giờ', MONTH: '/tháng' };
const GENDER_LABEL = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

const FIELD_LABELS = {
    bio: 'Tiểu sử',
    trainingPhilosophy: 'Triết lý huấn luyện',
    contactPhone: 'SĐT Liên hệ',
    trainingMode: 'Hình thức',
    location: 'Địa điểm',
    hourlyRate: 'Phí dịch vụ',
    rateUnit: 'Đơn vị tính',
    specializations: 'Chuyên môn',
    preferredGoals: 'Mục tiêu hỗ trợ',
    preferredDietTypes: 'Chế độ ăn khuyến nghị',
    certifications: 'Chứng chỉ chuyên môn',
    instagramUrl: 'Instagram',
    linkedinUrl: 'LinkedIn',
    cvUrl: 'Link CV',
    gender: 'Giới tính',
    experienceStartDate: 'Kinh nghiệm từ tháng'
};

function CertImageModal({ url, onClose }) {
    if (!url) return null;
    const isPdf = url.includes('.pdf') || url.includes('pdf');
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><ZoomIn className="w-5 h-5"/> Xem hình ảnh</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-lg border border-slate-200 transition-all">✕</button>
                </div>
                <div className="p-4 bg-slate-100 flex justify-center">
                    {isPdf ? (
                        <div className="text-center py-10 bg-white w-full rounded-2xl">
                            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <p className="font-medium text-slate-600 mb-4">File PDF không thể xem trực tiếp</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                                <ExternalLink className="w-4 h-4" /> Mở trong tab mới
                            </a>
                        </div>
                    ) : (
                        <img src={url} alt="Chứng chỉ" className="rounded-2xl object-contain max-h-[70vh] shadow-sm bg-white" />
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

    const formatFieldValue = (key, value) => {
        if (value === null || value === undefined || value === '') return <span className="text-slate-400 italic">Trống</span>;
        if (key === 'certifications') {
            return (
                <div className="space-y-2 mt-2">
                    {value.map((c, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="font-bold text-sm text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{c.issuingOrganization}</p>
                            {c.certificateImageUrl && (
                                <button onClick={() => setPreviewUrl(c.certificateImageUrl)} className="text-xs font-bold text-blue-600 hover:underline mt-1.5 flex items-center gap-1">
                                    <ZoomIn className="w-3.5 h-3.5"/> Xem ảnh minh chứng
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        if (Array.isArray(value)) return <div className="flex flex-wrap gap-1.5 mt-1">{value.map(v => <span key={v} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-bold">{v}</span>)}</div>;
        if (key === 'hourlyRate') return <span className="font-black text-emerald-600">{Number(value).toLocaleString('vi-VN')}đ</span>;
        if (key === 'trainingMode') return <span className="font-bold">{TRAINING_MODE_LABEL[value] || value}</span>;
        if (key === 'gender') return <span className="font-bold">{GENDER_LABEL[value] || value}</span>;
        if (key.includes('Url')) return <a href={value} target="_blank" className="text-blue-600 hover:underline text-sm break-all font-medium">{value}</a>;
        return <span className="text-sm font-medium whitespace-pre-wrap">{String(value)}</span>;
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in mt-6 px-4">
            {previewUrl && <CertImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Xét Duyệt Hồ Sơ PT</h1>
                    <p className="text-slate-500 mt-1 font-medium">Quản lý và phê duyệt thông tin chuyên môn của Huấn Luyện Viên.</p>
                </div>
            </div>

            {/* TABS CHÍNH */}
            <div className="flex gap-6 border-b border-slate-200">
                <button
                    className={`pb-4 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${mainTab === 'NEW' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setMainTab('NEW'); setPtsPage(0); }}
                >
                    <UserPlus className="w-4 h-4" /> PT Đăng ký mới
                    {mainTab === 'NEW' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                </button>
                <button
                    className={`pb-4 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${mainTab === 'UPDATE' ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setMainTab('UPDATE'); setUpdatesPage(0); }}
                >
                    <FileEdit className="w-4 h-4" /> PT Xin đổi hồ sơ
                    {mainTab === 'UPDATE' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-600 rounded-t-full"></span>}
                </button>
                <Button variant="ghost" onClick={mainTab === 'NEW' ? fetchPendingPts : fetchUpdateRequests} className="ml-auto text-slate-500 hover:bg-slate-100 rounded-xl h-9">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {loading ? (
                <div className="space-y-6">{[1, 2].map(i => <Skeleton key={i} className="h-96 w-full rounded-3xl bg-slate-200" />)}</div>
            ) : mainTab === 'NEW' ? (
                <>
                    <div className="flex justify-end mb-4">
                        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            {['ALL', 'CERTIFIED', 'FREELANCE'].map((t) => (
                                <button key={t} type="button" onClick={() => setTrackFilter(t)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${trackFilter === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {t === 'ALL' ? 'Tất cả' : t === 'CERTIFIED' ? 'Certified' : 'Freelance'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {pts.filter((pt) => trackFilter === 'ALL' || pt.preferredTrack === trackFilter).length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm border-dashed">
                            <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Không có PT đăng ký mới</h3>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {pts.filter((pt) => trackFilter === 'ALL' || pt.preferredTrack === trackFilter).map((pt) => {
                                const uid = pt.userId || pt.id;
                                const ModeIcon = TRAINING_MODE_ICON[pt.trainingMode] || Globe;
                                const isActing = actionLoading === uid + '_approve' || actionLoading === uid + '_reject';
                                const activeDocTab = docTab[uid] || 'CV';
                                return (
                                    <Card key={uid} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                        <CardContent className="p-0 flex flex-col xl:flex-row">
                                            <div className="flex-1 p-7">
                                                <div className="flex gap-4 mb-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xl overflow-hidden flex-shrink-0 border border-blue-100">
                                                        {pt.avatarUrl ? <img src={pt.avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(pt.fullName)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-xl font-extrabold text-slate-900">{pt.fullName}</h3>
                                                        <div className="flex flex-wrap gap-3 mt-1">
                                                            <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{pt.email}</span>
                                                            {pt.contactPhone && <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{pt.contactPhone}</span>}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {pt.preferredTrack && (
                                                                <span className={`text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 ${pt.preferredTrack === 'CERTIFIED' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {pt.preferredTrack === 'CERTIFIED' ? <Award className="w-3.5 h-3.5" /> : <Dumbbell className="w-3.5 h-3.5" />}
                                                                    Ứng tuyển {pt.preferredTrack === 'CERTIFIED' ? 'Certified' : 'Freelance'} PT
                                                    </span>
                                                            )}
                                                            {pt.trainingMode && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg flex items-center gap-1.5"><ModeIcon className="w-3.5 h-3.5" />{TRAINING_MODE_LABEL[pt.trainingMode]}</span>}
                                                            {pt.location && <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{pt.location}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                                                    <div className="space-y-4">
                                                        {pt.bio && (<div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giới thiệu</p><p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{pt.bio}</p></div>)}
                                                        {pt.specializations?.length > 0 && (<div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chuyên môn</p><div className="flex flex-wrap gap-1.5">{pt.specializations.map(s => (<span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-bold">{s}</span>))}</div></div>)}
                                                    </div>
                                                    <div>
                                                        <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-xl w-fit border border-slate-200">
                                                            {['CV', 'CERT'].map((tab) => (
                                                                <button key={tab} type="button" onClick={() => setDocTab((prev) => ({ ...prev, [uid]: tab }))}
                                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeDocTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                                                    {tab === 'CV' ? 'CV & Profile' : `Chứng chỉ (${pt.certifications?.length || 0})`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {activeDocTab === 'CV' ? (
                                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                                                {pt.cvUrl ? (<a href={pt.cvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-bold text-blue-700 hover:text-blue-800 bg-blue-100/50 hover:bg-blue-100 p-3 rounded-xl gap-2 transition-colors"><BookOpen className="w-4 h-4" /> Mở file CV PDF</a>) : (<p className="text-sm text-slate-400 italic text-center py-4">Chưa có CV</p>)}
                                                                <div className="flex gap-2">
                                                                    {pt.instagramUrl && <a href={pt.instagramUrl} target="_blank" className="flex-1 text-center text-xs font-bold text-pink-700 bg-pink-100 hover:bg-pink-200 p-2 rounded-xl">Instagram</a>}
                                                                    {pt.linkedinUrl && <a href={pt.linkedinUrl} target="_blank" className="flex-1 text-center text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 p-2 rounded-xl">LinkedIn</a>}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {pt.certifications?.length > 0 ? pt.certifications.map((cert, i) => (
                                                                    <div key={i} className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-bold text-slate-800 text-sm">{cert.name}</p>
                                                                            <p className="text-xs text-slate-600 mt-1">{cert.issuingOrganization}</p>
                                                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{formatMonthYear(cert.issueDate)} {cert.neverExpires ? '— Vô thời hạn' : cert.expiryDate ? `đến ${formatMonthYear(cert.expiryDate)}` : ''}</p>
                                                                        </div>
                                                                        {cert.certificateImageUrl && (
                                                                            <button onClick={() => setPreviewUrl(cert.certificateImageUrl)} className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-200 hover:border-amber-400 transition-all relative group shadow-sm bg-white" title="Xem ảnh">
                                                                                <img src={cert.certificateImageUrl} alt={cert.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }}/>
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ZoomIn className="w-5 h-5 text-white" /></div>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )) : <p className="text-sm text-slate-400 italic">Không có chứng chỉ</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-6 w-full xl:w-72 flex flex-col justify-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-200/60">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Quyết định phê duyệt</p>
                                                <Button onClick={() => handleVerifyNew(uid, 'PT_CERTIFIED')} disabled={isActing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 shadow-md shadow-emerald-500/20 font-bold text-sm transition-all hover:-translate-y-0.5">
                                                    {actionLoading === uid + '_approve' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" />Duyệt Certified PT</>}
                                                </Button>
                                                <Button onClick={() => handleVerifyNew(uid, 'PT_FREELANCE')} disabled={isActing} variant="outline" className="rounded-xl h-12 border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 text-sm transition-all">
                                                    {actionLoading === uid + '_approve' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Star className="w-5 h-5 mr-2 text-amber-500" />Duyệt Freelance PT</>}
                                                </Button>
                                                <div className="border-t border-slate-200 my-2" />
                                                <Button onClick={() => { setRejectModal(uid); setMainTab('NEW'); }} disabled={isActing} variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-12 font-bold text-sm">
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
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm border-dashed">
                            <FileEdit className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Không có yêu cầu cập nhật hồ sơ nào</h3>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {updateRequests.map((req) => (
                                <Card key={req.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                    <CardContent className="p-0 flex flex-col xl:flex-row">
                                        <div className="flex-1 p-7">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-black text-lg overflow-hidden flex-shrink-0 border border-amber-200 shadow-sm">
                                                    {req.ptAvatar ? <img src={req.ptAvatar} alt="" className="w-full h-full object-cover" /> : getInitials(req.ptName)}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-extrabold text-slate-900">{req.ptName}</h3>
                                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                        Gửi lúc {new Date(req.createdAt).toLocaleString('vi-VN')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 mb-6">
                                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Lý do cập nhật từ PT
                                                </p>
                                                <p className="text-sm font-semibold text-amber-900 leading-relaxed">{req.reason}</p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Các trường thông tin yêu cầu thay đổi</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {Object.entries(req.requestedData).map(([key, value]) => {
                                                        if (!FIELD_LABELS[key]) return null; // Ẩn các trường không mapping
                                                        return (
                                                            <div key={key} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">{FIELD_LABELS[key]}</p>
                                                                {formatFieldValue(key, value)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-6 w-full xl:w-72 flex flex-col justify-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-200/60">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Quyết định phê duyệt</p>
                                            <Button onClick={() => handleReviewUpdate(req.id, 'APPROVE')} disabled={actionLoading === req.id + '_approve'} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 shadow-md shadow-emerald-500/20 font-bold text-sm transition-all hover:-translate-y-0.5">
                                                {actionLoading === req.id + '_approve' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" />Duyệt cập nhật</>}
                                            </Button>
                                            <div className="border-t border-slate-200 my-2" />
                                            <Button onClick={() => { setRejectModal(req.id); setMainTab('UPDATE'); }} disabled={actionLoading === req.id + '_reject'} variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-12 font-bold text-sm">
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

            {/* Modal Từ Chối Chung Cho Cả 2 Tab */}
            {rejectModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setRejectModal(null)}>
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-black text-2xl mb-2 text-slate-900">{mainTab === 'NEW' ? 'Từ chối hồ sơ PT' : 'Từ chối cập nhật hồ sơ'}</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-6">Bạn có thể ghi chú lý do để Huấn luyện viên chỉnh sửa và gửi lại.</p>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Ghi chú gửi cho PT *</label>
                        <textarea
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-4 text-sm min-h-[120px] mb-6 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium resize-none bg-slate-50"
                            placeholder="Ví dụ: Hình ảnh chứng chỉ bị mờ, không đọc được tên tổ chức cấp..."
                        />
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => { setRejectModal(null); setRejectNote(''); }} className="rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100 px-6 h-12">Hủy</Button>
                            <Button disabled={!rejectNote.trim() || actionLoading} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold px-6 h-12 shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5" onClick={() => mainTab === 'NEW' ? handleRejectNew() : handleReviewUpdate(rejectModal, 'REJECT')}>
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác nhận từ chối'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}