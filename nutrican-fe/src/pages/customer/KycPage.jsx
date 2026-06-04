import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { toast } from 'sonner';
import { Shield, Check, Clock, X, AlertCircle, Upload, FileText } from 'lucide-react';

export default function KycPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    idCardNumber: '',
    fullNameOnCard: '',
    dateOfBirthOnCard: '',
    addressOnCard: '',
    idCardFrontUrl: '',
    idCardBackUrl: '',
  });

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      setLoading(true);
      const response = await authService.getKycStatus();
      setKycStatus(response.data.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Error fetching KYC status:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.idCardNumber || !formData.fullNameOnCard) {
      toast.error('ID card number and full name on card are required');
      return;
    }

    try {
      setSubmitting(true);
      await authService.submitKyc(formData);
      toast.success('KYC submitted successfully! Awaiting admin review.');
      fetchKycStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusUI = () => {
    if (!kycStatus) return null;
    const status = kycStatus.verificationStatus;

    if (status === 'NOT_SUBMITTED') {
      return (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">KYC Not Submitted</p>
            <p className="text-sm text-amber-700 mt-1">Submit your ID card to unlock PT registration and access advanced features.</p>
          </div>
        </div>
      );
    }

    if (status === 'PENDING_APPROVAL') {
      return (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">KYC Under Review</p>
            <p className="text-sm text-blue-700 mt-1">Your KYC documents are being reviewed by our admin team. This usually takes 1-2 business days.</p>
          </div>
        </div>
      );
    }

    if (status === 'ACTIVE') {
      return (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">KYC Verified</p>
            <p className="text-sm text-green-700 mt-1">Your identity has been verified. You can now request PT status.</p>
            {user?.role === 'CUSTOMER' && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => navigate('/register/pt')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Apply as PT
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (status === 'SUSPENDED') {
      return (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">KYC Rejected</p>
            <p className="text-sm text-red-700 mt-1">
              {kycStatus.rejectionReason
                ? `Reason: ${kycStatus.rejectionReason}`
                : 'Your KYC was rejected. Please resubmit with correct information.'}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) return <Spinner />;

  const isEditable = !kycStatus || ['NOT_SUBMITTED', 'SUSPENDED'].includes(kycStatus.verificationStatus);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
          <p className="text-sm text-gray-500">Submit your ID card for identity verification</p>
        </div>
      </div>

      {getStatusUI()}

      {isEditable && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">ID Card Information</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Card Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="idCardNumber"
                  value={formData.idCardNumber}
                  onChange={handleChange}
                  placeholder="e.g., 012345678901"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name on Card <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullNameOnCard"
                  value={formData.fullNameOnCard}
                  onChange={handleChange}
                  placeholder="Name as printed on your ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirthOnCard"
                  value={formData.dateOfBirthOnCard}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Card Front URL</label>
                <input
                  type="url"
                  name="idCardFrontUrl"
                  value={formData.idCardFrontUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address on Card</label>
              <textarea
                name="addressOnCard"
                value={formData.addressOnCard}
                onChange={handleChange}
                rows="2"
                placeholder="Address as printed on your ID card"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Card Back URL</label>
              <input
                type="url"
                name="idCardBackUrl"
                value={formData.idCardBackUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <Upload className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">
                Upload your ID card images to MinIO and paste the URLs above.
              </p>
            </div>

            <Button type="submit" className="w-full" loading={submitting}>
              Submit KYC
            </Button>
          </form>
        </Card>
      )}

      {kycStatus && kycStatus.verificationStatus !== 'NOT_SUBMITTED' && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Submitted Information</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ID Card Number</span>
              <p className="font-medium text-gray-900">{kycStatus.idCardNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Full Name on Card</span>
              <p className="font-medium text-gray-900">{kycStatus.fullNameOnCard || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Date of Birth</span>
              <p className="font-medium text-gray-900">{kycStatus.dateOfBirthOnCard || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Verification Status</span>
              <p className="font-medium text-gray-900 capitalize">
                {kycStatus.verificationStatus?.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
