// src/pages/customer/KycPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  UploadCloud,
  FileText,
  Camera,
  ArrowRight,
  RotateCcw,
  Loader2,
} from 'lucide-react';

export default function KycPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0); // 0=idle, 1=front, 2=back, 3=selfie, 4=compare, 5=done
  const [uploading, setUploading] = useState(false);

  // Uploaded file previews
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  // Compare result
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Session metadata
  const [sessionInfo, setSessionInfo] = useState(null);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  // Steps configuration
  const steps = [
    { key: 'front', label: 'Mặt trước CCCD', icon: FileText, ref: frontInputRef },
    { key: 'back', label: 'Mặt sau CCCD', icon: FileText, ref: backInputRef },
    { key: 'selfie', label: 'Ảnh gương mặt', icon: Camera, ref: selfieInputRef },
  ];

  const startSession = async () => {
    try {
      setUploading(true);
      const res = await authService.startKycSession();
      console.log('KYC start response:', res.data);
      const session = res.data?.data?.session ?? res.data?.session ?? res.data;
      const sid = session?.sessionId ?? session?.id;
      if (!sid) {
        throw new Error('Không nhận được sessionId từ server');
      }
      setSessionId(sid);
      setCurrentStep(1);
      toast.success('Đã tạo phiên KYC, bắt đầu với mặt trước CCCD');
    } catch (err) {
      console.error('KYC start error:', err);
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

  const uploadImage = async (file, title, setPreview, nextStep) => {
    try {
      setUploading(true);
      const { preview } = handleFileSelect(file) || {};
      if (preview) setPreview(preview);

      await authService.uploadKycImage(sessionId, file, title);
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
  };

  // Auto-trigger compare when selfie is uploaded (currentStep becomes 4)
  useEffect(() => {
    if (currentStep === 4 && !comparing && !compareResult) {
      handleCompare();
    }
  }, [currentStep]);

  // Poll session info when in progress
  useEffect(() => {
    if (!sessionId || currentStep < 1 || currentStep >= 5) return;
    const timer = setInterval(async () => {
      try {
        const res = await authService.getKycSession(sessionId);
        setSessionInfo(res.data.data?.session);
      } catch {
        // ignore poll errors
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [sessionId, currentStep]);

  const StatusBanner = ({ status }) => {
    if (!status) return null;
    const cfg = {
      DRAFT:          { icon: Clock,        color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200', title: 'Đang tạo phiên',   desc: 'Bấm bắt đầu để tiến hành KYC.' },
      IN_PROGRESS:    { icon: UploadCloud,  color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',  title: 'Đang xử lý',     desc: 'Đang tương tác với VNPT eKYC...' },
      VERIFIED:       { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'Xác thực thành công', desc: 'KYC đã hoàn tất.' },
      REJECTED:       { icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-300',   title: 'Xác thực thất bại', desc: 'Ảnh không khớp hoặc chất lượng không đạt.', },
      ERROR:          { icon: AlertTriangle,color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200', title: 'Có lỗi',         desc: compareResult?.error || 'Vui lòng thử lại.' },
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
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!isActive || isUploaded}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!isActive || isUploaded}
            className={`flex-1 rounded-xl h-12 font-bold ${isUploaded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {uploadingThis ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải...</> : isUploaded ? 'Đã tải xong' : 'Chọn ảnh'}
          </Button>
        </div>

        {preview && (
          <div className="mt-4 relative group">
            <img src={preview} alt={stepKey} className="w-full h-48 object-cover rounded-xl border border-slate-200" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          </div>
        )}
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
            {passed ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
            <div>
              <h3 className="text-xl font-black text-slate-900">{passed ? 'KYC đã xác thực' : 'Xác thực thất bại'}</h3>
              <p className="text-sm text-slate-600 font-medium">
                Điểm khớp: <span className="font-bold">{compareResult.matchScore?.toFixed(1)}%</span>
                {compareResult.verifiedAt && (
                  <span className="ml-3 text-xs text-slate-400">Lúc {new Date(compareResult.verifiedAt).toLocaleString('vi-VN')}</span>
                )}
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
              <Button onClick={() => navigate('/diet')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">
                Vào Dashboard <ArrowRight className="w-4 h-4 ml-2" />
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

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Identity Verification</h1>
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
            stepKey="front"
            label="Mặt trước CCCD"
            icon={FileText}
            preview={frontPreview}
            inputRef={frontInputRef}
            isActive={currentStep >= 1}
            isUploaded={currentStep > 1}
            uploadingThis={uploading && currentStep === 1}
            onUpload={(file) => uploadImage(file, 'FRONT', setFrontPreview, 2)}
          />
          <UploadStepCard
            stepKey="back"
            label="Mặt sau CCCD"
            icon={FileText}
            preview={backPreview}
            inputRef={backInputRef}
            isActive={currentStep >= 2}
            isUploaded={currentStep > 2}
            uploadingThis={uploading && currentStep === 2}
            onUpload={(file) => uploadImage(file, 'BACK', setBackPreview, 3)}
          />
          <UploadStepCard
            stepKey="selfie"
            label="Ảnh gương mặt"
            icon={Camera}
            preview={selfiePreview}
            inputRef={selfieInputRef}
            isActive={currentStep >= 3}
            isUploaded={currentStep > 3}
            uploadingThis={uploading && currentStep === 3}
            onUpload={(file) => uploadImage(file, 'SELFIE', setSelfiePreview, 4)}
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
