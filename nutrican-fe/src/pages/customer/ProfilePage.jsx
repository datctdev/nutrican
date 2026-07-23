// src/pages/customer/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userService } from '../../services/userService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import ProgressTimelineCard from './components/ProgressTimelineCard';
import { mealPlanService } from '../../services/mealPlanService';
import { appointmentService } from '../../services/appointmentService';
import { refundService } from '../../services/refundService';
import { chatService } from '../../services/chatService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'sonner';
import {
    Loader2, Camera, User, Users, Mail, Phone, MapPin, Edit3,
    Heart, Utensils, Calendar, RefreshCw, Sparkles, Check,
    ChevronRight, Target, Flame, Activity, Ruler, Weight, ShieldAlert,
    ShieldCheck, HelpCircle, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ACTIVITY_LEVEL_OPTIONS, ActivityLevelInfoTooltip } from './components/activityLevelOptions';
import AllergySelector from './components/AllergySelector';

const DIET_OPTIONS = [
    { value: 'NORMAL', label: 'Ăn bình thường (Đầy đủ chất)' },
    { value: 'VEGETARIAN', label: 'Ăn chay (Có trứng & sữa)' },
    { value: 'VEGAN', label: 'Thuần chay (100% thực vật)' },
    { value: 'KETO', label: 'Chế độ Keto' },
    { value: 'EAT_CLEAN', label: 'Eat Clean' },
];

const GOAL_OPTIONS = [
    { value: 'WEIGHT_LOSS', label: 'Giảm cân / Giảm mỡ' },
    { value: 'WEIGHT_GAIN', label: 'Tăng cân / Tăng cơ' },
    { value: 'MAINTAIN', label: 'Duy trì cân nặng' },
    { value: 'PREGNANT', label: 'Dinh dưỡng thai kỳ' },
    { value: 'RECOVERY', label: 'Phục hồi thể chất' },
];

const REFUND_REASONS = [
    { value: 'PT_CANCEL', label: 'PT hủy buổi' },
    { value: 'PT_NO_RESPONSE', label: 'PT không phản hồi' },
    { value: 'SLA_BREACH', label: 'Vi phạm SLA' },
    { value: 'CUSTOMER_REQUEST', label: 'Yêu cầu khác' },
];

