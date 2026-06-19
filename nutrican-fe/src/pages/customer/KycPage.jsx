// src/pages/customer/KycPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  Shield, CheckCircle2, Clock, XCircle, AlertTriangle,
  FileText, Camera, ArrowRight, RotateCcw, Loader2,
  User, Briefcase, Award, FileUp, GraduationCap, Sparkles,
  Users, TrendingUp, Star, ChevronRight, Mail, Phone, UploadCloud
} from 'lucide-react';

export default function KycPage() {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuthStore();

  // Check KYC status - initialize from auth store directly
  const [isKycVerified, setIsKycVerified] = useState(
    () => user?.isKycVerified || localStorage.getItem('isKycVerified') === 'true' || false
  );
  const [hasPtProfile, setHasPtProfile] = useState(false);
  const [ptProfileStatus, setPtProfileStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // KYC Session state
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);

  // PT Registration state
  const [ptForm, setPtForm] = useState({
    bio: '',
    trainingPhilosophy: '',
    yearsOfExperience: '',
    specializations: [],
    certifications: '',
    hourlyRate: '',
    cvUrl: '',
  });
  const [isRegisteringPt, setIsRegisteringPt] = useState(false);
  const [isSubmittingPt, setIsSubmittingPt] = useState(false);
  const cvInputRef = useRef(null);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const selfieInputRef = useRef(null);
  const compareRan = useRef(false);

  // Check KYC and PT status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoadingStatus(true);
      try {
        // Check if user has PT profile via API
        const response = await userService.getProfile();
        const userData = response.data?.data;
        
        // Update KYC status from API
        if (userData?.isKycVerified) {
          setIsKycVerified(true);
          localStorage.setItem('isKycVerified', 'true');
        }

        // Check if user has PT profile
        if (userData?.ptProfile) {
          setHasPtProfile(true);
          setPtProfileStatus(userData.ptProfile.ptRequestStatus || userData.ptProfile.verificationStatus);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        // Fallback to localStorage
        const storedKyc = localStorage.getItem('isKycVerified');
        if (storedKyc === 'true') {
          setIsKycVerified(true);
        }
      } finally {
        setIsLoadingStatus(false);
      }
    };
    checkStatus();
  }, [user?.isKycVerified]);

  // Steps for KYC
  const steps = [
    { key: 'front', label: 'Mặt trước CCCD', icon: FileText, ref: frontInputRef },
    { key: 'back', label: 'Mặt sau CCCD', icon: FileText, ref: backInputRef },
    { key: 'selfie', label: 'Ảnh gương mặt', icon: Camera, ref: selfieInputRef },
  ];

  const specializationOptions = [
    'Giảm cân', 'Tăng cơ', 'Thể hình', 'Yoga', 'Pilates',
    'Cardio', 'CrossFit', 'Boxing', 'Swimming', 'Nutrition'
  ];

  // KYC Functions
  const startSession = async () => {
    try {
      setUploading(true);
      const res = await authService.startKycSession();
      const session = res.data?.data?.session ?? res.data?.session ?? res.data;
      const sid = session?.sessionId ?? session?.id;
      if (!sid) throw new Error('Không nhận được sessionId từ server');
      setSessionId(sid);
      setCurrentStep(1);
      toast.success('Đã tạo phiên KYC, bắt đầu với mặt trước CCCD');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.reason || err.message || 'Không thể tạo phiên KYC');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá lớn. Tối đa 5MB');
      return;
    }
    const preview = URL.createObjectURL(file);
    return { file, preview };
  };

  const uploadImage = async (file, title, type, setPreview, nextStep) => {
    try {
      setUploading(true);
      const { preview } = handleFileSelect(file) || {};
      if (preview) setPreview(preview);
      await authService.uploadKycImage(sessionId, file, title, type);
      toast.success('Tải ảnh thành công');
      setCurrentStep(nextStep);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.reason || 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleCompare = async () => {
    try {
      setComparing(true);
      const res = await authService.compareKyc(sessionId);
      setCompareResult(res.data.data);
      setCurrentStep(5);
      // Update localStorage
      localStorage.setItem('isKycVerified', 'true');
      setIsKycVerified(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.reason || 'Xác thực thất bại';
      toast.error(msg);
      setCompareResult({ status: 'ERROR', error: msg });
      setCurrentStep(5);
    } finally {
      setComparing(false);
    }
  };

  const resetKyc = () => {
    setSessionId(null);
    setCurrentStep(0);
    setFrontPreview(null);
    setBackPreview(null);
    setSelfiePreview(null);
    setCompareResult(null);
    setSessionInfo(null);
    compareRan.current = false;
  };

  // Auto-trigger compare when selfie is uploaded
  useEffect(() => {
    if (currentStep === 4 && !comparing && !compareResult && !compareRan.current) {
      compareRan.current = true;
      handleCompare();
    }
  }, [currentStep, comparing, compareResult]);

  // Poll session info when in progress
  useEffect(() => {
    if (!sessionId || currentStep < 1 || currentStep >= 5) return;
    const timer = setInterval(async () => {
      try {
        const res = await authService.getKycSession(sessionId);
        setSessionInfo(res.data.data?.session);
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [sessionId, currentStep]);

  // PT Registration Functions
  const handleSpecializationToggle = (spec) => {
    setPtForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn. Tối đa 10MB');
      return;
    }
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file PDF hoặc Word');
      return;
    }
    try {
      const response = await userService.uploadCv(file);
      const cvUrl = response.data?.data;
      setPtForm(prev => ({ ...prev, cvUrl, cvFileName: file.name }));
      toast.success('CV đã được tải lên!');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Upload CV thất bại');
    }
  };

  const handleRegisterPt = async () => {
    if (!ptForm.bio.trim()) return toast.error('Vui lòng nhập giới thiệu bản thân');
    if (!ptForm.trainingPhilosophy.trim()) return toast.error('Vui lòng nhập triết lý tập luyện');
    if (!ptForm.yearsOfExperience) return toast.error('Vui lòng nhập số năm kinh nghiệm');

    setIsSubmittingPt(true);
    try {
      await userService.registerAsPt({
        bio: ptForm.bio,
        trainingPhilosophy: ptForm.trainingPhilosophy,
        yearsOfExperience: parseInt(ptForm.yearsOfExperience),
        specializations: ptForm.specializations,
        certifications: ptForm.certifications,
        hourlyRate: ptForm.hourlyRate ? parseFloat(ptForm.hourlyRate) : null,
        cvUrl: ptForm.cvUrl,
      });
      toast.success('Đăng ký làm PT thành công! Vui lòng chờ duyệt.');
      setHasPtProfile(true);
      setPtProfileStatus('PENDING_APPROVAL');
      await checkAuth();
    } catch (error) {
      const message = error?.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      toast.error(message);
    } finally {
      setIsSubmittingPt(false);
    }
  };

  // Status Banner Component
  const StatusBanner = ({ status }) => {
    if (!status) return null;
    const cfg = {
      DRAFT: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', title: 'Chưa xác thực', desc: 'Vui lòng xác thực KYC để tiếp tục.' },
      IN_PROGRESS: { icon: UploadCloud, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', title: 'Đang xử lý', desc: 'Đang tương tác với VNPT eKYC...' },
      VERIFIED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'Xác thực thành công', desc: 'KYC đã hoàn tất.' },
      REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300', title: 'Xác thực thất bại', desc: 'Ảnh không khớp hoặc chất lượng không đạt.' },
      ERROR: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', title: 'Có lỗi', desc: compareResult?.error || 'Vui lòng thử lại.' },
    };
    const config = cfg[status] || cfg.DRAFT;
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
        {(status === 'REJECTED' || status === 'ERROR') && (
          <Button onClick={resetKyc} variant="outline" className="shrink-0 rounded-xl border-slate-200">
            <RotateCcw className="w-4 h-4 mr-2" /> Thử lại
          </Button>
        )}
      </div>
    );
  };

  const UploadStepCard = ({ stepKey, label, icon: Icon, preview, inputRef, onUpload, isUploaded, isActive, uploadingThis }) => (
    <Card className={`border-2 transition-all ${isActive ? 'border-blue-400 shadow-md bg-blue-50/30' : 'border-slate-200 bg-white'} ${isUploaded ? 'border-emerald-300 bg-emerald-50/30' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUploaded ? 'bg-emerald-100 text-emerald-700' : isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
            {isUploaded ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-800">{label}</h4>
            <p className="text-xs text-slate-500 font-medium">{isUploaded ? 'Đã tải lên' : isActive ? 'Vui lòng tải ảnh' : 'Chờ tải'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={!isActive || isUploaded} onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); }} />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={!isActive || isUploaded} className={`flex-1 rounded-xl h-12 font-bold ${isUploaded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {uploadingThis ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải...</> : isUploaded ? 'Đã tải xong' : 'Chọn ảnh'}
          </Button>
        </div>
        {preview && <div className="mt-4 relative group"><img src={preview} alt={stepKey} className="w-full h-48 object-cover rounded-xl border border-slate-200" /><div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" /></div>}
      </CardContent>
    </Card>
  );

  const renderCompareResult = () => {
    if (!compareResult) return null;
    const status = compareResult.status;
    const passed = status === 'VERIFIED';
    return (
      <Card className={`border-2 ${passed ? 'border-emerald-300 bg-emerald-50/30' : 'border-red-300 bg-red-50/30'}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            {passed ? <CheckCircle2 className="w-12 h-12 text-emerald-600" /> : <XCircle className="w-12 h-12 text-red-600" />}
            <div>
              <h3 className="text-xl font-black text-slate-900">{passed ? 'KYC đã xác thực' : 'Xác thực thất bại'}</h3>
              <p className="text-sm text-slate-600 font-medium">
                Điểm khớp: <span className="font-bold">{compareResult.matchScore?.toFixed(1)}%</span>
                {compareResult.verifiedAt && <span className="ml-3 text-xs text-slate-400">Lúc {new Date(compareResult.verifiedAt).toLocaleString('vi-VN')}</span>}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mặt trước</p>
              <div className="mt-2 w-full h-20 bg-slate-100 rounded-lg overflow-hidden">{frontPreview && <img src={frontPreview} className="w-full h-full object-cover" />}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mặt sau</p>
              <div className="mt-2 w-full h-20 bg-slate-100 rounded-lg overflow-hidden">{backPreview && <img src={backPreview} className="w-full h-full object-cover" />}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Selfie</p>
              <div className="mt-2 w-full h-20 bg-slate-100 rounded-lg overflow-hidden">{selfiePreview && <img src={selfiePreview} className="w-full h-full object-cover" />}</div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            {passed ? (
              <Button onClick={() => { resetKyc(); setIsKycVerified(true); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">
                Tiếp tục <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={resetKyc} variant="outline" className="flex-1 rounded-xl h-12 font-bold border-red-200 text-red-700 hover:bg-red-50">
                <RotateCcw className="w-4 h-4 mr-2" /> Thử lại toàn bộ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getSessionStatus = () => {
    if (comparing) return 'IN_PROGRESS';
    if (compareResult?.status === 'VERIFIED') return 'VERIFIED';
    if (compareResult?.status === 'REJECTED') return 'REJECTED';
    if (compareResult?.status === 'ERROR') return 'ERROR';
    if (sessionId) return 'IN_PROGRESS';
    return 'DRAFT';
  };

  // Loading state
  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If KYC is verified, show PT Registration page
  if (isKycVerified) {
    return (
      <div className="max-w-4xl mx-auto pb-12 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Đăng Ký Làm Huấn Luyện Viên Cá Nhân</h1>
          <p className="text-slate-500 font-medium">Trở thành PT và chia sẻ kiến thức dinh dưỡng của bạn</p>
        </div>

        {/* Already has PT Profile */}
        {hasPtProfile && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  {ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : ptProfileStatus === 'PENDING_APPROVAL' ? (
                    <Clock className="w-6 h-6 text-amber-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">
                    {ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED' 
                      ? 'Bạn đã là Huấn Luyện Viên' 
                      : ptProfileStatus === 'PENDING_APPROVAL'
                        ? 'Hồ sơ đang chờ duyệt'
                        : 'Hồ sơ bị từ chối'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED'
                      ? 'Chúc mừng! Bạn đã là PT được xác thực.'
                      : ptProfileStatus === 'PENDING_APPROVAL'
                        ? 'Vui lòng chờ admin duyệt hồ sơ của bạn.'
                        : 'Vui lòng cập nhật thông tin và gửi lại.'}
                  </p>
                </div>
                {(ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED') && (
                  <Button onClick={() => navigate('/pt/dashboard')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                    Vào Dashboard PT <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PT Registration Form */}
        {!hasPtProfile && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left - Form */}
            <div className="col-span-12 lg:col-span-8">
              <Card className="bg-white border-slate-200 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Thông Tin Cá Nhân
                  </h3>
                  
                  <div className="space-y-5">
                    {/* Bio */}
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Giới Thiệu Bản Thân *</label>
                      <textarea
                        value={ptForm.bio}
                        onChange={(e) => setPtForm(p => ({...p, bio: e.target.value}))}
                        placeholder="Chia sẻ về bản thân, background và kinh nghiệm của bạn..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Training Philosophy */}
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Triết Lý Tập Luyện *</label>
                      <textarea
                        value={ptForm.trainingPhilosophy}
                        onChange={(e) => setPtForm(p => ({...p, trainingPhilosophy: e.target.value}))}
                        placeholder="Triết lý và phương pháp huấn luyện của bạn là gì?"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Years of Experience & Hourly Rate */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Số Năm Kinh Nghiệm *</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={ptForm.yearsOfExperience}
                            onChange={(e) => setPtForm(p => ({...p, yearsOfExperience: e.target.value}))}
                            placeholder="VD: 3"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">năm</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Phí Theo Giờ</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={ptForm.hourlyRate}
                            onChange={(e) => setPtForm(p => ({...p, hourlyRate: e.target.value}))}
                            placeholder="VD: 200000"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">VND</span>
                        </div>
                      </div>
                    </div>

                    {/* Specializations */}
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-2 block">Chuyên Môn</label>
                      <div className="flex flex-wrap gap-2">
                        {specializationOptions.map(spec => (
                          <button
                            key={spec}
                            onClick={() => handleSpecializationToggle(spec)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              ptForm.specializations.includes(spec)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {spec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Certifications */}
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Chứng Chỉ / Certificates</label>
                      <textarea
                        value={ptForm.certifications}
                        onChange={(e) => setPtForm(p => ({...p, certifications: e.target.value}))}
                        placeholder="VD: ACE Certified Personal Trainer, NASM-CPT..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* CV Upload */}
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Upload CV (Tùy chọn)</label>
                      <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCvUpload} className="hidden" />
                      <div 
                        onClick={() => cvInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        {ptForm.cvUrl ? (
                          <div className="flex items-center justify-center gap-3">
                            <FileUp className="w-8 h-8 text-emerald-500" />
                            <div className="text-left">
                              <p className="font-semibold text-slate-800">{ptForm.cvFileName || 'CV đã tải lên'}</p>
                              <p className="text-sm text-emerald-600">Click để thay đổi</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="font-medium text-slate-600">Click để upload CV</p>
                            <p className="text-sm text-slate-400">PDF, DOC, DOCX (tối đa 10MB)</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleRegisterPt}
                      disabled={isSubmittingPt}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl py-5 font-semibold flex items-center justify-center gap-2 mt-4"
                    >
                      {isSubmittingPt ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Đang gửi...</>
                      ) : (
                        <><Sparkles className="h-5 w-5" /> Đăng Ký Làm PT</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right - Info */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Benefits Card */}
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    Quyền Lợi Khi Làm PT
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">Nhận học viên</p>
                        <p className="text-sm text-slate-300">Kết nối với người dùng cần PT</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">Theo dõi tiến độ</p>
                        <p className="text-sm text-slate-300">Monitor học viên 24/7</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-rose-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">Xây dựng thương hiệu</p>
                        <p className="text-sm text-slate-300">Profile cá nhân trên nền tảng</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Process Card */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Quy Trình</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</div>
                      <div>
                        <p className="font-semibold text-slate-800">Điền thông tin</p>
                        <p className="text-sm text-slate-500">Hoàn thành form đăng ký</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">2</div>
                      <div>
                        <p className="font-semibold text-slate-800">Chờ duyệt</p>
                        <p className="text-sm text-slate-500">Admin sẽ xác minh hồ sơ</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">3</div>
                      <div>
                        <p className="font-semibold text-slate-800">Bắt đầu nhận học viên</p>
                        <p className="text-sm text-slate-500">Profile của bạn sẽ hiển thị</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-blue-800 mb-3">Cần hỗ trợ?</h3>
                  <p className="text-sm text-blue-600 mb-3">Liên hệ với chúng tôi nếu bạn có câu hỏi về quy trình đăng ký.</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Mail className="w-4 h-4" />
                      <span>support@nutrican.vn</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Phone className="w-4 h-4" />
                      <span>1900 xxxx</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  // KYC Verification Page (when not verified)
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Xác Thực Danh Tính</h1>
        <p className="text-slate-500 font-medium">Xác thực danh tính qua CCCD bằng VNPT eKYC</p>
      </div>

      <StatusBanner status={getSessionStatus()} />

      {!sessionId && currentStep === 0 ? (
        <Card className="bg-white border-slate-200 shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Bắt đầu xác thực danh tính</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 max-w-md mx-auto">
              Bạn sẽ cần cung cấp ảnh mặt trước CCCD, mặt sau CCCD và một ảnh selfie. Toàn bộ quá trình được xử lý bởi VNPT eKYC.
            </p>
            <Button onClick={startSession} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md px-10 h-12 text-lg font-bold">
              {uploading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang tạo phiên...</> : 'Bắt đầu KYC'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {currentStep >= 1 && currentStep <= 3 && (
        <div className="grid gap-6">
          <UploadStepCard
            stepKey="front" label="Mặt trước CCCD" icon={FileText}
            preview={frontPreview} inputRef={frontInputRef}
            isActive={currentStep >= 1} isUploaded={currentStep > 1}
            uploadingThis={uploading && currentStep === 1}
            onUpload={(file) => uploadImage(file, 'FRONT', 'FRONT', setFrontPreview, 2)}
          />
          <UploadStepCard
            stepKey="back" label="Mặt sau CCCD" icon={FileText}
            preview={backPreview} inputRef={backInputRef}
            isActive={currentStep >= 2} isUploaded={currentStep > 2}
            uploadingThis={uploading && currentStep === 2}
            onUpload={(file) => uploadImage(file, 'BACK', 'BACK', setBackPreview, 3)}
          />
          <UploadStepCard
            stepKey="selfie" label="Ảnh gương mặt" icon={Camera}
            preview={selfiePreview} inputRef={selfieInputRef}
            isActive={currentStep >= 3} isUploaded={currentStep > 3}
            uploadingThis={uploading && currentStep === 3}
            onUpload={(file) => uploadImage(file, 'SELFIE', 'SELFIE', setSelfiePreview, 4)}
          />
        </div>
      )}

      {currentStep === 4 && !compareResult && (
        <Card className="bg-blue-50 border-blue-200 rounded-3xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">Đang xác thực khuôn mặt...</h3>
            <p className="text-sm text-slate-500 font-medium">VNPT đang so sánh ảnh selfie với ảnh trên CCCD</p>
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && renderCompareResult()}
    </div>
  );
}
