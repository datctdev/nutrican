// src/pages/admin/KycAdminPage.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Mail, FileText, ExternalLink, Calendar, MapPin, Search } from 'lucide-react';

export default function KycAdminPage() {
  const [kycs, setKycs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState(null);

  useEffect(() => { fetchKycs(); }, [page]);

  const fetchKycs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPendingKycs({ page, size: 10 });
      setKycs(response.data.data.content || []);
      setTotalPages(response.data.data.totalPages);
    } catch (err) { toast.error('Failed to load KYC list'); } 
    finally { setLoading(false); }
  };

  const handleApprove = async (userId) => {
    try {
      setActionLoading(userId);
      await adminService.approveKyc(userId);
      toast.success('KYC Approved Successfully');
      fetchKycs();
    } catch (err) { toast.error('Failed to approve KYC'); } 
    finally { setActionLoading(null); }
  };

  const openRejectModal = (kyc) => {
    setSelectedKyc(kyc); setRejectReason(''); setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    try {
      setActionLoading(selectedKyc.userId);
      await adminService.rejectKyc(selectedKyc.userId, rejectReason);
      toast.success('KYC Application Rejected');
      setShowRejectModal(false); setSelectedKyc(null); fetchKycs();
    } catch (err) { toast.error('Failed to reject KYC'); } 
    finally { setActionLoading(null); }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">KYC Verification</h1>
          <p className="text-slate-500 mt-1 font-medium">Review and approve user identity documents.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl border border-blue-200 font-bold text-sm flex items-center shadow-sm">
          <Clock className="w-4 h-4 mr-2" /> {kycs.length} Pending Reviews
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl bg-slate-200" />)}
        </div>
      ) : kycs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
          <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Inbox Zero!</h3>
          <p className="text-slate-500 mt-2 font-medium">No pending KYC verifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {kycs.map((kyc) => (
            <Card key={kyc.id} className="bg-white border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow rounded-3xl">
              <CardContent className="p-0 flex flex-col lg:flex-row">
                
                {/* Profile Summary */}
                <div className="lg:w-72 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-8 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-sm border border-slate-200 mb-4">
                    {kyc.avatarUrl ? (
                      <img src={kyc.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-bold text-2xl text-slate-400">
                        {getInitials(kyc.fullName)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{kyc.fullName}</h3>
                  <p className="text-sm text-slate-500 font-medium flex items-center justify-center gap-1.5"><Mail className="w-4 h-4" /> {kyc.email}</p>
                  
                  <div className="mt-6 pt-6 border-t border-slate-200 w-full">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                      <Clock className="w-3.5 h-3.5 mr-1.5" /> Pending Review
                    </span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3">Submitted on {new Date(kyc.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Identity Data & Actions */}
                <div className="flex-1 p-8">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3 flex items-center"><FileText className="w-4 h-4 mr-2" /> Identity Information</h4>
                  
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-400"/> ID Card Number</p>
                      <p className="text-lg font-black text-slate-800 font-mono tracking-wider">{kyc.idCardNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center"><Search className="w-3.5 h-3.5 mr-1 text-slate-400"/> Name on Card</p>
                      <p className="text-lg font-bold text-slate-800">{kyc.fullNameOnCard || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-slate-400"/> Date of Birth</p>
                      <p className="text-lg font-bold text-slate-800">{kyc.dateOfBirthOnCard || 'N/A'}</p>
                    </div>
                    {kyc.addressOnCard && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400"/> Address</p>
                        <p className="text-base font-semibold text-slate-700 leading-snug">{kyc.addressOnCard}</p>
                      </div>
                    )}
                  </div>

                  {(kyc.idCardFrontUrl || kyc.idCardBackUrl) && (
                    <div className="mb-8">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Identity Documents</p>
                      <div className="flex flex-wrap gap-4">
                        {kyc.idCardFrontUrl && (
                          <a href={kyc.idCardFrontUrl} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-3 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl text-sm font-bold text-slate-700 transition-all shadow-sm">
                            <FileText className="w-4 h-4 mr-2 text-blue-500" /> View ID Front <ExternalLink className="w-3.5 h-3.5 ml-2 text-slate-400" />
                          </a>
                        )}
                        {kyc.idCardBackUrl && (
                          <a href={kyc.idCardBackUrl} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-3 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl text-sm font-bold text-slate-700 transition-all shadow-sm">
                            <FileText className="w-4 h-4 mr-2 text-blue-500" /> View ID Back <ExternalLink className="w-3.5 h-3.5 ml-2 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
                    <Button onClick={() => handleApprove(kyc.userId)} disabled={actionLoading === kyc.userId} className="w-full sm:w-auto flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 shadow-sm shadow-emerald-500/20 text-base">
                      <CheckCircle2 className="w-5 h-5 mr-2" /> Approve Document
                    </Button>
                    <Button variant="outline" onClick={() => openRejectModal(kyc)} disabled={actionLoading === kyc.userId} className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-12 px-8">
                      <XCircle className="w-5 h-5 mr-2" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-6">
              <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 bg-white shadow-sm">Previous</Button>
              <div className="flex items-center px-4 font-bold text-slate-500">Page {page + 1} of {totalPages}</div>
              <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 bg-white shadow-sm">Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowRejectModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-0">
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 text-center mb-2">Reject KYC?</h3>
                <p className="text-slate-500 text-center font-medium mb-6">
                  Please provide a reason for rejecting the application of <strong className="text-slate-700">{selectedKyc?.fullName}</strong>.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Rejection Reason</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows="3"
                      placeholder="e.g., ID card image is blurred..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none font-medium"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 border-slate-200 rounded-xl h-12 font-bold" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                    <Button variant="destructive" className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl h-12 font-bold shadow-md" onClick={handleReject} disabled={actionLoading === selectedKyc?.userId}>Confirm Reject</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}