// src/pages/customer/KycPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { Shield, CheckCircle2, Clock, XCircle, AlertTriangle, UploadCloud, FileText, UserSquare, Calendar, MapPin, ArrowRight } from 'lucide-react';

export default function KycPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    idCardNumber: '', fullNameOnCard: '', dateOfBirthOnCard: '',
    addressOnCard: '', idCardFrontUrl: '', idCardBackUrl: '',
  });

  useEffect(() => { fetchKycStatus(); }, []);

  const fetchKycStatus = async () => {
    try {
      setLoading(true);
      const response = await authService.getKycStatus();
      setKycStatus(response.data.data);
    } catch (err) {
      if (err.response?.status !== 401) console.error(err);
    } finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.idCardNumber || !formData.fullNameOnCard) {
      return toast.error('ID card number and full name are required');
    }
    try {
      setSubmitting(true);
      await authService.submitKyc(formData);
      toast.success('KYC submitted successfully!', { description: 'Awaiting admin review.' });
      fetchKycStatus();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit KYC'); } 
    finally { setSubmitting(false); }
  };

  const StatusBanner = () => {
    if (!kycStatus) return null;
    const status = kycStatus.verificationStatus;

    const banners = {
      'NOT_SUBMITTED': { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', title: 'KYC Required', desc: 'Submit your ID card to unlock PT registration and advanced features.' },
      'PENDING_APPROVAL': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', title: 'Under Review', desc: 'Your documents are being reviewed. This usually takes 1-2 business days.' },
      'ACTIVE': { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'Verified', desc: 'Your identity has been verified successfully.' },
      'SUSPENDED': { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', title: 'Rejected', desc: kycStatus.rejectionReason ? `Reason: ${kycStatus.rejectionReason}` : 'Application rejected. Please resubmit.' }
    };

    const config = banners[status];
    if (!config) return null;
    const Icon = config.icon;

    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border ${config.bg} ${config.border} mb-8 shadow-sm`}>
        <div className="flex items-start sm:items-center gap-4">
          <div className={`p-2.5 rounded-full bg-white shadow-sm ${config.color}`}><Icon className="w-6 h-6" /></div>
          <div>
            <h3 className={`font-bold ${config.color}`}>{config.title}</h3>
            <p className="text-sm text-slate-600 font-medium mt-0.5">{config.desc}</p>
          </div>
        </div>
        {status === 'ACTIVE' && user?.role === 'CUSTOMER' && (
          <Button onClick={() => navigate('/register/pt')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shrink-0">
            <FileText className="w-4 h-4 mr-2" /> Apply as PT
          </Button>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12"><Skeleton className="h-32 w-full rounded-3xl" /><Skeleton className="h-96 w-full rounded-3xl" /></div>
  );

  const isEditable = !kycStatus || ['NOT_SUBMITTED', 'SUSPENDED'].includes(kycStatus.verificationStatus);

  const InputField = ({ icon: Icon, label, type="text", required=false, ...props }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-slate-700">{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="relative flex items-center">
        <Icon className="absolute left-3.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
        <input type={type} required={required} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" {...props} />
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Identity Verification</h1>
        <p className="text-slate-500 font-medium">Complete KYC to ensure a safe community for everyone.</p>
      </div>

      <StatusBanner />

      {isEditable ? (
        <Card className="bg-white border-slate-200 shadow-xl rounded-3xl overflow-hidden relative">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 w-full absolute top-0 left-0" />
          <CardContent className="p-8 pt-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                <InputField icon={UserSquare} label="ID Card Number" name="idCardNumber" value={formData.idCardNumber} onChange={handleChange} placeholder="e.g. 012345678901" required />
                <InputField icon={UserSquare} label="Full Name on Card" name="fullNameOnCard" value={formData.fullNameOnCard} onChange={handleChange} placeholder="As printed on your ID" required />
                <InputField icon={Calendar} label="Date of Birth" type="date" name="dateOfBirthOnCard" value={formData.dateOfBirthOnCard} onChange={handleChange} />
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Address on Card</label>
                  <div className="relative flex">
                    <MapPin className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                    <textarea name="addressOnCard" value={formData.addressOnCard} onChange={handleChange} rows="2" placeholder="Full residential address" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><FileText className="w-4 h-4 mr-2 text-blue-500" /> Document Links</h4>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-5 flex items-center gap-3">
                  <UploadCloud className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-800 font-medium">Please upload your ID images to MinIO and paste the direct URLs below.</p>
                </div>
                <div className="space-y-4">
                  <InputField icon={FileText} label="ID Card Front URL" type="url" name="idCardFrontUrl" value={formData.idCardFrontUrl} onChange={handleChange} placeholder="https://..." />
                  <InputField icon={FileText} label="ID Card Back URL" type="url" name="idCardBackUrl" value={formData.idCardBackUrl} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-14 text-lg font-bold shadow-md transition-all hover:-translate-y-0.5" disabled={submitting}>
                  {submitting ? 'Submitting...' : <>Submit for Verification <ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        kycsStatus?.verificationStatus !== 'NOT_SUBMITTED' && (
          <Card className="bg-slate-50 border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-500" /> Submitted Details</h3>
              <div className="grid sm:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">ID Number</p>
                  <p className="font-semibold text-slate-900">{kycStatus.idCardNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name on Card</p>
                  <p className="font-semibold text-slate-900">{kycStatus.fullNameOnCard || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Birth</p>
                  <p className="font-semibold text-slate-900">{kycStatus.dateOfBirthOnCard || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <p className="font-bold text-blue-600 capitalize">{kycStatus.verificationStatus?.replace('_', ' ').toLowerCase()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}