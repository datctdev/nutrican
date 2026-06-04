import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import { Check, X, FileText, Clock, Shield } from 'lucide-react';

export default function PtVerificationPage() {
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchPendingPts();
  }, [page]);

  const fetchPendingPts = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPendingPts({ page, size: 10 });
      setPts(response.data.data.content || []);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error('Error fetching pending PTs:', err);
      toast.error('Failed to load pending PTs');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, ptType) => {
    try {
      setActionLoading(userId);
      await adminService.verifyPt(userId, {
        isVerified: true,
        ptType: ptType,
      });
      toast.success(
        `PT verified successfully as ${ptType === 'PT_CERTIFIED' ? 'Certified' : 'Freelance'} PT`
      );
      fetchPendingPts();
    } catch (err) {
      console.error('Error verifying PT:', err);
      toast.error('Failed to verify PT');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId) => {
    try {
      setActionLoading(userId);
      await adminService.verifyPt(userId, {
        action: 'REJECT',
      });
      toast.success('PT application rejected');
      fetchPendingPts();
    } catch (err) {
      console.error('Error rejecting PT:', err);
      toast.error('Failed to reject PT');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PT Verification</h1>
          <p className="text-sm text-gray-500">Review and approve PT registration requests</p>
        </div>
        <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
          {pts.length} pending
        </span>
      </div>

      {pts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-1">No pending PT applications</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pts.map((pt) => (
            <Card key={pt.id} className="p-6">
              <div className="flex items-start gap-4">
                <Avatar src={pt.avatarUrl} alt={pt.fullName} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{pt.fullName}</h3>
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{pt.email}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Experience: </span>
                      <span className="font-medium">{pt.yearsOfExperience || 0} years</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Certifications: </span>
                      <span className="font-medium">{pt.certifications || 'N/A'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-500">Bio: </span>
                      <span className="text-gray-700">{pt.bio || 'No bio provided'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-500">Philosophy: </span>
                      <span className="text-gray-700">{pt.trainingPhilosophy || 'N/A'}</span>
                    </div>
                  </div>

                  {(pt.cvUrl || pt.documentUrls) && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">Documents:</p>
                      <div className="flex gap-2">
                        {pt.cvUrl && (
                          <a
                            href={pt.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            CV
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleVerify(pt.userId, 'PT_CERTIFIED')}
                      disabled={actionLoading === pt.userId}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {actionLoading === pt.userId ? 'Processing...' : 'Approve as Certified PT'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(pt.userId, 'PT_FREELANCE')}
                      disabled={actionLoading === pt.userId}
                    >
                      Approve as Freelance PT
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(pt.userId)}
                      disabled={actionLoading === pt.userId}
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
                onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