const MEAL_TYPE_LABEL = {
    BREAKFAST: 'Buổi sáng', LUNCH: 'Buổi trưa', DINNER: 'Buổi tối', SNACK: 'Buổi chiều / khuya',
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

    // Profile cơ bản
    const [profile, setProfile] = useState({ fullName: '', email: '', phoneNumber: '', address: '', avatarUrl: '' });
    const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', address: '' });
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Thể chất & Dinh dưỡng (HEALTH & NUTRITION STATE)
    const [healthData, setHealthData] = useState({
        heightCm: '',
        weightKg: '',
        gender: 'male',
        dateOfBirth: '',
        activityLevel: 'MODERATE',
        nutritionGoal: 'MAINTAIN',
        dietPreference: 'NORMAL',
        pregnancyTrimester: 1,
        allergyNotes: '',
        targetWeight: '',
    });
    const [editHealthForm, setEditHealthForm] = useState({ ...healthData });
    const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
    const [isSavingHealth, setIsSavingHealth] = useState(false);
    const [hasActivePt, setHasActivePt] = useState(false);

    // Các State tính năng khác
    const [progressGoals, setProgressGoals] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [bodyMetricHistory, setBodyMetricHistory] = useState([]);
    const [mealPlan, setMealPlan] = useState(null);
    const [mealPlanItems, setMealPlanItems] = useState([]);
    const [mealPlanPrefWarnings, setMealPlanPrefWarnings] = useState([]);
    const [loadingMealPlan, setLoadingMealPlan] = useState(false);
    const [weeklySummaries, setWeeklySummaries] = useState([]);
    const [newWeeklySummary, setNewWeeklySummary] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const [loadingAppts, setLoadingAppts] = useState(false);
    const [ptThreads, setPtThreads] = useState([]);
    const [refundForm, setRefundForm] = useState({ mappingId: '', reason: 'CUSTOMER_REQUEST', note: '' });
    const [submittingRefund, setSubmittingRefund] = useState(false);
    const [coachingHistory, setCoachingHistory] = useState([]);
    const [mappingStatus, setMappingStatus] = useState(null);
    const [endRequestedBy, setEndRequestedBy] = useState(null);
    const [endCoachingModalOpen, setEndCoachingModalOpen] = useState(false);
    const [endCoachingLoading, setEndCoachingLoading] = useState(false);
    const [cancelApptId, setCancelApptId] = useState(null);
    const [cancellingAppt, setCancellingAppt] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    useEffect(() => {
        const onRefundUpdate = () => fetchAll();
        const onHireUpdate = () => fetchAll();
        const onWeeklySummary = () => {
            setNewWeeklySummary(true);
            fetchWeeklySummaries();
        };
        window.addEventListener('refund_update', onRefundUpdate);
        window.addEventListener('hire_request_updated', onHireUpdate);
        window.addEventListener('weekly_summary', onWeeklySummary);
        return () => {
            window.removeEventListener('refund_update', onRefundUpdate);
            window.removeEventListener('hire_request_updated', onHireUpdate);
            window.removeEventListener('weekly_summary', onWeeklySummary);
        };
    }, []);

    const fetchAll = async () => {
        setIsLoadingProfile(true);
        try {
            const [profileRes, allergyRes, goalsRes, ptRes, metricsRes, threadsRes] = await Promise.all([
                userService.getProfile(),
                userService.getAllergies().catch(() => ({ data: { data: [] } })),
                profileExtensionsService.getGoals().catch(() => ({ data: { data: null } })),
                profileExtensionsService.hasActivePt().catch(() => ({ data: { data: { hasActivePt: false } } })),
                profileExtensionsService.getBodyMetrics({ page: 0, size: 6 }).catch(() => ({ data: { data: { content: [] } } })),
                chatService.getThreads().catch(() => ({ data: { data: [] } })),
            ]);

            const data = profileRes.data.data;
            const metricsList = metricsRes.data.data?.content || metricsRes.data.data || [];
            const latestWeight = metricsList.length > 0 ? metricsList[0].weight : data.weightKg || data.weight || '';

            // Set Profile cơ bản
            const p = {
                fullName: data.fullName || '', email: data.email || '',
                phoneNumber: data.phoneNumber || '', address: data.address || '',
                avatarUrl: data.avatarUrl || '',
            };
            setProfile(p);
            setEditForm({ fullName: p.fullName, phoneNumber: p.phoneNumber, address: p.address });

            // Set Health & Physical Data
            const hData = {
                heightCm: data.heightCm || '',
                weightKg: latestWeight || '',
                gender: data.gender || 'male',
                dateOfBirth: data.dateOfBirth || '',
                activityLevel: data.activityLevel || 'MODERATE',
                nutritionGoal: data.nutritionGoal || 'MAINTAIN',
                dietPreference: data.dietPreference || 'NORMAL',
                pregnancyTrimester: data.pregnancyTrimester || 1,
                allergyNotes: allergyRes.data.data?.allergyNotes || data.allergyNotes || '',
                targetWeight: goalsRes.data?.data?.targetWeight || '',
            };
            setHealthData(hData);
            setEditHealthForm({ ...hData });
            setHasActivePt(Boolean(ptRes.data?.data?.hasActivePt));
            setBodyMetricHistory(metricsList);
            setProgressGoals(goalsRes.data?.data);

            // Set Threads & Coaching
            const activeThreads = (threadsRes.data.data || []).filter((t) => t.status === 'ACTIVE' || t.status === 'END_REQUESTED');
            setPtThreads(activeThreads);
            const endReq = activeThreads.find((t) => t.status === 'END_REQUESTED');
            setMappingStatus(endReq ? 'END_REQUESTED' : activeThreads.length > 0 ? 'ACTIVE' : null);
            setEndRequestedBy(endReq ? endReq.endRequestedBy : null);
            if (activeThreads.length) setRefundForm((f) => ({ ...f, mappingId: activeThreads[0].mappingId }));

            profileExtensionsService.getCoachingHistory().then((r) => setCoachingHistory(r.data?.data || [])).catch(() => {});
        } catch {
            toast.error('Không thể tải hồ sơ cá nhân');
        } finally {
            setIsLoadingProfile(false);
        }
        fetchMealPlan();
        fetchWeeklySummaries();
        fetchAppointments();
        profileExtensionsService.getMilestones().then((r) => setMilestones(r.data.data || [])).catch(() => {});
    };

    const fetchWeeklySummaries = async () => {
        try {
            const res = await mealPlanService.getWeeklySummaries();
            setWeeklySummaries(res.data.data || []);
        } catch { setWeeklySummaries([]); }
    };

    const fetchMealPlan = async () => {
        setLoadingMealPlan(true);
        try {
            const res = await mealPlanService.getCurrent();
            setMealPlan(res.data.data?.plan || res.data.data?.[0] || res.data.data);
            setMealPlanItems(res.data.data?.items || []);
            setMealPlanPrefWarnings(res.data.data?.dietPrefWarnings || []);
        } catch {
            setMealPlan(null); setMealPlanItems([]);
        } finally { setLoadingMealPlan(false); }
    };

    const fetchAppointments = async () => {
        setLoadingAppts(true);
        try {
            const res = await appointmentService.getUpcoming();
            setAppointments(res.data.data || []);
        } catch { setAppointments([]); }
        finally { setLoadingAppts(false); }
    };

    const handleCancelAppointment = (apptId) => setCancelApptId(apptId);
    const confirmCancelAppointment = async () => {
        if (!cancelApptId) return;
        setCancellingAppt(true);
        try {
            await appointmentService.cancel(cancelApptId);
            toast.success('Đã hủy lịch hẹn');
            setCancelApptId(null);
            fetchAppointments();
        } catch (e) { toast.error(e.response?.data?.message || 'Không hủy được lịch hẹn'); }
        finally { setCancellingAppt(false); }
    };

    const handleMarkEaten = async (itemId, eaten) => {
        try {
            await mealPlanService.markEaten(itemId, eaten);
            setMealPlanItems((items) => items.map((i) => (i.id === itemId ? { ...i, eaten } : i)));
        } catch { toast.error('Không thể cập nhật món ăn'); }
    };

    const handleRefund = async () => {
        if (!refundForm.mappingId) return toast.error('Chọn PT để yêu cầu hoàn tiền');
        setSubmittingRefund(true);
        try {
            await refundService.create({ mappingId: refundForm.mappingId, reason: refundForm.reason, note: refundForm.note || undefined });
            toast.success('Đã gửi yêu cầu hoàn tiền');
            setRefundForm((f) => ({ ...f, note: '' }));
        } catch (err) { toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu'); }
        finally { setSubmittingRefund(false); }
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
        } catch { toast.error('Tải ảnh đại diện thất bại'); }
        finally {
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
            toast.success('Cập nhật thông tin định danh thành công!');
            setIsEditModalOpen(false);
        } catch { toast.error('Cập nhật hồ sơ thất bại'); }
        finally { setIsSavingProfile(false); }
    };

    // --- HÀM LƯU CHỈ SỐ THỂ CHẤT & DINH DƯỠNG ---
    const handleSaveHealth = async () => {
        setIsSavingHealth(true);
        const macroFieldsChanged =
            editHealthForm.nutritionGoal !== healthData.nutritionGoal ||
            editHealthForm.activityLevel !== healthData.activityLevel ||
            (editHealthForm.nutritionGoal === 'PREGNANT' && editHealthForm.pregnancyTrimester !== healthData.pregnancyTrimester);

        try {
            await userService.updateProfile({
                heightCm: editHealthForm.heightCm ? Number(editHealthForm.heightCm) : null,
                dateOfBirth: editHealthForm.dateOfBirth || null,
                gender: editHealthForm.gender,
            });

            await userService.updatePreferences(hasActivePt
                ? { dietPreference: editHealthForm.dietPreference }
                : {
                    dietPreference: editHealthForm.dietPreference,
                    nutritionGoal: editHealthForm.nutritionGoal,
                    activityLevel: editHealthForm.activityLevel,
                    pregnancyTrimester: editHealthForm.nutritionGoal === 'PREGNANT' ? editHealthForm.pregnancyTrimester : null,
                });

            await userService.updateAllergies({ allergyNotes: editHealthForm.allergyNotes });

            if (!hasActivePt && editHealthForm.targetWeight) {
                await profileExtensionsService.saveGoals({
                    nutritionGoal: editHealthForm.nutritionGoal,
                    targetWeight: Number(editHealthForm.targetWeight),
                    trimester: editHealthForm.nutritionGoal === 'PREGNANT' ? editHealthForm.pregnancyTrimester : null,
                });
            }

            if (editHealthForm.weightKg && editHealthForm.weightKg !== healthData.weightKg) {
                await profileExtensionsService.recordBodyMetric({
                    recordDate: new Date().toISOString().slice(0, 10),
                    weight: Number(editHealthForm.weightKg),
                });
            }

            if (!hasActivePt && macroFieldsChanged) {
                try {
                    const res = await userService.recalculateMacros({
                        activityLevel: editHealthForm.activityLevel,
                        nutritionGoal: editHealthForm.nutritionGoal,
                        pregnancyTrimester: editHealthForm.nutritionGoal === 'PREGNANT' ? editHealthForm.pregnancyTrimester : null,
                    });
                    const kcal = res.data?.data?.macros?.dailyCalories;
                    window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
                    if (kcal != null) {
                        toast.success(`Đã cập nhật chỉ số — Mục tiêu calo mới: ${Math.round(Number(kcal))} kcal/ngày`);
                    }
                } catch {
                    toast.warning('Đã lưu chỉ số thể chất, vui lòng kiểm tra lại bảng Macro');
                }
            } else {
                toast.success('Cập nhật hồ sơ sức khỏe & dinh dưỡng thành công!');
            }

            setHealthData({ ...editHealthForm });
            setIsHealthModalOpen(false);
            fetchAll();
        } catch (err) {
            toast.error('Không thể lưu chỉ số sức khỏe, vui lòng kiểm tra lại');
        } finally {
            setIsSavingHealth(false);
        }
    };

    const openEditModal = () => {
        setEditForm({ fullName: profile.fullName, phoneNumber: profile.phoneNumber, address: profile.address });
        setIsEditModalOpen(true);
    };

    const openHealthModal = () => {
        setEditHealthForm({ ...healthData });
        setIsHealthModalOpen(true);
    };

    const getInitials = (name) => name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

    const groupedMealItems = mealPlanItems.reduce((acc, item) => {
        const key = item.planDate || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const mealPlanPrefWarnCodes = new Set((mealPlanPrefWarnings || []).map((w) => w.foodCode).filter(Boolean));

    if (isLoadingProfile) {
        return <div className="flex items-center justify-center min-h-[500px]"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 animate-fade-in space-y-8 min-w-0 overflow-x-hidden">

            {/* Header Full-Width */}
            <div className="border-b border-slate-200/80 pb-6">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-600 text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Personal Center
        </span>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Trang cá nhân</h1>
                <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Xem và quản lý toàn bộ thông tin định danh, chỉ số thể chất và lộ trình coaching của bạn.</p>
            </div>

            {/* LƯỚI BẤT ĐỐI XỨNG SANG TRỌNG (GRID 12 COLS: 4 TRÁI - 8 PHẢI) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* CỘT TRÁI (4 COLS): THÔNG TIN ĐỊNH DANH & COACHING HISTORY (STICKY SIDEBAR) */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">

                    {/* Card 1: Định danh cơ bản */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-[2rem] overflow-hidden">
                        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 relative">
                            <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <CardContent className="px-6 pb-6">
                            <div className="flex items-end justify-between -mt-14 mb-5">
                                <div className="relative group">
                                    <div className="w-28 h-28 rounded-3xl p-1.5 bg-white shadow-xl">
                                        {profile.avatarUrl ? (
                                            <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full rounded-2xl object-cover" />
                                        ) : (
                                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-black text-3xl">
                                                {getInitials(profile.fullName)}
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}
                                            className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-50">
                                        {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    </button>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </div>

                                <Button onClick={openEditModal} variant="outline" size="sm" className="rounded-xl border-slate-300 font-bold text-xs hover:bg-slate-50">
                                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Sửa
                                </Button>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-xl font-black text-slate-900">{profile.fullName || 'Thành viên Nutrican'}</h2>
                                <p className="text-slate-500 text-xs font-medium mt-0.5">{profile.email}</p>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                {[
                                    { icon: User, label: 'Họ và tên', value: profile.fullName || '—' },
                                    { icon: Mail, label: 'Email tài khoản', value: profile.email || '—' },
                                    { icon: Phone, label: 'Số điện thoại', value: profile.phoneNumber || 'Chưa thiết lập' },
                                    { icon: MapPin, label: 'Địa chỉ liên hệ', value: profile.address || 'Chưa thiết lập' },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                                            <Icon className="w-3.5 h-3.5 text-slate-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                                            <p className="text-slate-800 font-bold text-xs mt-0.5 truncate">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Trạng thái & Lịch sử Coaching */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-base font-extrabold text-slate-900">Huấn luyện viên đồng hành</h3>
                            </div>

                            <div className="space-y-3">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Trạng thái hợp đồng</span>
                                {ptThreads.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {mappingStatus === 'END_REQUESTED' ? (
                                            endRequestedBy === 'CUSTOMER' ? (
                                                <Button disabled className="w-full rounded-xl bg-slate-100 text-slate-400 font-bold text-xs py-5">Đang chờ PT xác nhận kết thúc</Button>
                                            ) : (
                                                <Button onClick={() => setEndCoachingModalOpen(true)} disabled={endCoachingLoading} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-5 shadow-md shadow-emerald-500/20">
                                                    Xác nhận kết thúc coaching
                                                </Button>
                                            )
                                        ) : (
                                            <Button variant="outline" onClick={() => setEndCoachingModalOpen(true)} disabled={endCoachingLoading} className="w-full rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50 font-bold text-xs py-5">
                                                Yêu cầu kết thúc coaching
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">Bạn hiện chưa có hợp đồng coaching active nào.</p>
                                )}
                            </div>

                            {coachingHistory.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Lịch sử coaching trước đây</span>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {coachingHistory.map((h) => (
                                            <div key={h.mappingId} className="text-xs font-semibold text-slate-700 border border-slate-100 bg-slate-50/60 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                                <span>HLV: <strong className="text-slate-900">{h.ptName}</strong></span>
                                                <span className="text-[10px] text-slate-400 font-bold">{h.completedAt ? new Date(h.completedAt).toLocaleDateString('vi-VN') : '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* CỘT PHẢI (8 COLS): THỂ CHẤT, THỰC ĐƠN, LỊCH HẸN & KHIẾU NẠI */}
                <div className="lg:col-span-8 space-y-6">

                    {/* CARD 3 (SaaS Pro Highlight): HỒ SƠ THỂ CHẤT & MỤC TIÊU DINH DƯỠNG */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow rounded-[2rem] overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 px-6 sm:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Hồ sơ Thể chất & Mục tiêu Dinh dưỡng</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Các thông số cốt lõi giúp AI và HLV cá nhân hóa thực đơn cho riêng bạn</p>
                                </div>
                            </div>
                            <Button onClick={openHealthModal} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-500/20 shrink-0 py-5 px-5">
                                <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Chỉnh sửa chỉ số & Mục tiêu
                            </Button>
                        </div>

                        <CardContent className="p-6 sm:p-8 space-y-6">
                            {/* 4 Cột chỉ số hình thể */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Chiều cao</span>
                                    <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{healthData.heightCm ? `${healthData.heightCm} cm` : '—'}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Cân nặng hiện tại</span>
                                    <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{healthData.weightKg ? `${healthData.weightKg} kg` : '—'}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Cân nặng mục tiêu</span>
                                    <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">{healthData.targetWeight ? `${healthData.targetWeight} kg` : '—'}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col justify-center">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Giới tính / Năm sinh</span>
                                    <p className="text-sm sm:text-base font-black text-slate-800 mt-1">
                                        {healthData.gender === 'male' ? 'Nam' : 'Nữ'} {healthData.dateOfBirth ? `(${healthData.dateOfBirth.slice(0, 4)})` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Hàng thông tin chi tiết về Mức vận động & Chế độ ăn */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-100/80 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-blue-600" /> Mức độ vận động (TDEE)
                    </span>
                                        <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase">Active Level</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-800 pt-0.5">
                                        {ACTIVITY_LEVEL_OPTIONS.find(o => o.value === healthData.activityLevel)?.label || 'Vận động vừa phải'}
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-100/80 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-amber-600" /> Mục tiêu & Chế độ ăn
                    </span>
                                        <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-md uppercase">Diet Plan</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-800 pt-0.5">
                                        {GOAL_OPTIONS.find(o => o.value === healthData.nutritionGoal)?.label || 'Duy trì'} · {' '}
                                        <span className="text-emerald-700">{DIET_OPTIONS.find(o => o.value === healthData.dietPreference)?.label || 'Ăn thường'}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Ghi chú dị ứng */}
                            {healthData.allergyNotes && (
                                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 flex items-start gap-3 shadow-2xs">
                                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-black text-red-900 uppercase tracking-wider block">Ghi chú dị ứng thực phẩm:</span>
                                        <p className="text-sm font-bold text-red-800 mt-0.5">{healthData.allergyNotes}</p>
                                    </div>
                                </div>
                            )}

                            {/* Link sang bảng biểu đồ Macro chuyên sâu */}
                            <div className="pt-2">
                                <Link
                                    to="/macro-targets"
                                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:scale-110 transition-transform">
                                            <Target className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">Xem chi tiết biểu đồ Macro & Phác đồ Calo chuyên sâu</p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">Theo dõi lịch sử cân nặng và phân bổ tỷ lệ Protein / Carb / Fat từng ngày</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CARD 4: THỰC ĐƠN TUẦN */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 sm:p-8 space-y-5">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80">
                                        <Utensils className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">Thực đơn tuần từ PT</h3>
                                        {newWeeklySummary && (
                                            <span className="text-[10px] font-extrabold text-white bg-violet-600 px-2.5 py-0.5 rounded-full animate-pulse inline-block mt-0.5">Tổng kết tuần mới</span>
                                        )}
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/coaching?tab=meal-plan')} className="rounded-xl text-xs font-bold border-slate-300">
                                    Quản lý thực đơn
                                </Button>
                            </div>

                            {weeklySummaries.length > 0 && (
                                <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100 space-y-2">
                                    <p className="text-xs font-black text-violet-800 uppercase tracking-widest">Tổng kết tuần gần nhất</p>
                                    {weeklySummaries.slice(0, 1).map((ws) => (
                                        <div key={ws.id} className="text-sm text-slate-700">
                                            <p className="font-extrabold text-slate-800">Tuần {ws.weekStartDate}
                                                {ws.adherenceRate != null && <span className="text-violet-600 font-bold ml-2">Tuân thủ: {ws.adherenceRate}%</span>}
                                            </p>
                                            <p className="text-slate-600 font-medium mt-1">{ws.summaryText}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {loadingMealPlan ? (
                                <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></div>
                            ) : ptThreads.length === 0 ? (
                                <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                                    <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
                                    <p className="text-sm text-slate-700 font-bold">Bạn chưa kết nối với Huấn luyện viên (PT).</p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">Thuê một PT trên chợ để nhận được thực đơn ăn uống chuẩn cá nhân hóa và hướng dẫn tập luyện mỗi ngày.</p>
                                    <Link to="/marketplace" className="inline-flex items-center text-xs font-extrabold text-blue-600 hover:underline pt-1">
                                        Khám phá Chợ PT ngay →
                                    </Link>
                                </div>
                            ) : !mealPlanItems.length ? (
                                <p className="text-sm text-slate-500 font-medium text-center py-6">PT chưa lên thực đơn cho tuần này.</p>
                            ) : (
                                <div className="space-y-4 pt-2">
                                    {Object.entries(groupedMealItems).sort().map(([date, items]) => (
                                        <div key={date} className="space-y-2">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{date}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {items.map((item) => (
                                                    <label key={item.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors">
                                                        <input type="checkbox" checked={!!item.eaten} onChange={(e) => handleMarkEaten(item.id, e.target.checked)}
                                                               className="rounded-lg border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-extrabold text-slate-800 truncate">
                                                                {item.freeText || item.foodCode || 'Món ăn'}
                                                                {item.foodCode && mealPlanPrefWarnCodes.has(item.foodCode) && (
                                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-1.5">!PREF</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                                {MEAL_TYPE_LABEL[item.mealType] || item.mealType} {item.portionGrams ? `· ${item.portionGrams}g` : ''}
                                                            </p>
                                                        </div>
                                                        {item.eaten && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CARD 5: LỊCH HẸN PT */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">Lịch hẹn tư vấn & Tập luyện</h3>
                            </div>

                            {loadingAppts ? (
                                <div className="py-6 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></div>
                            ) : ptThreads.length === 0 && appointments.length === 0 ? (
                                <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <p className="text-sm text-slate-500 font-medium">Vui lòng kết nối với PT để đặt lịch tư vấn trực tiếp.</p>
                                </div>
                            ) : appointments.length === 0 ? (
                                <p className="text-sm text-slate-500 font-medium">Chưa có lịch hẹn sắp tới nào.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                    {appointments.map((a) => {
                                        const badge = APPT_STATUS_LABEL[a.status] || { text: a.status, cls: 'bg-slate-100 text-slate-600' };
                                        return (
                                            <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-extrabold text-slate-800">
                                                        {new Date(a.startTime).toLocaleString('vi-VN')}
                                                    </p>
                                                    {a.note && <p className="text-xs text-slate-500 font-medium mt-0.5">{a.note}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>
                                                    {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                                                        <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl" onClick={() => handleCancelAppointment(a.id)}>
                                                            Hủy lịch
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CARD 6: KHIẾU NẠI & HOÀN TIỀN */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 sm:p-8 space-y-5">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100/80">
                                    <RefreshCw className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Gửi yêu cầu khiếu nại / Hoàn tiền</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Bảo vệ quyền lợi học phí ký quỹ Escrow của bạn</p>
                                </div>
                            </div>

                            {ptThreads.length === 0 ? (
                                <p className="text-sm text-slate-500 font-medium">Bạn cần có PT đang hoạt động để gửi khiếu nại hoàn tiền.</p>
                            ) : (
                                <div className="space-y-3 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <select value={refundForm.mappingId} onChange={(e) => setRefundForm((f) => ({ ...f, mappingId: e.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold bg-slate-50 cursor-pointer">
                                            {ptThreads.map((t) => <option key={t.mappingId} value={t.mappingId}>HLV: {t.participantName}</option>)}
                                        </select>
                                        <select value={refundForm.reason} onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold bg-slate-50 cursor-pointer">
                                            {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    <textarea value={refundForm.note} onChange={(e) => setRefundForm((f) => ({ ...f, note: e.target.value }))}
                                              placeholder="Mô tả chi tiết lý do khiếu nại của bạn..." rows={2}
                                              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm font-medium resize-none bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" />
                                    <Button onClick={handleRefund} disabled={submittingRefund} variant="outline"
                                            className="w-full rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 font-extrabold py-5">
                                        {submittingRefund ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Gửi yêu cầu hoàn tiền cho Admin
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>

            </div>

            {/* --- MODAL 1: CHỈNH SỬA ĐỊNH DANH CƠ BẢN --- */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa định danh">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700 uppercase">Họ và tên</label>
                        <Input type="text" value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} className="rounded-xl py-5 bg-slate-50 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700 uppercase">Số điện thoại</label>
                        <Input type="text" value={editForm.phoneNumber} onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))} className="rounded-xl py-5 bg-slate-50 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700 uppercase">Địa chỉ</label>
                        <textarea value={editForm.address} rows={3} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-medium text-sm outline-none resize-none focus:bg-white" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="flex-1 rounded-xl py-5 font-bold">Hủy</Button>
                        <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-5 font-bold">
                            {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* --- MODAL 2 (SaaS Pro Expanded): CHỈNH SỬA THỂ CHẤT & MỤC TIÊU --- */}
            <Modal
                isOpen={isHealthModalOpen}
                onClose={() => setIsHealthModalOpen(false)}
                title="Chỉnh sửa Thể chất & Mục tiêu Dinh dưỡng"
                className="sm:max-w-2xl md:max-w-3xl"
                size="lg"
            >
                <div className="space-y-5 max-h-[75vh] overflow-y-auto overflow-x-hidden px-1 py-1">
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-emerald-950 text-xs font-semibold leading-relaxed flex items-start gap-3 shadow-2xs">
                        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-extrabold block text-emerald-900 mb-0.5">Tối ưu hóa chỉ số AI:</span>
                            Cập nhật chính xác chiều cao, cân nặng và mức vận động giúp AI tự động tính toán lại TDEE và chỉ số Calo/Macro mục tiêu chuẩn nhất cho bạn.
                        </div>
                    </div>

                    {/* Grid 1: Chiều cao & Cân nặng */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 min-w-0">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Chiều cao (cm)</label>
                            <Input type="number" placeholder="170" value={editHealthForm.heightCm} onChange={(e) => setEditHealthForm((f) => ({ ...f, heightCm: e.target.value }))} className="rounded-xl py-5 bg-slate-50 font-extrabold text-slate-900 w-full min-w-0 focus:bg-white" />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Cân nặng hiện tại (kg)</label>
                            <Input type="number" step="0.1" placeholder="65.5" value={editHealthForm.weightKg} onChange={(e) => setEditHealthForm((f) => ({ ...f, weightKg: e.target.value }))} className="rounded-xl py-5 bg-slate-50 font-extrabold text-emerald-600 w-full min-w-0 focus:bg-white" />
                        </div>
                    </div>

                    {/* Grid 2: Cân nặng mục tiêu & Giới tính */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 min-w-0">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Cân nặng mục tiêu (kg)</label>
                            <Input type="number" step="0.1" placeholder="60.0" value={editHealthForm.targetWeight} onChange={(e) => setEditHealthForm((f) => ({ ...f, targetWeight: e.target.value }))} disabled={hasActivePt} className={`rounded-xl py-5 bg-slate-50 font-extrabold text-blue-600 w-full min-w-0 focus:bg-white ${hasActivePt ? 'opacity-60 cursor-not-allowed' : ''}`} />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Giới tính sinh học</label>
                            <select value={editHealthForm.gender} onChange={(e) => setEditHealthForm((f) => ({ ...f, gender: e.target.value }))} className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 min-w-0 cursor-pointer">
                                <option value="male">Nam giới (Male)</option>
                                <option value="female">Nữ giới (Female)</option>
                            </select>
                        </div>
                    </div>

                    {/* Ngày sinh */}
                    <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Ngày sinh (YYYY-MM-DD)</label>
                        <Input type="date" value={editHealthForm.dateOfBirth} onChange={(e) => setEditHealthForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="rounded-xl py-5 bg-slate-50 font-extrabold text-slate-900 w-full min-w-0 focus:bg-white cursor-pointer" />
                    </div>

                    {/* Mức độ vận động */}
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Mức độ vận động (TDEE)</label>
                            <ActivityLevelInfoTooltip />
                        </div>
                        <select value={editHealthForm.activityLevel} onChange={(e) => setEditHealthForm((f) => ({ ...f, activityLevel: e.target.value }))} disabled={hasActivePt} className={`w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 min-w-0 truncate ${hasActivePt ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                            {ACTIVITY_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Mục tiêu */}
                    <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Mục tiêu cân nặng / sức khỏe</label>
                        {hasActivePt && <p className="text-xs text-amber-700 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200">Mục tiêu và mức vận động đang do PT quản lý — bạn vẫn có thể ghi cân nặng.</p>}
                        <select value={editHealthForm.nutritionGoal} onChange={(e) => setEditHealthForm((f) => ({ ...f, nutritionGoal: e.target.value }))} disabled={hasActivePt} className={`w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 min-w-0 truncate ${hasActivePt ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                            {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Thai kỳ */}
                    {editHealthForm.nutritionGoal === 'PREGNANT' && (
                        <div className="space-y-1.5 p-4 bg-purple-50/80 rounded-2xl border border-purple-200 min-w-0 animate-fade-in">
                            <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider block">Giai đoạn thai kỳ (Tam cá nguyệt)</label>
                            <select value={editHealthForm.pregnancyTrimester} onChange={(e) => setEditHealthForm((f) => ({ ...f, pregnancyTrimester: Number(e.target.value) }))} disabled={hasActivePt} className={`w-full px-3.5 py-3 rounded-xl bg-white border border-purple-200 font-extrabold text-sm text-purple-950 outline-none focus:ring-2 focus:ring-purple-500 min-w-0 ${hasActivePt ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                {[1, 2, 3].map((t) => <option key={t} value={t}>Tam cá nguyệt thứ {t} (3 tháng {t === 1 ? 'đầu' : t === 2 ? 'giữa' : 'cuối'})</option>)}
                            </select>
                        </div>
                    )}

                    {/* Chế độ ăn */}
                    <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Chế độ ăn uống ưa thích</label>
                        <select value={editHealthForm.dietPreference} onChange={(e) => setEditHealthForm((f) => ({ ...f, dietPreference: e.target.value }))} className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 min-w-0 cursor-pointer truncate">
                            {DIET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    <AllergySelector
                        value={editHealthForm.allergyNotes}
                        onChange={(val) => setEditHealthForm((f) => ({ ...f, allergyNotes: val }))}
                    />

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => setIsHealthModalOpen(false)} className="flex-1 rounded-xl py-6 font-bold border-slate-300 hover:bg-slate-50">Hủy bỏ</Button>
                        <Button type="button" onClick={handleSaveHealth} disabled={isSavingHealth} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 font-extrabold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all hover:scale-[1.01]">
                            {isSavingHealth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (hasActivePt ? 'Lưu chỉ số sức khỏe' : 'Lưu chỉ số & Tính lại Macro')}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={endCoachingModalOpen} onClose={() => setEndCoachingModalOpen(false)}
                   title={mappingStatus === 'END_REQUESTED' ? 'Xác nhận kết thúc coaching?' : 'Yêu cầu kết thúc coaching?'}>
                <p className="text-sm text-slate-600 mb-4 font-medium">
                    {mappingStatus === 'END_REQUESTED'
                        ? 'Bạn xác nhận kết thúc quan hệ coaching với PT hiện tại?'
                        : 'Bạn sẽ gửi yêu cầu kết thúc coaching. PT cần xác nhận trước khi hoàn tất.'}
                </p>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEndCoachingModalOpen(false)} className="rounded-xl font-bold">Hủy</Button>
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
                    }} disabled={endCoachingLoading} className="rounded-xl bg-emerald-600 text-white font-bold">
                        {endCoachingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận'}
                    </Button>
                </div>
            </Modal>

            <ConfirmModal
                open={!!cancelApptId}
                title="Hủy lịch hẹn?"
                description="Hủy trước 48h không phí; dưới 48h sẽ ghi nhận hủy muộn."
                confirmLabel="Hủy lịch"
                cancelLabel="Giữ lịch"
                danger
                loading={cancellingAppt}
                onClose={() => !cancellingAppt && setCancelApptId(null)}
                onConfirm={confirmCancelAppointment}
            />

        </div>
    );
}
