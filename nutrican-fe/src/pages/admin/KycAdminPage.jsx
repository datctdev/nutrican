import { useState, useEffect } from 'react';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import { Check, X, FileText, Clock, Shield, ExternalLink, Search } from 'lucide-react';

export default function KycAdminPage() {
  const [kycs, setKycs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState(null);

  useEffect(() => {
    fetchKycs();
  }, [page]);

  const fetchKycs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPendingKycs({ page, size: 10 });
      setKycs(response.data.data.content || []);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error('Error fetching KYC list:', err);
      toast.error('Failed to load KYC list');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      setActionLoading(userId);
      await adminService.approveKyc(userId);
      toast.success('KYC approved successfully');
      fetchKycs();
    } catch (err) {
      console.error('Error approving KYC:', err);
      toast.error('Failed to approve KYC');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (kyc) => {
    setSelectedKyc(kyc);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(selectedKyc.userId);
      await adminService.rejectKyc(selectedKyc.userId, rejectReason);
      toast.success('KYC rejected');
      setShowRejectModal(false);
      setSelectedKyc(null);
      fetchKycs();
    } catch (err) {
      console.error('Error rejecting KYC:', err);
      toast.error('Failed to reject KYC');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-sm text-gray-500">Review and approve identity verification documents</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
          {kycs.length} pending
        </span>
      </div>

      {kycs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-1">No pending KYC verifications</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {kycs.map((kyc) => (
            <Card key={kyc.id} className="p-6">
              <div className="flex items-start gap-4">
                <Avatar
                  src={kyc.avatarUrl}
                  alt={kyc.fullName}
                  size="lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{kyc.fullName}</h3>
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{kyc.email}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">ID Card Number: </span>
                      <span className="font-medium">{kyc.idCardNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Full Name on Card: </span>
                      <span className="font-medium">{kyc.fullNameOnCard || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date of Birth: </span>
                      <span className="font-medium">{kyc.dateOfBirthOnCard || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Submitted: </span>
                      <span className="font-medium">
                        {kyc.createdAt ? new Date(kyc.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {kyc.addressOnCard && (
                      <div className="md:col-span-2">
                        <span className="text-gray-500">Address on Card: </span>
                        <span className="font-medium">{kyc.addressOnCard}</span>
                      </div>
                    )}
                  </div>

                  {(kyc.idCardFrontUrl || kyc.idCardBackUrl) && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">ID Card Documents:</p>
                      <div className="flex gap-2">
                        {kyc.idCardFrontUrl && (
                          <a
                            href={kyc.idCardFrontUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            Front
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {kyc.idCardBackUrl && (
                          <a
                            href={kyc.idCardBackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            Back
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(kyc.userId)}
                      disabled={actionLoading === kyc.userId}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {actionLoading === kyc.userId ? 'Processing...' : 'Approve KYC'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openRejectModal(kyc)}
                      disabled={actionLoading === kyc.userId}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {showRejectModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowRejectModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 relative">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject KYC</h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide a reason for rejecting KYC for <strong>{selectedKyc?.fullName}</strong>.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows="3"
                placeholder="e.g., ID card name does not match registered name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={actionLoading === selectedKyc?.userId}
                >
                  Confirm Reject
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
