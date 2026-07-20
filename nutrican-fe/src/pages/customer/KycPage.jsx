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
  Users, TrendingUp, Star, ChevronRight, Mail, Phone, UploadCloud,
  Plus, Trash2, MapPin, Monitor, Dumbbell, Globe,
  ExternalLink, Image as ImageIcon, Calendar, Link2
} from 'lucide-react';
import PtVenueAvailabilityEditor, { newVenue, weekScheduleToAvailabilityWindows } from '../../components/pt/PtVenueAvailabilityEditor';
import { createDefaultWeekSchedule, sessionMinutesFromRateUnit, DAY_LABELS } from '../../utils/offlineHireSlots';

// ─── Constants ───────────────────────────────────────────────────────────────
const GOAL_OPTIONS_KYC = [
  { value: 'WEIGHT_LOSS', label: 'Giảm cân' },
  { value: 'WEIGHT_GAIN', label: 'Tăng cân' },
  { value: 'MAINTAIN', label: 'Duy trì' },
  { value: 'PREGNANT', label: 'Mang thai' },
  { value: 'RECOVERY', label: 'Phục hồi' },
];

const DIET_OPTIONS_KYC = [
  { value: 'NORMAL', label: 'Ăn thường' },
  { value: 'VEGETARIAN', label: 'Ăn chay' },
  { value: 'VEGAN', label: 'Thuần chay' },
  { value: 'KETO', label: 'Keto' },
  { value: 'EAT_CLEAN', label: 'Eat clean' },
];

const SPECIALIZATION_OPTIONS = [
  'Giảm cân', 'Tăng cơ', 'Thể hình', 'Yoga', 'Pilates',
  'Cardio', 'CrossFit', 'Boxing', 'Bơi lội', 'Dinh dưỡng',
  'Phục hồi chức năng', 'Thể lực cho người cao tuổi',
];

const OFFLINE_SESSION_OPTIONS = [
  { value: 'SESSION_60', label: '60 phút / buổi' },
  { value: 'SESSION_90', label: '90 phút / buổi' },
];

const TRAINING_MODE_OPTIONS = [
  { value: 'OFFLINE', label: 'Trực tiếp (Offline)', icon: Dumbbell },
  { value: 'ONLINE', label: 'Online', icon: Monitor },
  { value: 'BOTH', label: 'Cả hai', icon: Globe },
];

const modeIncludes = (selectedMode, optionMode) =>
  selectedMode === optionMode || selectedMode === 'BOTH';

const hasPositiveRate = (value) =>
  value !== '' && value !== null && value !== undefined && Number(value) > 0;

const LOCATION_OPTIONS = [
  'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ',
  'Hải Phòng', 'Bình Dương', 'Đồng Nai', 'Vũng Tàu', 'Khác',
];

const newEmptyCert = () => ({
  _id: Math.random().toString(36).slice(2),
  name: '',
  issuingOrganization: '',
  issueDate: '',
  expiryDate: '',
  neverExpires: false,
  certificateImageUrl: '',
  imagePreview: null,
  isUploading: false,
});

// ─── Validation ────────────────────────────────────────────────────────────
function validatePtForm(form, certList, venues, weekSchedule) {
  if (!form.preferredTrack) return 'Vui lòng chọn hướng đăng ký';
  if (!form.bio.trim() || form.bio.trim().length < 100)
    return 'Giới thiệu bản thân tối thiểu 100 ký tự';
  if (!form.trainingPhilosophy.trim() || form.trainingPhilosophy.trim().length < 50)
    return 'Triết lý huấn luyện tối thiểu 50 ký tự';
  if (!form.contactPhone.trim())
    return 'Vui lòng nhập số điện thoại liên hệ';
  if (!form.gender)
    return 'Vui lòng chọn giới tính';
  if (!form.experienceStartDate)
    return 'Vui lòng chọn ngày bắt đầu làm PT';
  if (form.specializations.length === 0)
    return 'Vui lòng chọn ít nhất 1 chuyên môn';
  if (!form.trainingMode)
    return 'Vui lòng chọn hình thức huấn luyện';
  if (modeIncludes(form.trainingMode, 'OFFLINE') && !form.location)
    return 'Vui lòng chọn địa điểm hoạt động';
  if (modeIncludes(form.trainingMode, 'ONLINE') && !hasPositiveRate(form.onlineRate))
    return 'Phí huấn luyện online phải lớn hơn 0';

  if (modeIncludes(form.trainingMode, 'OFFLINE') && !hasPositiveRate(form.offlineRate))
    return 'Phí huấn luyện offline phải lớn hơn 0';

  if (modeIncludes(form.trainingMode, 'OFFLINE')) {
    const validVenues = (venues || []).filter((v) => v.name?.trim() && v.address?.trim());
    if (validVenues.length === 0) return 'Vui lòng thêm ít nhất một địa điểm tập';
    const enabledDays = (weekSchedule || []).filter((d) => d.enabled);
    if (enabledDays.length === 0) return 'Vui lòng bật ít nhất một ngày trong lịch tuần';
    for (const day of enabledDays) {
      if (day.startTime >= day.endTime) {
        return `${DAY_LABELS[day.dayOfWeek]}: giờ kết thúc phải sau giờ bắt đầu`;
      }
    }
  }

  const filledCerts = certList.filter(c => c.name.trim() || c.issuingOrganization.trim() || c.certificateImageUrl);

  if (form.preferredTrack === 'CERTIFIED' && filledCerts.length === 0)
    return 'PT Chuyên nghiệp (Certified) yêu cầu tối thiểu 1 chứng chỉ có ảnh xác minh';

  for (let i = 0; i < filledCerts.length; i++) {
    const c = filledCerts[i];
    if (!c.name.trim()) return `Chứng chỉ #${i + 1}: Vui lòng nhập tên chứng chỉ`;
    if (!c.issuingOrganization.trim()) return `Chứng chỉ #${i + 1}: Vui lòng nhập tổ chức cấp`;
    if (!c.issueDate) return `Chứng chỉ #${i + 1}: Vui lòng nhập ngày cấp`;
    if (!c.certificateImageUrl) return `Chứng chỉ #${i + 1}: Vui lòng tải ảnh chứng chỉ lên`;
  }
  return null;
}

