// src/pages/admin/PtVerificationPage.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Mail, BookOpen } from 'lucide-react';

export default function PtVerificationPage() {
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => { fetchPendingPts(); }, [page]);

  const fetchPendingPts = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPendingPts({ page, size: 10 });
      setPts(response.data.data.content || []);
      setTotalPages(response.data.data.totalPages);
    } catch (err) { toast.error('Không thể tải danh sách PT chờ duyệt'); } 
    finally { setLoading(false); }
  };

  const handleVerify = async (userId, ptType) => {
    try {
      setActionLoading(userId);
      await adminService.verifyPt(userId, { isVerified: true, ptType: ptType });
      toast.success(`Đã xác thực PT thành công với vai trò ${ptType === 'PT_CERTIFIED' ? 'Certified' : 'Freelance'} PT`);
      fetchPendingPts();
    } catch (err) { toast.error('Không thể xác thực PT'); } 
    finally { setActionLoading(null); }
  };

  const handleReject = async (userId) => {
    try {
      setActionLoading(userId);
      await adminService.verifyPt(userId, { action: 'REJECT' });
      toast.success('Đã từ chối hồ sơ PT');
      fetchPendingPts();
    } catch (err) { toast.error('Không thể từ chối hồ sơ PT'); } 
    finally { setActionLoading(null); }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Xác Thực PT</h1>
          <p className="text-slate-500 mt-1 font-medium">Xem xét và phê duyệt các hồ sơ đăng ký làm Huấn luyện viên.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">{[1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl bg-slate-200" />)}</div>
      ) : pts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Không có hồ sơ nào đang chờ duyệt!</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {pts.map((pt) => (
            <Card key={pt.userId || pt.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md">
              <CardContent className="p-0 flex flex-col md:flex-row">
                <div className="flex-1 p-8">
                  <div className="flex gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-xl overflow-hidden flex-shrink-0">
                      {pt.avatarUrl ? <img src={pt.avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(pt.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-bold text-slate-900 truncate">{pt.fullName}</h3>
                      <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5"><Mail className="w-4 h-4" /> {pt.email}</p>
                    </div>
                  </div>

                  {/* Chi tiết thông tin đăng ký PT */}
                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-4">
                    {pt.yearsOfExperience != null && (
                      <p className="text-sm font-semibold text-slate-700">
                        Kinh nghiệm: <span className="font-bold text-slate-850">{pt.yearsOfExperience} năm</span>
                      </p>
                    )}
                    {pt.specializations && pt.specializations.length > 0 && (
                      <p className="text-sm font-semibold text-slate-700">
                        Chuyên môn: <span className="font-bold text-slate-850">{pt.specializations.join(', ')}</span>
                      </p>
                    )}
                    {pt.certifications && (
                      <p className="text-sm font-semibold text-slate-700">
                        Chứng chỉ: <span className="font-medium text-slate-650">{pt.certifications}</span>
                      </p>
                    )}
                    {pt.bio && (
                      <p className="text-sm font-semibold text-slate-700">
                        Giới thiệu: <span className="font-medium text-slate-650 italic">"{pt.bio}"</span>
                      </p>
                    )}
                    {pt.cvUrl && (
                      <div className="mt-2">
                        <a 
                          href={pt.cvUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg"
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1" /> Xem CV đính kèm
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 p-8 w-full md:w-80 flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-slate-200/60">
                  <Button onClick={() => handleVerify(pt.userId || pt.id, 'PT_CERTIFIED')} disabled={actionLoading === (pt.userId || pt.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 shadow-sm font-bold">Duyệt Chuyên Nghiệp (Certified)</Button>
                  <Button onClick={() => handleVerify(pt.userId || pt.id, 'PT_FREELANCE')} disabled={actionLoading === (pt.userId || pt.id)} variant="outline" className="rounded-xl h-12 border-slate-200 font-bold text-slate-700 hover:bg-slate-100">Duyệt Tự Do (Freelance)</Button>
                  <Button onClick={() => handleReject(pt.userId || pt.id)} disabled={actionLoading === (pt.userId || pt.id)} variant="ghost" className="text-red-650 hover:bg-red-50 rounded-xl h-12 font-bold">Từ chối</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}