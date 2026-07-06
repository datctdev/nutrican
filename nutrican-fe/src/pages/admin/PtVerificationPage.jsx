// src/pages/admin/PtVerificationPage.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import {
  CheckCircle2, XCircle, Clock, ShieldCheck, Mail, BookOpen,
  Award, MapPin, Phone, Monitor, Dumbbell, Globe, Calendar,
  ExternalLink, ZoomIn, Star, Loader2, Link2
} from 'lucide-react';

const TRAINING_MODE_LABEL = { ONLINE: 'Online', OFFLINE: 'Trực tiếp', BOTH: 'Cả hai' };
const TRAINING_MODE_ICON = { ONLINE: Monitor, OFFLINE: Dumbbell, BOTH: Globe };
const RATE_UNIT_LABEL = {
  SESSION_60: '/buổi 60p', SESSION_90: '/buổi 90p', HOUR: '/giờ', MONTH: '/tháng'
};

function CertImageModal({ url, onClose }) {
  if (!url) return null;
  const isPdf = url.includes('.pdf') || url.includes('pdf');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Ảnh chứng chỉ</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
        </div>
        <div className="p-4">
          {isPdf ? (
            <div className="text-center py-10">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-slate-600 mb-4">File PDF không thể xem trực tiếp</p>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                <ExternalLink className="w-4 h-4" /> Mở trong tab mới
              </a>
            </div>
          ) : (
            <img src={url} alt="Chứng chỉ" className="w-full rounded-2xl object-contain max-h-[70vh]" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function PtVerificationPage() {
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => { fetchPendingPts(); }, [page]);

  const fetchPendingPts = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPendingPts({ page, size: 10 });
      setPts(response.data.data.content || []);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      toast.error('Không thể tải danh sách PT chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, ptType) => {
    try {
      setActionLoading(userId + '_approve');
      await adminService.verifyPt(userId, { isVerified: true, ptType });
      toast.success(`Đã duyệt thành công với vai trò ${ptType === 'PT_CERTIFIED' ? 'Certified' : 'Freelance'} PT`);
      fetchPendingPts();
    } catch (err) {
      toast.error('Không thể xác thực PT');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId) => {
    try {
      setActionLoading(userId + '_reject');
      await adminService.verifyPt(userId, { action: 'REJECT' });
      toast.success('Đã từ chối hồ sơ PT');
      fetchPendingPts();
    } catch (err) {
      toast.error('Không thể từ chối hồ sơ PT');
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

  const formatMonthYear = (ym) => {
    if (!ym) return null;
    const [year, month] = ym.split('-');
    return `${month}/${year}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">
      {previewUrl && <CertImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Xét Duyệt PT</h1>
          <p className="text-slate-500 mt-1 font-medium">Xem xét hồ sơ và chứng chỉ của các ứng viên Huấn Luyện Viên.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">{[1, 2].map(i => <Skeleton key={i} className="h-96 w-full rounded-3xl bg-slate-200" />)}</div>
      ) : pts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Không có hồ sơ nào đang chờ duyệt!</h3>
          <p className="text-slate-500 mt-2">Tất cả hồ sơ đã được xử lý.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pts.map((pt) => {
            const uid = pt.userId || pt.id;
            const ModeIcon = TRAINING_MODE_ICON[pt.trainingMode] || Globe;
            const isActing = actionLoading === uid + '_approve' || actionLoading === uid + '_reject';
            return (
              <Card key={uid} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col xl:flex-row">
                    {/* Main info */}
                    <div className="flex-1 p-7">
                      {/* Header */}
                      <div className="flex gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0">
                          {pt.avatarUrl
                            ? <img src={pt.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : getInitials(pt.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-slate-900">{pt.fullName}</h3>
                          <div className="flex flex-wrap gap-3 mt-1">
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />{pt.email}
                            </span>
                            {pt.contactPhone && (
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />{pt.contactPhone}
                              </span>
                            )}
                          </div>
                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {pt.yearsOfExperience > 0 && (
                              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Calendar className="w-3 h-3" />{pt.yearsOfExperience} năm KN
                              </span>
                            )}
                            {pt.preferredTrack && (
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                pt.preferredTrack === 'CERTIFIED' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {pt.preferredTrack === 'CERTIFIED' ? <Award className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />}
                                Muốn làm {pt.preferredTrack === 'CERTIFIED' ? 'Certified' : 'Freelance'}
                              </span>
                            )}
                            {pt.trainingMode && (
                              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <ModeIcon className="w-3 h-3" />{TRAINING_MODE_LABEL[pt.trainingMode]}
                              </span>
                            )}
                            {pt.location && (
                              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <MapPin className="w-3 h-3" />{pt.location}
                              </span>
                            )}
                            {pt.hourlyRate && (
                              <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                                {parseInt(pt.hourlyRate).toLocaleString('vi-VN')}đ{RATE_UNIT_LABEL[pt.rateUnit] || ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-slate-100 pt-5">
                        {/* Left col */}
                        <div className="space-y-4">
                          {pt.bio && (
                            <div>
                              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Giới thiệu</p>
                              <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">"{pt.bio}"</p>
                            </div>
                          )}
                          {pt.trainingPhilosophy && (
                            <div>
                              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Triết lý huấn luyện</p>
                              <p className="text-sm text-slate-700 leading-relaxed line-clamp-2 italic">"{pt.trainingPhilosophy}"</p>
                            </div>
                          )}
                          {pt.specializations?.length > 0 && (
                            <div>
                              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Chuyên môn</p>
                              <div className="flex flex-wrap gap-1.5">
                                {pt.specializations.map(s => (
                                  <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Social links */}
                          <div className="flex gap-3">
                            {pt.cvUrl && (
                              <a href={pt.cvUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg gap-1">
                                <BookOpen className="w-3.5 h-3.5" />Xem CV
                              </a>
                            )}
                            {pt.instagramUrl && (
                              <a href={pt.instagramUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center text-xs font-bold text-pink-600 hover:underline bg-pink-50 px-3 py-1.5 rounded-lg gap-1">
                                <Link2 className="w-3.5 h-3.5" />Instagram
                              </a>
                            )}
                            {pt.linkedinUrl && (
                              <a href={pt.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center text-xs font-bold text-blue-700 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg gap-1">
                                <Link2 className="w-3.5 h-3.5" />LinkedIn
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Right col — Certifications */}
                        <div>
                          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            Chứng Chỉ ({pt.certifications?.length || 0})
                          </p>
                          {pt.certifications?.length > 0 ? (
                            <div className="space-y-3">
                              {pt.certifications.map((cert, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{cert.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{cert.issuingOrganization}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {formatMonthYear(cert.issueDate)}
                                      {cert.neverExpires
                                        ? ' — Không hết hạn ∞'
                                        : cert.expiryDate
                                        ? ` — ${formatMonthYear(cert.expiryDate)}`
                                        : ''}
                                    </p>
                                  </div>
                                  {cert.certificateImageUrl && (
                                    <button
                                      onClick={() => setPreviewUrl(cert.certificateImageUrl)}
                                      className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-amber-200 hover:ring-2 hover:ring-amber-400 transition-all relative group"
                                      title="Xem ảnh chứng chỉ"
                                    >
                                      <img src={cert.certificateImageUrl} alt={cert.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <ZoomIn className="w-4 h-4 text-white" />
                                      </div>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Không có chứng chỉ</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action sidebar */}
                    <div className="bg-slate-50 p-6 w-full xl:w-64 flex flex-col justify-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-200/60">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-1">Quyết định</p>
                      <Button
                        onClick={() => handleVerify(uid, 'PT_CERTIFIED')}
                        disabled={isActing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 shadow-sm font-bold text-sm"
                      >
                        {actionLoading === uid + '_approve'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Duyệt Certified</>}
                      </Button>
                      <Button
                        onClick={() => handleVerify(uid, 'PT_FREELANCE')}
                        disabled={isActing}
                        variant="outline"
                        className="rounded-xl h-11 border-slate-200 font-bold text-slate-700 hover:bg-slate-100 text-sm"
                      >
                        {actionLoading === uid + '_approve'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><Star className="w-4 h-4 mr-1.5" />Duyệt Freelance</>}
                      </Button>
                      <div className="border-t border-slate-200 my-1" />
                      <Button
                        onClick={() => handleReject(uid)}
                        disabled={isActing}
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl h-11 font-bold text-sm"
                      >
                        {actionLoading === uid + '_reject'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><XCircle className="w-4 h-4 mr-1.5" />Từ chối</>}
                      </Button>
                      <p className="text-xs text-slate-400 text-center mt-1 leading-relaxed">
                        Từ chối sẽ không khóa tài khoản người dùng.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-xl">Trước</Button>
          <span className="flex items-center px-4 text-sm font-semibold text-slate-600">Trang {page + 1} / {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="rounded-xl">Sau</Button>
        </div>
      )}
    </div>
  );
}