// ─── Computed helpers ──────────────────────────────────────────────────────
function calcExperience(dateStr) {
  if (!dateStr) return null;
  const normalized = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
  const start = new Date(normalized);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const diffMs = now - start;
  if (diffMs < 0) return null;
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} tháng`;
  if (months === 0) return `${years} năm`;
  return `${years} năm ${months} tháng`;
}

// ─── Sub-components ────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, step, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-500 to-indigo-500 text-blue-600 bg-blue-50',
    emerald: 'from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50',
    amber: 'from-amber-500 to-orange-500 text-amber-600 bg-amber-50',
    purple: 'from-purple-500 to-violet-500 text-purple-600 bg-purple-50',
  };
  const [grad, text, bg] = colors[color].split(' ');
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${grad} ${colors[color].split(' ').slice(1).join(' ')} flex items-center justify-center shadow-md flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {step && (
        <div className="ml-auto w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
          {step}
        </div>
      )}
    </div>
  );
}

function CharCounter({ value, min, max }) {
  const len = value.length;
  const ok = len >= min;
  return (
    <span className={`text-xs font-semibold ml-1 ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
      {len}{max ? `/${max}` : ''} {ok ? '✓' : `(tối thiểu ${min})`}
    </span>
  );
}

function CertCard({ cert, index, onChange, onRemove, onImageUpload }) {
  const imageRef = useRef(null);
  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
            {index + 1}
          </div>
          <span className="font-bold text-slate-700 text-sm">Chứng chỉ #{index + 1}</span>
          {cert.certificateImageUrl && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Có ảnh xác minh
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Tên chứng chỉ *
          </label>
          <input
            type="text"
            value={cert.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
            placeholder="VD: ACE Certified Personal Trainer"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none text-sm transition-all"
          />
        </div>

        {/* Org */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Tổ chức cấp *
          </label>
          <input
            type="text"
            value={cert.issuingOrganization}
            onChange={(e) => onChange(index, 'issuingOrganization', e.target.value)}
            placeholder="VD: American Council on Exercise"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none text-sm transition-all"
          />
        </div>

        {/* Issue Date */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Ngày cấp *
          </label>
          <input
            type="month"
            value={cert.issueDate}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(e) => onChange(index, 'issueDate', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none text-sm transition-all"
          />
        </div>

        {/* Expiry Date */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Ngày hết hạn
          </label>
          {cert.neverExpires ? (
            <div className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-700 font-medium">
              Không hết hạn ∞
            </div>
          ) : (
            <input
              type="month"
              value={cert.expiryDate}
              min={cert.issueDate}
              onChange={(e) => onChange(index, 'expiryDate', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none text-sm transition-all"
            />
          )}
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cert.neverExpires}
              onChange={(e) => {
                onChange(index, 'neverExpires', e.target.checked);
                if (e.target.checked) onChange(index, 'expiryDate', '');
              }}
              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
            />
            <span className="text-xs font-medium text-slate-500">Không có ngày hết hạn</span>
          </label>
        </div>
      </div>

      {/* Certificate Image Upload */}
      <div className="mt-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
          Ảnh chứng chỉ * <span className="text-slate-400 normal-case font-normal">(JPG/PNG/PDF, tối đa 5MB)</span>
        </label>
        <input
          ref={imageRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageUpload(index, file);
            e.target.value = null;
          }}
        />

        {cert.certificateImageUrl ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            {cert.imagePreview && cert.imagePreview.startsWith('blob:') ? (
              <img src={cert.imagePreview} alt="cert" className="w-16 h-16 object-cover rounded-lg border border-emerald-200" />
            ) : (
              <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-emerald-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-700">Đã tải ảnh lên</p>
              <a
                href={cert.certificateImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"
              >
                Xem ảnh <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => imageRef.current?.click()}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs"
              disabled={cert.isUploading}
            >
              Đổi ảnh
            </Button>
          </div>
        ) : (
          <div
            onClick={() => !cert.isUploading && imageRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              cert.isUploading
                ? 'border-blue-300 bg-blue-50 cursor-wait'
                : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/50'
            }`}
          >
            {cert.isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-sm font-medium text-blue-600">Đang tải lên...</span>
              </div>
            ) : (
              <>
                <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-slate-600">Nhấp để tải ảnh chứng chỉ</p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG hoặc PDF</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function KycPage() {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuthStore();
  const [hasPtProfile, setHasPtProfile] = useState(false);
  const [ptProfileStatus, setPtProfileStatus] = useState(null);
  const [adminRejectNote, setAdminRejectNote] = useState('');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [requireKyc, setRequireKyc] = useState(true);

  // KYC Session state
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // PT Registration form state
  const [ptForm, setPtForm] = useState({
    preferredTrack: null,
    bio: '',
    trainingPhilosophy: '',
    contactPhone: '',
    gender: '',
    experienceStartDate: '',
    specializations: [],
    trainingMode: '',
    location: '',
    onlineRate: '',
    onlineRateUnit: 'MONTH',
    offlineRate: '',
    offlineRateUnit: 'SESSION_60',
    cvUrl: '',
    cvFileName: '',
    instagramUrl: '',
    linkedinUrl: '',
    preferredGoals: [],
    preferredDietTypes: [],
  });
  const [certList, setCertList] = useState([newEmptyCert()]);
  const [registrationVenues, setRegistrationVenues] = useState([newVenue()]);
  const [weekSchedule, setWeekSchedule] = useState(createDefaultWeekSchedule);
  const [isSubmittingPt, setIsSubmittingPt] = useState(false);
  const cvInputRef = useRef(null);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  // Load status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoadingStatus(true);
      try {
        const [profileRes, settingRes] = await Promise.all([
          userService.getProfile(),
          userService.getRequireKycSetting().catch(() => ({ data: { data: true } }))
        ]);
        const userData = profileRes.data?.data;
        setRequireKyc(settingRes.data?.data ?? true);
        if (userData?.ptProfile) {
          setHasPtProfile(true);
          setPtProfileStatus(userData.ptProfile.ptRequestStatus || userData.ptProfile.verificationStatus);
          setAdminRejectNote(userData.ptProfile.adminRejectNote || '');
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };
    checkStatus();
  }, []);

  // ── KYC functions ──────────────────────────────────────────────────────
  const resetKyc = () => {
    setSessionId(null);
    setCurrentStep(0);
    setFrontFile(null); setBackFile(null); setSelfieFile(null);
    setFrontPreview(null); setBackPreview(null); setSelfiePreview(null);
    setCompareResult(null);
    setLoadingMessage('');
    setUploading(false);
    setComparing(false);
  };

  const handleFileSelect = (file) => {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) { toast.error('File quá lớn. Tối đa 5MB'); return null; }
    return { file, preview: URL.createObjectURL(file) };
  };

  const onLocalUpload = (file, setFile, setPreview) => {
    const fd = handleFileSelect(file);
    if (fd) { setFile(fd.file); setPreview(fd.preview); }
  };

  const handleBatchSubmit = async () => {
    if (!frontFile || !backFile || !selfieFile) { toast.error('Vui lòng cung cấp đủ 3 ảnh'); return; }
    try {
      setUploading(true);
      setCurrentStep(4);
      setLoadingMessage('Đang tạo phiên làm việc...');
      const resStart = await authService.startKycSession();
      const session = resStart.data?.data?.session ?? resStart.data?.session ?? resStart.data;
      const sid = session?.sessionId ?? session?.id;
      if (!sid) throw new Error('Không nhận được sessionId từ server');
      setSessionId(sid);
      setLoadingMessage('Đang tải mặt trước CCCD (1/3)...');
      await authService.uploadKycImage(sid, frontFile, 'FRONT', 'FRONT');
      setLoadingMessage('Đang tải mặt sau CCCD (2/3)...');
      await authService.uploadKycImage(sid, backFile, 'BACK', 'BACK');
      setLoadingMessage('Đang tải ảnh khuôn mặt (3/3)...');
      await authService.uploadKycImage(sid, selfieFile, 'SELFIE', 'SELFIE');
      setLoadingMessage('Đang phân tích và đối chiếu...');
      setComparing(true);
      const resCompare = await authService.compareKyc(sid);
      const result = resCompare.data?.data ?? resCompare.data;
      setCompareResult(result);
      if (result?.status === 'VERIFIED') {
        toast.success('Xác thực KYC thành công!');
        await checkAuth(); // reload user.isKycVerified
      } else {
        toast.error('Xác thực thất bại, vui lòng kiểm tra lại ảnh.');
      }
      setCurrentStep(5);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.reason || err.message || 'Xác thực thất bại';
      toast.error(msg);
      setCompareResult({ status: 'ERROR', error: msg });
      setCurrentStep(5);
    } finally {
      setUploading(false);
      setComparing(false);
      setLoadingMessage('');
    }
  };

  // ── PT Registration functions ──────────────────────────────────────────
  const toggleSpec = (spec) =>
    setPtForm(p => ({
      ...p,
      specializations: p.specializations.includes(spec)
        ? p.specializations.filter(s => s !== spec)
        : [...p.specializations, spec],
    }));

  const togglePreferredGoal = (value) =>
    setPtForm(p => ({
      ...p,
      preferredGoals: p.preferredGoals.includes(value)
        ? p.preferredGoals.filter((g) => g !== value)
        : [...p.preferredGoals, value],
    }));

  const togglePreferredDiet = (value) =>
    setPtForm(p => ({
      ...p,
      preferredDietTypes: p.preferredDietTypes.includes(value)
        ? p.preferredDietTypes.filter((d) => d !== value)
        : [...p.preferredDietTypes, value],
    }));

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File quá lớn. Tối đa 10MB'); return; }
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { toast.error('Chỉ chấp nhận PDF hoặc Word'); return; }
    try {
      const response = await userService.uploadCv(file);
      const cvUrl = response.data?.data;
      setPtForm(p => ({ ...p, cvUrl, cvFileName: file.name }));
      toast.success('CV đã được tải lên!');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Upload CV thất bại');
    }
  };

  const handleCertChange = (index, field, value) => {
    setCertList(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const handleCertImageUpload = async (index, file) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Ảnh không được vượt quá 5MB'); return; }
    // Show local preview immediately
    const preview = URL.createObjectURL(file);
    setCertList(prev => prev.map((c, i) => i === index ? { ...c, isUploading: true, imagePreview: preview } : c));
    try {
      const res = await userService.uploadCertImage(file);
      const url = res.data?.data;
      setCertList(prev => prev.map((c, i) =>
        i === index ? { ...c, certificateImageUrl: url, isUploading: false } : c
      ));
      toast.success('Ảnh chứng chỉ đã được tải lên!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload ảnh thất bại');
      setCertList(prev => prev.map((c, i) =>
        i === index ? { ...c, isUploading: false, imagePreview: null } : c
      ));
    }
  };

  const addCert = () => setCertList(prev => [...prev, newEmptyCert()]);
  const removeCert = (index) => {
    if (certList.length === 1) { toast.error('Phải có ít nhất 1 chứng chỉ'); return; }
    setCertList(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegisterPt = async () => {
    const err = validatePtForm(ptForm, certList, registrationVenues, weekSchedule);
    if (err) { toast.error(err); return; }
    setIsSubmittingPt(true);
    const filledCerts = certList.filter(c => c.name.trim() || c.issuingOrganization.trim() || c.certificateImageUrl);
    const offersOnline = modeIncludes(ptForm.trainingMode, 'ONLINE');
    const offersOffline = modeIncludes(ptForm.trainingMode, 'OFFLINE');
    const slotMinutes = sessionMinutesFromRateUnit(ptForm.offlineRateUnit);

    try {
      const payload = {
        preferredTrack: ptForm.preferredTrack,
        bio: ptForm.bio.trim(),
        trainingPhilosophy: ptForm.trainingPhilosophy.trim(),
        contactPhone: ptForm.contactPhone.trim(),
        gender: ptForm.gender,
        experienceStartDate: ptForm.experienceStartDate?.length === 7
          ? `${ptForm.experienceStartDate}-01` : ptForm.experienceStartDate,
        specializations: ptForm.specializations,
        trainingMode: ptForm.trainingMode,
        location: offersOffline ? ptForm.location : null,
        onlineRate: offersOnline ? Number(ptForm.onlineRate) : null,
        onlineRateUnit: offersOnline ? 'MONTH' : null,
        offlineRate: offersOffline ? Number(ptForm.offlineRate) : null,
        offlineRateUnit: offersOffline ? ptForm.offlineRateUnit : null,
        certifications: filledCerts.map(c => ({
          name: c.name,
          issuingOrganization: c.issuingOrganization,
          issueDate: c.issueDate,
          expiryDate: c.neverExpires ? null : c.expiryDate || null,
          neverExpires: c.neverExpires,
          certificateImageUrl: c.certificateImageUrl,
        })),
        cvUrl: ptForm.cvUrl || null,
        instagramUrl: ptForm.instagramUrl || null,
        linkedinUrl: ptForm.linkedinUrl || null,
        preferredGoals: ptForm.preferredGoals,
        preferredDietTypes: ptForm.preferredDietTypes,
      };
      if (offersOffline) {
        payload.venues = registrationVenues
          .filter((v) => v.name?.trim() && v.address?.trim())
          .map((v) => ({
            name: v.name.trim(),
            address: v.address.trim(),
            mapsUrl: v.mapsUrl?.trim() || null,
            note: v.note?.trim() || null,
          }));
        payload.availabilityWindows = weekScheduleToAvailabilityWindows(weekSchedule, slotMinutes);
      }
      if (ptProfileStatus === 'SUSPENDED') {
        await userService.resubmitPt(payload);
      } else {
        await userService.registerAsPt(payload);
      }
      toast.success('Đăng ký thành công! Vui lòng chờ admin duyệt hồ sơ.');
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

  // ── KYC helpers ────────────────────────────────────────────────────────
  const getSessionStatus = () => {
    if (comparing || uploading) return 'IN_PROGRESS';
    if (compareResult?.status === 'VERIFIED') return 'VERIFIED';
    if (compareResult?.status === 'REJECTED') return 'REJECTED';
    if (compareResult?.status === 'ERROR') return 'ERROR';
    if (sessionId) return 'IN_PROGRESS';
    return 'DRAFT';
  };

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

  const UploadStepCard = ({ stepKey, label, icon: Icon, preview, inputRef, onUpload, isUploaded, disabled }) => (
    <Card className={`border-2 transition-all ${isUploaded ? 'border-emerald-300 bg-emerald-50/30' : 'border-blue-400 shadow-md bg-blue-50/30'}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
            {isUploaded ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-800">{label}</h4>
            <p className="text-xs text-slate-500 font-medium">{isUploaded ? 'Đã chọn ảnh' : 'Vui lòng chọn ảnh'}</p>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = null; }} />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}
          className={`w-full rounded-xl h-12 font-bold ${isUploaded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
          {isUploaded ? 'Đổi ảnh khác' : 'Chọn ảnh'}
        </Button>
        {preview && (
          <div className="mt-4">
            <img src={preview} alt={stepKey} className="w-full h-48 object-cover rounded-xl border border-slate-200" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCompareResult = () => {
    if (!compareResult) return null;
    const passed = compareResult.status === 'VERIFIED';
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
            {[['Mặt trước', frontPreview], ['Mặt sau', backPreview], ['Selfie', selfiePreview]].map(([label, src]) => (
              <div key={label} className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className="mt-2 w-full h-20 bg-slate-100 rounded-lg overflow-hidden">
                  {src && <img src={src} className="w-full h-full object-cover" alt={label} />}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            {passed ? (
              <Button onClick={() => { resetKyc(); checkAuth(); }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">
                Tiếp tục đăng ký PT <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={resetKyc} variant="outline" className="w-full rounded-xl h-12 font-bold border-red-200 text-red-700 hover:bg-red-50">
                <RotateCcw className="w-4 h-4 mr-2" /> Thử lại toàn bộ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Render loading ─────────────────────────────────────────────────────
  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Render KYC page (when KYC is required and user is not verified) ──────
  if (requireKyc && !user?.isKycVerified) {
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

        {currentStep === 0 && (
          <Card className="bg-white border-slate-200 shadow-xl rounded-3xl overflow-hidden mb-8">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Bắt đầu xác thực danh tính</h3>
              <p className="text-sm text-slate-500 font-medium mb-8 max-w-md mx-auto">
                Bạn sẽ cần cung cấp ảnh mặt trước CCCD, mặt sau CCCD và một ảnh selfie.
              </p>
              <Button onClick={() => setCurrentStep(1)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md px-10 h-12 text-lg font-bold">
                Tiến hành chọn ảnh
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep >= 1 && currentStep <= 3 && (
          <div className="grid gap-6">
            <UploadStepCard stepKey="front" label="Mặt trước CCCD" icon={FileText}
              preview={frontPreview} inputRef={frontInputRef} isUploaded={!!frontFile} disabled={uploading}
              onUpload={(f) => onLocalUpload(f, setFrontFile, setFrontPreview)} />
            <UploadStepCard stepKey="back" label="Mặt sau CCCD" icon={FileText}
              preview={backPreview} inputRef={backInputRef} isUploaded={!!backFile} disabled={uploading}
              onUpload={(f) => onLocalUpload(f, setBackFile, setBackPreview)} />
            <UploadStepCard stepKey="selfie" label="Ảnh gương mặt" icon={Camera}
              preview={selfiePreview} inputRef={selfieInputRef} isUploaded={!!selfieFile} disabled={uploading}
              onUpload={(f) => onLocalUpload(f, setSelfieFile, setSelfiePreview)} />
            {frontFile && backFile && selfieFile && (
              <div className="flex justify-center mt-6">
                <Button onClick={handleBatchSubmit} disabled={uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg px-12 h-14 text-xl font-bold w-full max-w-md">
                  {uploading ? <><Loader2 className="w-6 h-6 mr-3 animate-spin" />{loadingMessage || 'Đang xử lý...'}</> : <><Shield className="w-6 h-6 mr-2" />Xác Thực Ngay</>}
                </Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <Card className="bg-blue-50 border-blue-200 rounded-3xl mt-8">
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

  // ── Render PT Registration page ─────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Page header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Đăng Ký Làm Huấn Luyện Viên Cá Nhân</h1>
        <p className="text-slate-500 font-medium">Xây dựng hồ sơ chuyên nghiệp để kết nối với học viên</p>
      </div>

      {/* Status banner if already has profile */}
      {hasPtProfile && (
        <Card className={`mb-8 ${
          ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED'
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
            : ptProfileStatus === 'PENDING_APPROVAL'
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                {ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED'
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  : ptProfileStatus === 'PENDING_APPROVAL'
                  ? <Clock className="w-6 h-6 text-amber-600" />
                  : <XCircle className="w-6 h-6 text-red-600" />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">
                  {ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED'
                    ? 'Bạn đã là Huấn Luyện Viên được xác thực'
                    : ptProfileStatus === 'PENDING_APPROVAL'
                    ? 'Hồ sơ đang chờ Admin xem xét'
                    : 'Hồ sơ chưa được duyệt — Bạn có thể cập nhật và gửi lại'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED'
                    ? 'Chúc mừng! Profile của bạn đã hiển thị trên Marketplace.'
                    : ptProfileStatus === 'PENDING_APPROVAL'
                    ? 'Thời gian xét duyệt thường trong vòng 1-3 ngày làm việc.'
                    : 'Hãy bổ sung thêm thông tin và chứng chỉ rõ ràng hơn.'}
                </p>
                {ptProfileStatus === 'SUSPENDED' && adminRejectNote && (
                  <p className="mt-3 text-sm text-red-800 bg-red-100/80 border border-red-200 rounded-xl px-3 py-2">
                    <span className="font-semibold">Lý do từ chối: </span>{adminRejectNote}
                  </p>
                )}
              </div>
              {(ptProfileStatus === 'ACTIVE' || ptProfileStatus === 'VERIFIED') && (
                <Button onClick={() => navigate('/pt')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex-shrink-0">
                  Vào Dashboard PT <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration form (show if no profile OR if rejected) */}
      {(!hasPtProfile || ptProfileStatus === 'SUSPENDED') && (
        !ptForm.preferredTrack ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Bạn muốn đăng ký theo hướng nào?</h2>
              <p className="text-slate-500 mt-2">Chọn lộ trình phù hợp với năng lực và kinh nghiệm của bạn</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CERTIFIED Track */}
              <button 
                onClick={() => setPtForm(p => ({ ...p, preferredTrack: 'CERTIFIED' }))}
                className="group relative bg-white border-2 border-emerald-100 hover:border-emerald-500 rounded-3xl p-8 text-left transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">PT Chuyên Nghiệp</h3>
                  <p className="text-sm font-bold text-emerald-600 mb-4 uppercase tracking-wide">Certified PT</p>
                  
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Dành cho Huấn luyện viên đã qua đào tạo bài bản, có bằng cấp và chứng chỉ uy tín (NASM, ACE, ISSA...).
                  </p>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      Yêu cầu tối thiểu 1 chứng chỉ có ảnh xác minh
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      Được cấp huy hiệu <span className="font-bold text-emerald-600">Verified</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      Ưu tiên hiển thị trên Marketplace
                    </li>
                  </ul>
                  
                  <div className="inline-flex items-center text-emerald-600 font-bold group-hover:text-emerald-700">
                    Chọn lộ trình này <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>

              {/* FREELANCE Track */}
              <button 
                onClick={() => setPtForm(p => ({ ...p, preferredTrack: 'FREELANCE' }))}
                className="group relative bg-white border-2 border-blue-100 hover:border-blue-500 rounded-3xl p-8 text-left transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <Dumbbell className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">PT Tự Do</h3>
                  <p className="text-sm font-bold text-blue-600 mb-4 uppercase tracking-wide">Freelance PT</p>
                  
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Dành cho những bạn dựa vào kinh nghiệm thực chiến dày dặn, tự học hỏi hoặc thi đấu, muốn chia sẻ kiến thức linh hoạt.
                  </p>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <span className="font-bold">Không bắt buộc</span> phải có chứng chỉ
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      Phù hợp với hướng dẫn Online & Dinh dưỡng
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      Dựa vào Review của học viên để tạo uy tín
                    </li>
                  </ul>
                  
                  <div className="inline-flex items-center text-blue-600 font-bold group-hover:text-blue-700">
                    Chọn lộ trình này <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            </div>
            
            <p className="text-center text-xs text-slate-400 mt-6 max-w-lg mx-auto">
              * Quyết định cuối cùng sẽ do Admin xét duyệt dựa trên hồ sơ bạn gửi. Lựa chọn này giúp điều chỉnh form điền phù hợp.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left — Form */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* Form Header with Back Button */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200">
              <div>
                <span className="text-sm text-slate-500">Đang đăng ký dưới tư cách:</span>
                <p className="font-bold text-slate-800">
                  {ptForm.preferredTrack === 'CERTIFIED' ? '🏅 PT Chuyên Nghiệp (Certified)' : '🤸 PT Tự Do (Freelance)'}
                </p>
              </div>
              <button 
                onClick={() => setPtForm(p => ({ ...p, preferredTrack: null }))}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl"
              >
                Đổi lựa chọn
              </button>
            </div>

            {/* Section 1: Basic Info */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <SectionHeader icon={User} title="Thông Tin Cơ Bản" subtitle="Giới thiệu bản thân với học viên" step="1" color="blue" />
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span>Giới Thiệu Bản Thân *</span>
                      <CharCounter value={ptForm.bio} min={100} />
                    </label>
                    <textarea value={ptForm.bio} rows={5}
                      onChange={(e) => setPtForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Kể về bản thân, hành trình và kinh nghiệm của bạn. Một bio hấp dẫn giúp học viên tin tưởng bạn hơn..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span>Triết Lý Huấn Luyện *</span>
                      <CharCounter value={ptForm.trainingPhilosophy} min={50} />
                    </label>
                    <textarea value={ptForm.trainingPhilosophy} rows={3}
                      onChange={(e) => setPtForm(p => ({ ...p, trainingPhilosophy: e.target.value }))}
                      placeholder="Phương pháp và triết lý huấn luyện của bạn là gì? Bạn ưu tiên điều gì khi làm việc với học viên?"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Giới Tính *</label>
                    <select value={ptForm.gender}
                      onChange={(e) => setPtForm(p => ({ ...p, gender: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm">
                      <option value="">Chọn giới tính</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Số Điện Thoại Liên Hệ *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="tel" value={ptForm.contactPhone}
                        onChange={(e) => setPtForm(p => ({ ...p, contactPhone: e.target.value }))}
                        placeholder="0909 xxx xxx"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Experience & Specializations */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <SectionHeader icon={Briefcase} title="Kinh Nghiệm & Chuyên Môn" subtitle="Hệ thống tự tính số năm dựa trên ngày bắt đầu" step="2" color="emerald" />
                <div className="space-y-4">
                  {/* Experience Start Date */}
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Bắt Đầu Làm PT Từ Ngày *</label>
                    <div className="flex gap-3 items-center">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="month" value={ptForm.experienceStartDate?.slice(0, 7) || ptForm.experienceStartDate}
                          max={new Date().toISOString().slice(0, 7)}
                          onChange={(e) => setPtForm(p => ({ ...p, experienceStartDate: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
                      </div>
                      {ptForm.experienceStartDate && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex-shrink-0">
                          <span className="text-sm font-bold text-emerald-700">
                            {calcExperience(ptForm.experienceStartDate)} kinh nghiệm
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Hệ thống sẽ tự động tính và cập nhật số năm kinh nghiệm theo thời gian thực.
                    </p>
                  </div>

                  {/* Specializations */}
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Chuyên Môn * <span className="font-normal text-slate-400">(chọn ít nhất 1)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALIZATION_OPTIONS.map(spec => (
                        <button key={spec} type="button" onClick={() => toggleSpec(spec)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            ptForm.specializations.includes(spec)
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                          }`}>
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Mục tiêu khách hàng phù hợp
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_OPTIONS_KYC.map((opt) => (
                        <button key={opt.value} type="button" onClick={() => togglePreferredGoal(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            ptForm.preferredGoals.includes(opt.value)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Chế độ ăn hỗ trợ
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DIET_OPTIONS_KYC.map((opt) => (
                        <button key={opt.value} type="button" onClick={() => togglePreferredDiet(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            ptForm.preferredDietTypes.includes(opt.value)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Training Mode */}
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">Hình Thức Huấn Luyện *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {TRAINING_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button key={value} type="button" onClick={() => setPtForm(p => ({ ...p, trainingMode: value }))}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            ptForm.trainingMode === value
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 hover:border-emerald-300 text-slate-600'
                          }`}>
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-bold text-center">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  {modeIncludes(ptForm.trainingMode, 'OFFLINE') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Địa Điểm Hoạt Động *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select value={ptForm.location}
                        onChange={(e) => setPtForm(p => ({ ...p, location: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white appearance-none">
                        <option value="">-- Chọn tỉnh/thành --</option>
                        {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  )}

                  {/* Hourly Rate + Unit */}
                  {modeIncludes(ptForm.trainingMode, 'ONLINE') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Phí Huấn Luyện ONLINE *</label>
                    <div className="relative">
                      <input type="number" value={ptForm.onlineRate} min={1}
                        onChange={(e) => setPtForm(p => ({ ...p, onlineRate: e.target.value }))}
                        placeholder="VD: 3000000"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold">VNĐ / tháng</span>
                    </div>
                    {ptForm.onlineRate && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        Phí: <span className="font-bold text-slate-700">
                          {parseInt(ptForm.onlineRate, 10).toLocaleString('vi-VN')}đ
                        </span> / tháng
                      </p>
                    )}
                  </div>
                  )}

                  {modeIncludes(ptForm.trainingMode, 'OFFLINE') && (
                  <>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Phí Huấn Luyện OFFLINE *</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input type="number" value={ptForm.offlineRate} min={1}
                          onChange={(e) => setPtForm(current => ({ ...current, offlineRate: e.target.value }))}
                          placeholder="VD: 500000"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">VNĐ</span>
                      </div>
                      <select value={ptForm.offlineRateUnit}
                        onChange={(e) => setPtForm(current => ({ ...current, offlineRateUnit: e.target.value }))}
                        className="px-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white min-w-[140px]">
                        {OFFLINE_SESSION_OPTIONS.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                      </select>
                    </div>
                    {ptForm.offlineRate && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        Phí: <span className="font-bold text-slate-700">
                          {parseInt(ptForm.offlineRate, 10).toLocaleString('vi-VN')}đ
                        </span> / buổi ({sessionMinutesFromRateUnit(ptForm.offlineRateUnit)} phút)
                      </p>
                    )}
                  </div>
                  <PtVenueAvailabilityEditor
                    venues={registrationVenues}
                    onVenuesChange={setRegistrationVenues}
                    weekSchedule={weekSchedule}
                    onWeekScheduleChange={setWeekSchedule}
                    offlineRateUnit={ptForm.offlineRateUnit}
                  />
                  </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Certifications */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <SectionHeader 
                  icon={Award} 
                  title={`Chứng Chỉ Chuyên Môn ${ptForm.preferredTrack === 'CERTIFIED' ? '*' : '(Tùy chọn)'}`} 
                  subtitle={ptForm.preferredTrack === 'CERTIFIED' ? "Tải ảnh chứng chỉ để Admin có thể xác minh" : "Bỏ trống nếu không có"} 
                  step="3" 
                  color="amber" 
                />
                <div className="space-y-4">
                  {certList.map((cert, i) => (
                    <CertCard
                      key={cert._id}
                      cert={cert}
                      index={i}
                      onChange={handleCertChange}
                      onRemove={removeCert}
                      onImageUpload={handleCertImageUpload}
                    />
                  ))}
                  <button type="button" onClick={addCert}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all font-medium text-sm">
                    <Plus className="w-4 h-4" /> Thêm chứng chỉ khác
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Portfolio & Social */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <SectionHeader icon={FileUp} title="Hồ Sơ & Liên Kết" subtitle="Tùy chọn — giúp tăng độ tin cậy" step="4" color="purple" />
                <div className="space-y-4">
                  {/* CV Upload */}
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">CV (PDF hoặc Word, tối đa 10MB)</label>
                    <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCvUpload} className="hidden" />
                    <div onClick={() => cvInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all">
                      {ptForm.cvUrl ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileUp className="w-8 h-8 text-purple-500" />
                          <div className="text-left">
                            <p className="font-semibold text-slate-800 text-sm">{ptForm.cvFileName || 'CV đã tải lên'}</p>
                            <p className="text-xs text-purple-600">Nhấp để thay đổi</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <FileUp className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                          <p className="font-medium text-slate-600 text-sm">Nhấp để tải lên CV</p>
                          <p className="text-xs text-slate-400 mt-0.5">PDF, DOC, DOCX</p>
                        </>
                      )}
                    </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-pink-500" /> Instagram
                      </label>
                      <input type="url" value={ptForm.instagramUrl}
                        onChange={(e) => setPtForm(p => ({ ...p, instagramUrl: e.target.value }))}
                        placeholder="https://instagram.com/..."
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-blue-600" /> LinkedIn
                      </label>
                      <input type="url" value={ptForm.linkedinUrl}
                        onChange={(e) => setPtForm(p => ({ ...p, linkedinUrl: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none text-sm transition-all" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button onClick={handleRegisterPt} disabled={isSubmittingPt}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl py-6 text-lg font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
              {isSubmittingPt
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Đang gửi hồ sơ...</>
                : <><Sparkles className="h-5 w-5" /> Nộp Hồ Sơ Đăng Ký PT</>}
            </Button>
          </div>

          {/* Right sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            {/* Benefits */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white">
              <CardContent className="p-6">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" /> Quyền Lợi Khi Làm PT
                </h3>
                <div className="space-y-4">
                  {[
                    { icon: Users, color: 'text-emerald-400', title: 'Nhận học viên', desc: 'Kết nối với người cần tư vấn dinh dưỡng' },
                    { icon: TrendingUp, color: 'text-blue-400', title: 'Theo dõi tiến độ', desc: 'Theo dõi học viên 24/7 qua ứng dụng' },
                    { icon: Award, color: 'text-amber-400', title: 'Xây dựng thương hiệu', desc: 'Profile cá nhân trên Marketplace' },
                  ].map(({ icon: Icon, color, title, desc }) => (
                    <div key={title} className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className="font-semibold text-sm">{title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Process */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4">Quy Trình Duyệt</h3>
                <div className="space-y-4">
                  {[
                    { step: 1, color: 'bg-blue-100 text-blue-600', title: 'Nộp hồ sơ', desc: 'Hoàn thành form và gửi đi' },
                    { step: 2, color: 'bg-amber-100 text-amber-600', title: 'Admin xem xét', desc: 'Kiểm tra chứng chỉ và thông tin (1-3 ngày)' },
                    { step: 3, color: 'bg-emerald-100 text-emerald-600', title: 'Được duyệt', desc: 'Profile xuất hiện trên Marketplace' },
                  ].map(({ step, color, title, desc }) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center font-bold text-sm flex-shrink-0`}>{step}</div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{title}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Mẹo tăng tỷ lệ được duyệt
                </h3>
                <ul className="space-y-1.5">
                  {[
                    'Ảnh chứng chỉ rõ nét, không bị mờ',
                    'Bio chi tiết, chân thực ≥ 100 ký tự',
                    'Thêm link Instagram/LinkedIn để tăng uy tín',
                    'Chứng chỉ còn hiệu lực được ưu tiên',
                  ].map((tip) => (
                    <li key={tip} className="text-xs text-blue-700 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-2">Cần hỗ trợ?</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>support@nutrican.vn</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>1900 1234 (T2-T6, 8h-17h)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )
      )}
    </div>
  );
}
