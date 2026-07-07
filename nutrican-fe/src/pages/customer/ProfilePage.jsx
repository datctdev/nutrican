// src/pages/customer/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import ProgressTimelineCard from './components/ProgressTimelineCard';
import MealPlanSkipModal from './components/MealPlanSkipModal';
import { mealPlanService } from '../../services/mealPlanService';
import { appointmentService } from '../../services/appointmentService';
import { refundService } from '../../services/refundService';
import { chatService } from '../../services/chatService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Modal from '../../components/common/Modal';
import { toast } from 'sonner';
import {
  Loader2, Camera, User, Mail, Phone, MapPin, Edit3,
  Heart, Utensils, Calendar, RefreshCw, Sparkles, Check,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import useWebSocket from '../../hooks/useWebSocket';

const ALLERGEN_OPTIONS = [
  { value: 'GLUTEN', label: 'Gluten' },
  { value: 'SEAFOOD', label: 'Hải sản' },
  { value: 'NUT', label: 'Hạt' },
  { value: 'DAIRY', label: 'Sữa' },
  { value: 'EGG', label: 'Trứng' },
  { value: 'SOY', label: 'Đậu nành' },
  { value: 'OTHER', label: 'Khác' },
];

const DIET_OPTIONS = [
  { value: 'NORMAL', label: 'Ăn thường' },
  { value: 'VEGETARIAN', label: 'Ăn chay' },
  { value: 'VEGAN', label: 'Thuần chay' },
  { value: 'KETO', label: 'Keto' },
  { value: 'EAT_CLEAN', label: 'Eat clean' },
];

const GOAL_OPTIONS = [
  { value: 'WEIGHT_LOSS', label: 'Giảm cân' },
  { value: 'WEIGHT_GAIN', label: 'Tăng cân' },
  { value: 'MAINTAIN', label: 'Duy trì' },
  { value: 'PREGNANT', label: 'Mang thai' },
  { value: 'RECOVERY', label: 'Phục hồi' },
];

const REFUND_REASONS = [
  { value: 'PT_CANCEL', label: 'PT hủy buổi' },
  { value: 'PT_NO_RESPONSE', label: 'PT không phản hồi' },
  { value: 'SLA_BREACH', label: 'Vi phạm SLA' },
  { value: 'CUSTOMER_REQUEST', label: 'Yêu cầu khác' },
];

const MEAL_TYPE_LABEL = {
  BREAKFAST: 'Sáng', LUNCH: 'Trưa', DINNER: 'Tối', SNACK: 'Phụ',
};

const APPT_STATUS_LABEL = {
  PENDING: { text: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { text: 'Đã xác nhận', cls: 'bg-emerald-100 text-emerald-700' },
  EXPIRED: { text: 'Đã hết hạn', cls: 'bg-slate-100 text-slate-600' },
  CANCELLED: { text: 'Đã hủy', cls: 'bg-red-50 text-red-600' },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser, setUser: setAuthUser } = useAuthStore();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({ fullName: '', email: '', phoneNumber: '', address: '', avatarUrl: '' });
  const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', address: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [allergens, setAllergens] = useState([]);
  const [dietPreference, setDietPreference] = useState('NORMAL');
  const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
  const [pregnancyTrimester, setPregnancyTrimester] = useState(1);
  const [savingHealth, setSavingHealth] = useState(false);
  const [loadingMacro, setLoadingMacro] = useState(false);
  const [goalForm, setGoalForm] = useState({ targetWeight: '', baselineWeight: '', targetDate: '' });
  const [bodyWeight, setBodyWeight] = useState('');
  const [progressGoals, setProgressGoals] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [bodyMetricHistory, setBodyMetricHistory] = useState([]);
  const [savingGoals, setSavingGoals] = useState(false);

  const [mealPlan, setMealPlan] = useState(null);
  const [mealPlanItems, setMealPlanItems] = useState([]);
  const [mealPlanPrefWarnings, setMealPlanPrefWarnings] = useState([]);
  const [loadingMealPlan, setLoadingMealPlan] = useState(false);
  const [weeklySummaries, setWeeklySummaries] = useState([]);
  const [newWeeklySummary, setNewWeeklySummary] = useState(false);
  const [skipModalItemId, setSkipModalItemId] = useState(null);
  const [skippingMeal, setSkippingMeal] = useState(false);
  const [postMealRatingOptIn, setPostMealRatingOptIn] = useState(true);
  const [hireResultEmail, setHireResultEmail] = useState(true);
  const [sosResultEmail, setSosResultEmail] = useState(true);
  const [weeklySummaryEmail, setWeeklySummaryEmail] = useState(true);
  const [bodyMetricReminder, setBodyMetricReminder] = useState(true);
  const [showBodyMetricReminder, setShowBodyMetricReminder] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [ptThreads, setPtThreads] = useState([]);
  const [apptForm, setApptForm] = useState({ ptId: '', startTime: '', endTime: '', note: '' });
  const [bookingAppt, setBookingAppt] = useState(false);

  const [refundForm, setRefundForm] = useState({ mappingId: '', reason: 'CUSTOMER_REQUEST', note: '' });
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [coachingHistory, setCoachingHistory] = useState([]);
  const [endCoachingLoading, setEndCoachingLoading] = useState(false);
  const [mappingStatus, setMappingStatus] = useState(null);
  const [endCoachingModalOpen, setEndCoachingModalOpen] = useState(false);

  useWebSocket();

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const onRefundUpdate = () => {
      fetchAll();
    };
    const onWeeklySummary = () => {
      setNewWeeklySummary(true);
      fetchWeeklySummaries();
    };
    window.addEventListener('refund_update', onRefundUpdate);
    window.addEventListener('weekly_summary', onWeeklySummary);
    return () => {
      window.removeEventListener('refund_update', onRefundUpdate);
      window.removeEventListener('weekly_summary', onWeeklySummary);
    };
  }, []);

  const fetchAll = async () => {
    setIsLoadingProfile(true);
    try {
      const [profileRes, allergyRes, threadsRes] = await Promise.all([
        userService.getProfile(),
        userService.getAllergies().catch(() => ({ data: { data: [] } })),
        chatService.getThreads().catch(() => ({ data: { data: [] } })),
      ]);
      const data = profileRes.data.data;
      const p = {
        fullName: data.fullName || '', email: data.email || '',
        phoneNumber: data.phoneNumber || '', address: data.address || '',
        avatarUrl: data.avatarUrl || '',
      };
      setProfile(p);
      setEditForm({ fullName: p.fullName, phoneNumber: p.phoneNumber, address: p.address });
      setAllergens(allergyRes.data.data || data.allergens || []);
      if (data.dietPreference) setDietPreference(data.dietPreference);
      if (data.nutritionGoal) setNutritionGoal(data.nutritionGoal);
      if (data.pregnancyTrimester) setPregnancyTrimester(data.pregnancyTrimester);
      const optIn = data.notificationOptIn || {};
      setPostMealRatingOptIn(optIn.postMealRating !== false);
      setHireResultEmail(optIn.hireResultEmail !== false);
      setSosResultEmail(optIn.sosResultEmail !== false);
      setWeeklySummaryEmail(optIn.weeklySummaryEmail !== false);
      setBodyMetricReminder(optIn.bodyMetricReminder !== false);
      try {
        localStorage.setItem('nutrican_post_meal_opt_in', JSON.stringify(optIn.postMealRating !== false));
      } catch { /* ignore */ }

      const activeThreads = (threadsRes.data.data || []).filter((t) => t.status === 'ACTIVE' || t.status === 'END_REQUESTED');
      setPtThreads(activeThreads.filter((t) => t.status === 'ACTIVE'));
      const endReq = activeThreads.find((t) => t.status === 'END_REQUESTED');
      setMappingStatus(endReq ? 'END_REQUESTED' : activeThreads.some((t) => t.status === 'ACTIVE') ? 'ACTIVE' : null);
      profileExtensionsService.getCoachingHistory().then((r) => setCoachingHistory(r.data?.data || [])).catch(() => {});
      if (activeThreads.length && !apptForm.ptId) {
        setApptForm((f) => ({ ...f, ptId: activeThreads[0].participantId }));
        setRefundForm((f) => ({ ...f, mappingId: activeThreads[0].mappingId }));
      }
    } catch {
      toast.error('Không thể tải hồ sơ cá nhân');
    } finally {
      setIsLoadingProfile(false);
    }
    fetchMealPlan();
    fetchWeeklySummaries();
    fetchAppointments();
    profileExtensionsService.getBodyMetricReminderStatus()
      .then((r) => setShowBodyMetricReminder(!!r.data?.data?.showReminder))
      .catch(() => setShowBodyMetricReminder(false));
    profileExtensionsService.getGoals().then((r) => {
      const g = r.data.data;
      setProgressGoals(g);
      if (g) {
        setGoalForm({
          targetWeight: g.targetWeight ?? '',
          baselineWeight: g.baselineWeight ?? '',
          targetDate: g.targetDate ?? '',
        });
      }
    }).catch(() => {});
    profileExtensionsService.getMilestones().then((r) => setMilestones(r.data.data || [])).catch(() => {});
    profileExtensionsService.getBodyMetrics({ page: 0, size: 6 })
      .then((r) => setBodyMetricHistory(r.data.data?.content || r.data.data || []))
      .catch(() => setBodyMetricHistory([]));
  };

  const fetchWeeklySummaries = async () => {
    try {
      const res = await mealPlanService.getWeeklySummaries();
      setWeeklySummaries(res.data.data || []);
    } catch {
      setWeeklySummaries([]);
    }
  };

  const fetchMealPlan = async () => {
    setLoadingMealPlan(true);
    try {
      const res = await mealPlanService.getCurrent();
      setMealPlan(res.data.data?.plan || res.data.data?.[0] || res.data.data);
      setMealPlanItems(res.data.data?.items || []);
      setMealPlanPrefWarnings(res.data.data?.dietPrefWarnings || []);
    } catch {
      setMealPlan(null);
      setMealPlanItems([]);
    } finally {
      setLoadingMealPlan(false);
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('Hủy lịch hẹn này? Hủy trước 48h không phí; dưới 48h ghi nhận hủy muộn.')) return;
    try {
      await appointmentService.cancel(apptId);
      toast.success('Đã hủy lịch hẹn');
      fetchAppointments();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không hủy được lịch hẹn');
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await appointmentService.getUpcoming();
      setAppointments(res.data.data || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleSaveHealth = async () => {
    setSavingHealth(true);
    try {
      await Promise.all([
        userService.updateAllergies(allergens),
        userService.updatePreferences({
          dietPreference,
          nutritionGoal,
          pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
          notificationOptIn: {
            postMealRating: postMealRatingOptIn,
            hireResultEmail,
            sosResultEmail,
            weeklySummaryEmail,
            bodyMetricReminder,
          },
        }),
      ]);
      toast.success('Đã lưu sức khỏe & dinh dưỡng');
    } catch {
      toast.error('Không thể lưu thông tin');
    } finally {
      setSavingHealth(false);
    }
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    try {
      const res = await profileExtensionsService.saveGoals({
        nutritionGoal,
        targetWeight: goalForm.targetWeight ? Number(goalForm.targetWeight) : null,
        baselineWeight: goalForm.baselineWeight ? Number(goalForm.baselineWeight) : null,
        targetDate: goalForm.targetDate || null,
        trimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
      });
      setProgressGoals(res.data.data);
      toast.success('Đã lưu mục tiêu');
    } catch {
      toast.error('Không lưu được mục tiêu');
    } finally {
      setSavingGoals(false);
    }
  };

  const handleLogWeight = async () => {
    if (!bodyWeight) {
      toast.error('Nhập cân nặng');
      return;
    }
    try {
      await profileExtensionsService.recordBodyMetric({ weight: Number(bodyWeight) });
      toast.success('Đã ghi nhận cân nặng');
      setBodyWeight('');
      const [ms, bm] = await Promise.all([
        profileExtensionsService.getMilestones(),
        profileExtensionsService.getBodyMetrics({ page: 0, size: 6 }),
      ]);
      setMilestones(ms.data.data || []);
      setBodyMetricHistory(bm.data.data?.content || bm.data.data || []);
    } catch {
      toast.error('Không ghi được cân nặng');
    }
  };

  const handleMacroSuggestion = async () => {
    setLoadingMacro(true);
    try {
      const res = await userService.getMacroSuggestion();
      const m = res.data.data;
      toast.success(`Gợi ý: ${m.dailyCalories} kcal · P${m.protein}g C${m.carb}g F${m.fat}g`, { duration: 5000 });
      navigate('/macro-targets');
    } catch {
      toast.error('Không thể lấy gợi ý macro');
    } finally {
      setLoadingMacro(false);
    }
  };

  const toggleAllergen = (value) => {
    setAllergens((prev) => prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]);
  };

  const handleMarkEaten = async (itemId, eaten) => {
    try {
      await mealPlanService.markEaten(itemId, eaten);
      setMealPlanItems((items) => items.map((i) => (i.id === itemId ? { ...i, eaten } : i)));
    } catch {
      toast.error('Không thể cập nhật món ăn');
    }
  };

  const handleSkipMeal = (itemId) => {
    setSkipModalItemId(itemId);
  };

  const confirmSkipMeal = async ({ skipReason, skipNote }) => {
    if (!skipModalItemId) return;
    setSkippingMeal(true);
    try {
      await mealPlanService.skipItem(skipModalItemId, { skipReason, skipNote });
      setMealPlanItems((items) => items.map((i) => (
        i.id === skipModalItemId ? { ...i, eaten: false, skipReason } : i
      )));
      toast.success('Đã ghi nhận bỏ qua món');
      setSkipModalItemId(null);
    } catch {
      toast.error('Không thể bỏ qua món');
    } finally {
      setSkippingMeal(false);
    }
  };

  const handleSuggestReplacement = async (itemId) => {
    const name = window.prompt('Món bạn muốn thay thế:');
    if (!name) return;
    const gram = window.prompt('Khẩu phần (g):', '350');
    try {
      await mealPlanService.suggestReplacement(itemId, {
        suggestedFoodName: name,
        suggestedGram: gram ? Number(gram) : undefined,
      });
      toast.success('Đã gửi đề nghị thay thế cho PT');
    } catch {
      toast.error('Không gửi được đề nghị');
    }
  };

  const handleBookAppointment = async () => {
    if (!apptForm.ptId || !apptForm.startTime || !apptForm.endTime) {
      toast.error('Chọn PT và thời gian hẹn');
      return;
    }
    setBookingAppt(true);
    try {
      await appointmentService.book(apptForm.ptId, {
        startTime: apptForm.startTime?.length === 16 ? `${apptForm.startTime}:00` : apptForm.startTime,
        endTime: apptForm.endTime?.length === 16 ? `${apptForm.endTime}:00` : apptForm.endTime,
        type: 'ONLINE',
        note: apptForm.note || undefined,
      });
      toast.success('Đã gửi yêu cầu đặt lịch');
      setApptForm((f) => ({ ...f, startTime: '', endTime: '', note: '' }));
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đặt lịch');
    } finally {
      setBookingAppt(false);
    }
  };

  const handleRefund = async () => {
    if (!refundForm.mappingId) {
      toast.error('Chọn PT để yêu cầu hoàn tiền');
      return;
    }
    setSubmittingRefund(true);
    try {
      await refundService.create({
        mappingId: refundForm.mappingId,
        reason: refundForm.reason,
        note: refundForm.note || undefined,
      });
      toast.success('Đã gửi yêu cầu hoàn tiền');
      setRefundForm((f) => ({ ...f, note: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn một tệp hình ảnh');
    if (file.size > 5 * 1024 * 1024) return toast.error('Dung lượng hình ảnh phải dưới 5MB');

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await userService.uploadAvatar(formData);
      const newAvatarUrl = response.data.data;
      setProfile((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
      setAuthUser({ ...authUser, avatarUrl: newAvatarUrl });
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch {
      toast.error('Tải ảnh đại diện thất bại');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const response = await userService.updateProfile({
        fullName: editForm.fullName, phoneNumber: editForm.phoneNumber, address: editForm.address,
      });
      setAuthUser({ ...authUser, ...response.data.data });
      setProfile((prev) => ({ ...prev, ...editForm }));
      toast.success('Cập nhật hồ sơ thành công!');
      setIsEditModalOpen(false);
    } catch {
      toast.error('Cập nhật hồ sơ thất bại');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openEditModal = () => {
    setEditForm({ fullName: profile.fullName, phoneNumber: profile.phoneNumber, address: profile.address });
    setIsEditModalOpen(true);
  };

  const getInitials = (name) => name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const groupedMealItems = mealPlanItems.reduce((acc, item) => {
    const key = item.planDate || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const mealPlanPrefWarnCodes = new Set(
    (mealPlanPrefWarnings || []).map((w) => w.foodCode).filter(Boolean)
  );

  if (isLoadingProfile) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in space-y-6 min-w-0 overflow-x-hidden">
      <div className="mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trang cá nhân</h1>
        <p className="text-slate-500 mt-1 font-medium">Xem và quản lý thông tin cá nhân của bạn.</p>
      </div>

      {/* Basic profile card */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardContent className="px-8 pb-8">
          <div className="flex items-end justify-between -mt-16 mb-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full p-1.5 bg-white shadow-lg">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-4xl">
                    {getInitials(profile.fullName)}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg disabled:opacity-50">
                {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{profile.fullName || 'Thành viên'}</h2>
            <p className="text-slate-500 mt-1">{profile.email}</p>
          </div>

          <div className="space-y-1">
            {[
              { icon: User, label: 'Họ và tên', value: profile.fullName || '—' },
              { icon: Mail, label: 'Email', value: profile.email || '—' },
              { icon: Phone, label: 'Số điện thoại', value: profile.phoneNumber || 'Chưa thiết lập' },
              { icon: MapPin, label: 'Địa chỉ', value: profile.address || 'Chưa thiết lập', last: true },
            ].map(({ icon: Icon, label, value, last }) => (
              <div key={label} className={`flex items-center py-4 ${last ? '' : 'border-b border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-slate-900 font-medium mt-0.5">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6">
            <Button onClick={openEditModal} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2">
              <Edit3 className="w-4 h-4" /> Chỉnh sửa hồ sơ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health & nutrition */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-bold text-slate-900">Sức khỏe & dinh dưỡng</h3>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Dị ứng</p>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => toggleAllergen(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    allergens.includes(opt.value)
                      ? 'bg-rose-100 border-rose-300 text-rose-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Chế độ ăn</label>
              <select value={dietPreference} onChange={(e) => setDietPreference(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                {DIET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mục tiêu</label>
              <select value={nutritionGoal} onChange={(e) => setNutritionGoal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {nutritionGoal === 'PREGNANT' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tam cá nguyệt</label>
              <select value={pregnancyTrimester} onChange={(e) => setPregnancyTrimester(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                {[1, 2, 3].map((t) => <option key={t} value={t}>Tam cá nguyệt {t}</option>)}
              </select>
            </div>
          )}

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={postMealRatingOptIn}
              onChange={(e) => setPostMealRatingOptIn(e.target.checked)}
              className="rounded border-slate-300"
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">Nhắc đánh giá sau bữa ăn</p>
              <p className="text-xs text-slate-500">Tắt nếu bạn không muốn nhận nhắc ~30 phút sau khi ghi nhận bữa.</p>
            </div>
          </label>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase">Email thông báo</p>
            {[
              { checked: hireResultEmail, set: setHireResultEmail, title: 'Kết quả thuê PT', desc: 'Email khi PT chấp nhận/từ chối yêu cầu thuê.' },
              { checked: sosResultEmail, set: setSosResultEmail, title: 'Kết quả SOS', desc: 'Email khi ticket SOS được xử lý hoặc quá hạn.' },
              { checked: weeklySummaryEmail, set: setWeeklySummaryEmail, title: 'Tổng kết tuần', desc: 'Email tổng kết dinh dưỡng từ PT.' },
              { checked: bodyMetricReminder, set: setBodyMetricReminder, title: 'Nhắc ghi cân hàng tuần', desc: 'Thông báo nếu bạn chưa ghi cân hơn 7 ngày.' },
            ].map((item) => (
              <label key={item.title} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSaveHealth} disabled={savingHealth} className="flex-1 rounded-xl">
              {savingHealth ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu sức khỏe'}
            </Button>
            <Button variant="outline" onClick={handleMacroSuggestion} disabled={loadingMacro} className="flex-1 rounded-xl gap-2">
              <Sparkles className="w-4 h-4" /> Gợi ý macro
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Mục tiêu & tiến độ</h3>
          {showBodyMetricReminder && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Bạn chưa ghi cân nặng hơn 7 ngày. Hãy cập nhật để theo dõi tiến độ chính xác hơn.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Cân baseline (kg)" value={goalForm.baselineWeight}
              onChange={(e) => setGoalForm((f) => ({ ...f, baselineWeight: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Cân mục tiêu (kg)" value={goalForm.targetWeight}
              onChange={(e) => setGoalForm((f) => ({ ...f, targetWeight: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={goalForm.targetDate}
              onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSaveGoals} disabled={savingGoals} className="rounded-xl">Lưu mục tiêu</Button>
            <div className="flex gap-2 flex-1">
              <input placeholder="Cân hôm nay (kg)" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <Button variant="outline" onClick={handleLogWeight} className="rounded-xl shrink-0">Ghi cân hôm nay</Button>
            </div>
          </div>
          {bodyMetricHistory.length > 0 && (
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-600">Lịch sử gần đây</p>
              {bodyMetricHistory.slice(0, 5).map((m) => (
                <p key={m.id || m.recordDate}>{m.recordDate}: {m.weight} kg</p>
              ))}
            </div>
          )}
          <ProgressTimelineCard goals={progressGoals} milestones={milestones} bodyMetrics={bodyMetricHistory} compact />
        </CardContent>
      </Card>

      {/* Meal plan */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Thực đơn tuần</h3>
            {newWeeklySummary && (
              <span className="text-[10px] font-bold text-white bg-violet-600 px-2 py-0.5 rounded-full">Tổng kết mới</span>
            )}
          </div>
          {weeklySummaries.length > 0 && (
            <div className="mb-4 p-4 rounded-xl bg-violet-50 border border-violet-100 space-y-2">
              <p className="text-xs font-bold text-violet-700 uppercase">Tổng kết từ PT</p>
              {weeklySummaries.slice(0, 2).map((ws) => (
                <div key={ws.id} className="text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">Tuần {ws.weekStartDate}
                    {ws.adherenceRate != null && <span className="text-violet-600 font-normal ml-2">Tuân thủ {ws.adherenceRate}%</span>}
                  </p>
                  <p className="text-slate-600">{ws.summaryText}</p>
                  {ws.nextPlanNote && <p className="text-xs text-slate-500 mt-1">Tuần tới: {ws.nextPlanNote}</p>}
                </div>
              ))}
            </div>
          )}
          {loadingMealPlan ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
          ) : !mealPlanItems.length ? (
            <p className="text-sm text-slate-500 text-center py-6">PT chưa lên thực đơn cho bạn.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedMealItems).sort().map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">{date}</p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
                        <input type="checkbox" checked={!!item.eaten} onChange={(e) => handleMarkEaten(item.id, e.target.checked)}
                          className="rounded border-slate-300" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {item.freeText || item.foodCode || 'Món ăn'}
                            {item.foodCode && mealPlanPrefWarnCodes.has(item.foodCode) && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-1">!PREF</span>
                            )}
                            <span className="text-slate-400 font-normal ml-1">
                              · {MEAL_TYPE_LABEL[item.mealType] || item.mealType}
                            </span>
                          </p>
                          {item.portionGrams && (
                            <p className="text-xs text-slate-500">{item.portionGrams}g</p>
                          )}
                        </div>
                        {item.eaten && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Button type="button" size="sm" variant="outline" className="text-[10px] h-7"
                            onClick={(e) => { e.preventDefault(); handleSuggestReplacement(item.id); }}>
                            Đề nghị
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="text-[10px] h-7 text-amber-700"
                            onClick={(e) => { e.preventDefault(); handleSkipMeal(item.id); }}>
                            Bỏ qua
                          </Button>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointments */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Lịch hẹn PT</h3>
          </div>

          {loadingAppts ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
          ) : appointments.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có lịch hẹn sắp tới.</p>
          ) : (
            <div className="space-y-2">
              {appointments.map((a) => {
                const badge = APPT_STATUS_LABEL[a.status] || { text: a.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(a.startTime).toLocaleString('vi-VN')}
                      </p>
                      {a.note && <p className="text-xs text-slate-500 mt-0.5">{a.note}</p>}
                      {a.cancelType && <p className="text-xs text-slate-400 mt-0.5">Hủy: {a.cancelType}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>
                      {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleCancelAppointment(a.id)}>
                          Hủy
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ptThreads.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase">Đặt lịch mới</p>
              <select value={apptForm.ptId} onChange={(e) => setApptForm((f) => ({ ...f, ptId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                {ptThreads.map((t) => (
                  <option key={t.mappingId} value={t.participantId}>{t.participantName}</option>
                ))}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="datetime-local" value={apptForm.startTime}
                  onChange={(e) => setApptForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                <input type="datetime-local" value={apptForm.endTime}
                  onChange={(e) => setApptForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </div>
              <input type="text" placeholder="Ghi chú (tuỳ chọn)" value={apptForm.note}
                onChange={(e) => setApptForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <Button onClick={handleBookAppointment} disabled={bookingAppt} className="w-full rounded-xl">
                {bookingAppt ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi yêu cầu đặt lịch'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coaching lifecycle */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Coaching với PT</h3>
          {ptThreads.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mappingStatus === 'END_REQUESTED' ? (
                <Button onClick={() => setEndCoachingModalOpen(true)} disabled={endCoachingLoading} className="rounded-xl">
                  Xác nhận kết thúc coaching
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setEndCoachingModalOpen(true)} disabled={endCoachingLoading} className="rounded-xl border-amber-200 text-amber-800">
                  Yêu cầu kết thúc coaching
                </Button>
              )}
            </div>
          )}
          {coachingHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600">Lịch sử coaching</p>
              {coachingHistory.map((h) => (
                <div key={h.mappingId} className="text-sm text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
                  {h.ptName} — {h.completedAt ? new Date(h.completedAt).toLocaleDateString('vi-VN') : '—'}
                </div>
              ))}
            </div>
          )}
          {!ptThreads.length && !coachingHistory.length && (
            <p className="text-sm text-slate-500">Chưa có coaching nào.</p>
          )}
        </CardContent>
      </Card>

      {/* Refund */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-violet-600" />
            <h3 className="text-lg font-bold text-slate-900">Yêu cầu hoàn tiền</h3>
          </div>

          {ptThreads.length === 0 ? (
            <p className="text-sm text-slate-500">Bạn cần có PT đang hoạt động để yêu cầu hoàn tiền.</p>
          ) : (
            <>
              <select value={refundForm.mappingId} onChange={(e) => setRefundForm((f) => ({ ...f, mappingId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                {ptThreads.map((t) => (
                  <option key={t.mappingId} value={t.mappingId}>{t.participantName}</option>
                ))}
              </select>
              <select value={refundForm.reason} onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <textarea value={refundForm.note} onChange={(e) => setRefundForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Ghi chú thêm..." rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none" />
              <Button onClick={handleRefund} disabled={submittingRefund} variant="outline"
                className="w-full rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50">
                {submittingRefund ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi yêu cầu hoàn tiền'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={endCoachingModalOpen} onClose={() => setEndCoachingModalOpen(false)}
        title={mappingStatus === 'END_REQUESTED' ? 'Xác nhận kết thúc coaching?' : 'Yêu cầu kết thúc coaching?'}>
        <p className="text-sm text-slate-600 mb-4">
          {mappingStatus === 'END_REQUESTED'
            ? 'Bạn xác nhận kết thúc quan hệ coaching với PT hiện tại?'
            : 'Bạn sẽ gửi yêu cầu kết thúc coaching. PT cần xác nhận trước khi hoàn tất.'}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setEndCoachingModalOpen(false)}>Hủy</Button>
          <Button onClick={async () => {
            setEndCoachingLoading(true);
            try {
              if (mappingStatus === 'END_REQUESTED') {
                await profileExtensionsService.confirmEndCoaching();
                toast.success('Đã xác nhận kết thúc coaching');
              } else {
                await profileExtensionsService.requestEndCoaching();
                toast.success('Đã gửi yêu cầu kết thúc coaching');
              }
              setEndCoachingModalOpen(false);
              fetchAll();
            } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
            finally { setEndCoachingLoading(false); }
          }} disabled={endCoachingLoading}>
            {endCoachingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa hồ sơ">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Họ và tên</label>
            <input type="text" value={editForm.fullName}
              onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
            <input type="text" value={editForm.phoneNumber}
              onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Địa chỉ</label>
            <textarea value={editForm.address} rows={3}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 outline-none resize-none focus:border-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1 rounded-xl py-5">Hủy</Button>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 bg-blue-600 text-white rounded-xl py-5">
              {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      </Modal>

      <MealPlanSkipModal
        open={!!skipModalItemId}
        onClose={() => setSkipModalItemId(null)}
        onConfirm={confirmSkipMeal}
        saving={skippingMeal}
      />
    </div>
  );
}
