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
    } catch (err) { toast.error('Failed to load pending PTs'); } 
    finally { setLoading(false); }
  };

  const handleVerify = async (userId, ptType) => {
    try {
      setActionLoading(userId);
      // GỌI API THEO CHUẨN MỚI CỦA BACKEND MAIN
      await adminService.verifyPt(userId, { isVerified: true, ptType: ptType });
      toast.success(`PT verified successfully as ${ptType === 'PT_CERTIFIED' ? 'Certified' : 'Freelance'} PT`);
      fetchPendingPts();
    } catch (err) { toast.error('Failed to verify PT'); } 
    finally { setActionLoading(null); }
  };

  const handleReject = async (userId) => {
    try {
      setActionLoading(userId);
      await adminService.verifyPt(userId, { action: 'REJECT' });
      toast.success('PT application rejected');
      fetchPendingPts();
    } catch (err) { toast.error('Failed to reject PT'); } 
    finally { setActionLoading(null); }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">PT Verification</h1>
          <p className="text-slate-500 mt-1 font-medium">Review and approve Personal Trainer applications.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">{[1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl bg-slate-200" />)}</div>
      ) : pts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Inbox Zero!</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {pts.map((pt) => (
            <Card key={pt.userId || pt.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md">
              <CardContent className="p-0 flex flex-col md:flex-row">
                <div className="flex-1 p-8">
                  <div className="flex gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-xl">{pt.avatarUrl ? <img src={pt.avatarUrl} alt="" className="rounded-2xl" /> : getInitials(pt.fullName)}</div>
                    <div>
                      <h3 className="text-xl font-bold">{pt.fullName}</h3>
                      <p className="text-slate-500 text-sm mt-1">{pt.email}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 w-full md:w-80 flex flex-col gap-4">
                  <Button onClick={() => handleVerify(pt.userId || pt.id, 'PT_CERTIFIED')} disabled={actionLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 shadow-sm">Approve Certified</Button>
                  <Button onClick={() => handleVerify(pt.userId || pt.id, 'PT_FREELANCE')} disabled={actionLoading} variant="outline" className="rounded-xl h-12">Approve Freelance</Button>
                  <Button onClick={() => handleReject(pt.userId || pt.id)} disabled={actionLoading} variant="ghost" className="text-red-600 hover:bg-red-50 rounded-xl h-12">Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}