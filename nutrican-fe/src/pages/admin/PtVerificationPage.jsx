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
      setPts(response.data.data.content);
      setTotalPages(response.data.data.totalPages);
    } catch (err) { toast.error('Failed to load pending PTs'); } 
    finally { setLoading(false); }
  };

  const handleVerify = async (userId, role) => {
    try {
      setActionLoading(userId);
      await adminService.verifyPt(userId, { approved: true, role: role });
      toast.success('PT verified successfully');
      fetchPendingPts();
    } catch (err) { toast.error('Failed to verify PT'); } 
    finally { setActionLoading(null); }
  };

  const handleReject = async (userId) => {
    try {
      setActionLoading(userId);
      await adminService.verifyPt(userId, { approved: false });
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
        <div className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl border border-amber-200 font-bold text-sm flex items-center shadow-sm">
          <Clock className="w-4 h-4 mr-2" /> {pts.length} Pending Approvals
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl bg-slate-200" />)}
        </div>
      ) : pts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
          <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Inbox Zero!</h3>
          <p className="text-slate-500 mt-2 font-medium">All personal trainer applications have been processed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pts.map((pt) => (
            <Card key={pt.userId || pt.id} className="bg-white border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0 flex flex-col md:flex-row">
                {/* Info Section */}
                <div className="flex-1 p-8">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl border border-slate-200 shadow-sm">
                      {pt.avatarUrl ? <img src={pt.avatarUrl} alt="Avatar" className="w-full h-full rounded-2xl object-cover" /> : getInitials(pt.fullName)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">{pt.fullName}</h3>
                        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest border border-amber-200">Pending</span>
                      </div>
                      <p className="flex items-center text-slate-500 text-sm mt-1 font-medium"><Mail className="w-4 h-4 mr-1.5" /> {pt.email}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 mt-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</p>
                      <p className="font-black text-slate-800 text-lg">{pt.yearsOfExperience || 0} Years</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Certifications</p>
                      <p className="font-bold text-slate-800 truncate" title={pt.certifications}>{pt.certifications || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Professional Bio</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">{pt.bio || 'No bio provided.'}</p>
                  </div>

                  {(pt.cvUrl || pt.documentUrls) && (
                    <div className="mt-6">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attachments</p>
                      <div className="flex gap-3">
                        {pt.cvUrl && (
                          <a href={pt.cvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-blue-300 rounded-xl text-sm font-bold text-slate-700 transition-colors shadow-sm">
                            <BookOpen className="w-4 h-4 mr-2 text-blue-500" /> View CV / Resume
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Section */}
                <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-8 w-full md:w-80 flex flex-col justify-center gap-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Verification Actions</h4>
                  
                  <Button 
                    onClick={() => handleVerify(pt.userId, 'PT_CERTIFIED')} 
                    disabled={actionLoading === pt.userId} 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 shadow-sm shadow-emerald-500/20"
                  >
                    <ShieldCheck className="w-5 h-5 mr-2" /> Approve as Certified (Tier 1)
                  </Button>
                  
                  <Button 
                    onClick={() => handleVerify(pt.userId, 'PT_FREELANCE')} 
                    disabled={actionLoading === pt.userId}
                    variant="outline" 
                    className="w-full bg-white border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl h-12 shadow-sm"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Approve as Freelance
                  </Button>
                  
                  <div className="h-px bg-slate-200 my-2" />
                  
                  <Button 
                    onClick={() => handleReject(pt.userId)} 
                    disabled={actionLoading === pt.userId}
                    variant="ghost" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-12"
                  >
                    <XCircle className="w-5 h-5 mr-2" /> Reject Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-6">
              <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 bg-white shadow-sm">Previous</Button>
              <div className="flex items-center px-4 font-bold text-slate-500">Page {page + 1} of {totalPages}</div>
              <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 bg-white shadow-sm">Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}