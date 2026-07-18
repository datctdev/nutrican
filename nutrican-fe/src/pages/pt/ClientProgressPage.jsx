import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { workspaceService } from '../../services/workspaceService';
import { dietService } from '../../services/dietService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import FoodAllergySelector from '../../components/common/FoodAllergySelector';
import ProgressTimelineCard from '../customer/components/ProgressTimelineCard';
import MealPlanSuggestionReviewList from '../../components/pt/meal-plan/MealPlanSuggestionReviewList';
import MealPlanWeekPicker from '../customer/components/MealPlanWeekPicker';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, Utensils, Camera, Loader2 } from 'lucide-react';

function AdherenceDonut({ percent }) {
  const hasValue = percent !== null && percent !== undefined && Number.isFinite(Number(percent));
  const p = hasValue ? Math.min(100, Math.max(0, Number(percent))) : 0;
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#10b981" strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <p className="text-2xl font-bold text-emerald-600 -mt-14 rotate-0">
        {hasValue ? `${p}%` : '—'}
      </p>
      <p className="text-xs text-slate-500 mt-8">Tuân thủ thực đơn</p>
    </div>
  );
}

function CalorieLineChart({ history }) {
  const points = history.slice(-7);
  if (points.length === 0) return null;
  const maxVal = Math.max(...points.map((d) => Math.max(Number(d.calories) || 0, Number(d.target) || 2000)), 1);
  const w = 320;
  const h = 120;
  const pad = 8;
  const toX = (i) => pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const toY = (v) => h - pad - (v / maxVal) * (h - pad * 2);
  const actualPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.calories) || 0)}`).join(' ');
  const targetPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.target) || 2000)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md h-32">
      <path d={targetPath} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
      <path d={actualPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
      {points.map((d, i) => (
        <circle key={d.date} cx={toX(i)} cy={toY(Number(d.calories) || 0)} r="3" fill="#8b5cf6" />
      ))}
    </svg>
  );
}

function PostMealLineChart({ aggregate }) {
  const points = aggregate.slice(-8);
  if (points.length === 0) return null;
  const maxVal = Math.max(...points.flatMap((d) => [Number(d.avgEnergy) || 0, Number(d.avgHunger) || 0]), 5);
  const w = 320;
  const h = 120;
  const pad = 8;
  const toX = (i) => pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const toY = (v) => h - pad - (v / maxVal) * (h - pad * 2);
  const energyPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.avgEnergy) || 0)}`).join(' ');
  const hungerPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.avgHunger) || 0)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md h-32">
      <path d={hungerPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
      <path d={energyPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
      {points.map((d, i) => (
        <circle key={d.weekStart} cx={toX(i)} cy={toY(Number(d.avgEnergy) || 0)} r="3" fill="#10b981" />
      ))}
    </svg>
  );
}

function WeeklySummaryForm({ clientId, adherence }) {
  const [text, setText] = useState('');
  const [nextNote, setNextNote] = useState('');
  const [saving, setSaving] = useState(false);
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const submit = async () => {
    setSaving(true);
    try {
      await workspaceService.createWeeklySummary({
        clientId,
        weekStartDate: weekStartStr,
        summaryText: text,
        adherenceRate: adherence != null ? Number(adherence) : undefined,
        nextPlanNote: nextNote,
      });
      toast.success('Đã gửi tổng kết tuần');
      setText('');
      setNextNote('');
    } catch {
      toast.error('Không gửi được tổng kết');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <p className="text-sm font-bold text-slate-600">Tổng kết tuần cho học viên</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Nhận xét tuần này..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <textarea value={nextNote} onChange={(e) => setNextNote(e.target.value)} rows={2} placeholder="Ghi chú thực đơn tuần tới..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <Button onClick={submit} disabled={saving || !text.trim()}>Gửi tổng kết</Button>
      </CardContent>
    </Card>
  );
}

export default function ClientProgressPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [allergicFoods, setAllergicFoods] = useState([]);
  const [analyzingInbody, setAnalyzingInbody] = useState(false);

  const [isEditingMacros, setIsEditingMacros] = useState(false);
  const [savingMacros, setSavingMacros] = useState(false);
  const [selectedMealPlanWeek, setSelectedMealPlanWeek] = useState('');
  const [loadingMealPlanWeek, setLoadingMealPlanWeek] = useState(false);
  const [macroForm, setMacroForm] = useState({
    nutritionGoal: 'MAINTAIN',
    dailyCalories: '',
    protein: '',
    carb: '',
    fat: '',
  });

  const loadProgress = useCallback(async (weekStart) => {
    const params = weekStart ? { mealPlanWeekStart: weekStart } : undefined;
    const response = await workspaceService.getClientProgress(clientId, params);
    const progressData = response.data.data;
    setData(progressData);
    if (progressData?.mealPlanAdherence?.weekStart) {
      setSelectedMealPlanWeek(progressData.mealPlanAdherence.weekStart);
    }
    return progressData;
  }, [clientId]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await workspaceService.getClientProfile(clientId);
      const profileData = res.data.data;
      setProfile(profileData);
      setEditForm(profileData);
      setMacroForm({
        nutritionGoal: profileData.nutritionGoal || 'MAINTAIN',
        dailyCalories: profileData.tdee || '',
        protein: profileData.protein || '',
        carb: profileData.carb || '',
        fat: profileData.fat || '',
      });
      if (profileData.allergicFoodCodes && profileData.allergicFoodCodes.length > 0) {
        dietService.getFoodsByCodes(profileData.allergicFoodCodes)
          .then(resFoods => setAllergicFoods(resFoods.data?.data || []))
          .catch(() => setAllergicFoods([]));
      } else {
        setAllergicFoods([]);
      }
    } catch (e) {
      console.error('Failed to load client profile', e);
    }
  }, [clientId]);

  useEffect(() => {
    const load = async () => {
      try {
        await loadProgress();
      } catch {
        toast.error('Không tải được tiến độ học viên');
      } finally {
        setLoading(false);
      }
    };
    if (clientId) {
      setTimeout(() => {
        load();
        loadProfile();
      }, 0);
    }
  }, [clientId, loadProfile, loadProgress]);

  useEffect(() => {
    const handleMealPlanProgressUpdated = (event) => {
      const update = event.detail;
      if (update?.clientId !== clientId) return;
      if (selectedMealPlanWeek && update?.weekStart !== selectedMealPlanWeek) return;
      loadProgress(selectedMealPlanWeek || update?.weekStart).catch(() => undefined);
    };
    window.addEventListener('meal_plan_progress_updated', handleMealPlanProgressUpdated);
    return () => {
      window.removeEventListener('meal_plan_progress_updated', handleMealPlanProgressUpdated);
    };
  }, [clientId, loadProgress, selectedMealPlanWeek]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        ...editForm,
        heightCm: editForm.heightCm ? Number(editForm.heightCm) : null,
        weight: editForm.weight ? Number(editForm.weight) : null,
        bodyFatPercent: editForm.bodyFatPercent ? Number(editForm.bodyFatPercent) : null,
        tdee: editForm.tdee ? Number(editForm.tdee) : null,
        dateOfBirth: editForm.dateOfBirth || null,
      };
      const res = await workspaceService.updateClientProfile(clientId, payload);
      const updatedData = res.data.data;
      setProfile(updatedData);
      setEditForm(updatedData);
      setIsEditing(false);
      toast.success('Cập nhật hồ sơ sức khỏe thành công!');
      await loadProgress(selectedMealPlanWeek || undefined);
      if (updatedData.allergicFoodCodes && updatedData.allergicFoodCodes.length > 0) {
        dietService.getFoodsByCodes(updatedData.allergicFoodCodes)
          .then(resFoods => setAllergicFoods(resFoods.data?.data || []))
          .catch(() => setAllergicFoods([]));
      } else {
        setAllergicFoods([]);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInbodyUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingInbody(true);
    try {
      const res = await profileExtensionsService.analyzeInbody(file);
      const inbodyData = res.data?.data;
      if (inbodyData) {
        setEditForm((prev) => ({
          ...prev,
          weight: inbodyData.weight || prev.weight,
          bodyFatPercent: inbodyData.body_fat_percent || prev.bodyFatPercent,
          heightCm: inbodyData.height || prev.heightCm,
          gender: inbodyData.gender || prev.gender,
        }));
        toast.success('Phân tích ảnh InBody thành công! Các số đo đã tự động điền.');
      } else {
        toast.error('AI không nhận diện được chỉ số từ ảnh này.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể phân tích ảnh InBody.');
    } finally {
      setAnalyzingInbody(false);
    }
  };

  const handleSuggestMacros = () => {
    const calories = Number(macroForm.dailyCalories);
    if (!calories || isNaN(calories) || calories <= 0) {
      toast.error('Vui lòng nhập tổng Calo tiêu thụ trước để gợi ý phân bổ');
      return;
    }
    let pPct = 0.30;
    let cPct = 0.40;
    let fPct = 0.30;

    if (macroForm.nutritionGoal === 'WEIGHT_LOSS') {
      pPct = 0.40;
      cPct = 0.30;
      fPct = 0.30;
    } else if (macroForm.nutritionGoal === 'WEIGHT_GAIN') {
      pPct = 0.30;
      cPct = 0.50;
      fPct = 0.20;
    }

    const pGrams = Math.round((calories * pPct) / 4);
    const cGrams = Math.round((calories * cPct) / 4);
    const fGrams = Math.round((calories * fPct) / 9);

    setMacroForm({
      ...macroForm,
      protein: pGrams,
      carb: cGrams,
      fat: fGrams
    });
    toast.success(`Đã gợi ý tỷ lệ dựa trên mục tiêu (${Math.round(pPct*100)}% P / ${Math.round(cPct*100)}% C / ${Math.round(fPct*100)}% F)`);
  };

  const handleUpdateMacros = async (e) => {
    e.preventDefault();
    setSavingMacros(true);
    try {
      const payload = {
        dailyCalories: Number(macroForm.dailyCalories),
        protein: Number(macroForm.protein),
        carb: Number(macroForm.carb),
        fat: Number(macroForm.fat),
        nutritionGoal: macroForm.nutritionGoal
      };
      await workspaceService.setClientMacroTarget(clientId, payload);
      toast.success('Thiết lập mục tiêu dinh dưỡng và Macro thành công!');
      setIsEditingMacros(false);
      await loadProfile();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể thiết lập mục tiêu.');
    } finally {
      setSavingMacros(false);
    }
  };

  const summary = data?.macroSummary;
  const weights = data?.bodyMetrics || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/pt/clients')} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          {data?.clientName || 'Tiến độ học viên'}
        </h1>
        {data?.mealPlanWeeks?.length > 0 && (
          <MealPlanWeekPicker
            weeks={data.mealPlanWeeks}
            value={selectedMealPlanWeek}
            loading={loadingMealPlanWeek}
            onChange={async (weekStart) => {
              setSelectedMealPlanWeek(weekStart);
              setLoadingMealPlanWeek(true);
              try {
                await loadProgress(weekStart);
              } catch {
                toast.error('Không tải được tiến độ tuần đã chọn');
              } finally {
                setLoadingMealPlanWeek(false);
              }
            }}
          />
        )}
      </div>
      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-sm text-slate-500">Calories TB/ngày trong tuần</p>
              <p className="text-2xl font-bold">{summary?.avgCalories ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">Tổng các bữa theo ngày rồi lấy trung bình</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-sm text-slate-500">Protein TB/ngày trong tuần</p>
              <p className="text-2xl font-bold">
                {summary?.avgProtein != null ? `${summary.avgProtein}g` : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Chỉ lấy nhật ký đã ghi nhận</p>
            </CardContent></Card>
            <Card><CardContent className="flex flex-col items-center p-5">
              <AdherenceDonut percent={data?.mealPlanAdherence?.adherenceRate} />
              <p className="mt-2 text-center text-xs text-slate-500">
                <strong className="text-emerald-700">{data?.mealPlanAdherence?.eatenItems ?? 0}</strong>
                {' / '}{data?.mealPlanAdherence?.dueItems ?? 0} món đã đến hạn
              </p>
              {(data?.mealPlanAdherence?.skippedItems ?? 0) > 0 && (
                <p className="mt-1 text-[11px] font-semibold text-amber-600">
                  {data.mealPlanAdherence.skippedItems} món không ăn
                </p>
              )}
              {(data?.mealPlanAdherence?.pendingItems ?? 0) > 0 && (
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  {data.mealPlanAdherence.pendingItems} món chưa xác nhận
                </p>
              )}
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <Utensils className="w-3.5 h-3.5" /> Độ phủ nhật ký
              </p>
              <p className="text-2xl font-bold">
                {data?.mealPlanAdherence?.logCoverageRate != null
                  ? `${data.mealPlanAdherence.logCoverageRate}%`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {data?.mealPlanAdherence?.loggedMealSlots ?? 0}
                {' / '}{data?.mealPlanAdherence?.expectedMealSlots ?? 0} bữa đã đến hạn có nhật ký
              </p>
            </CardContent></Card>
          </div>

          {data?.mealPlanAdherence?.daily?.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {data.mealPlanAdherence.daily.map((day) => (
                    <div
                      key={day.date}
                      className={`rounded-xl border px-3 py-2 ${day.future
                        ? 'border-slate-100 bg-slate-50 text-slate-400'
                        : Number(day.adherenceRate) === 100
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700'}`}
                    >
                      <p className="text-[10px] font-bold uppercase">
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short' })}
                      </p>
                      <p className="text-sm font-extrabold">
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold">
                        {day.future ? 'Chưa đến' : `${day.eatenItems}/${day.dueItems} món`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hồ sơ sức khỏe & Mục tiêu */}
          {profile && (
            <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-slate-800">Hồ sơ sức khỏe & Mục tiêu</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Thông tin nhân trắc học và các lưu ý ăn uống của học viên.</p>
                </div>
                {!isEditing && (
                  <Button size="sm" onClick={() => setIsEditing(true)} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">
                    Chỉnh sửa hồ sơ
                  </Button>
                )}
              </div>
              <CardContent className="p-6">
                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên</label>
                        <input
                          type="text"
                          required
                          value={editForm.fullName || ''}
                          onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                        <input
                          type="text"
                          value={editForm.phoneNumber || ''}
                          onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày sinh</label>
                        <input
                          type="date"
                          value={editForm.dateOfBirth || ''}
                          onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giới tính</label>
                        <select
                          value={editForm.gender || 'male'}
                          onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Số đo & Phân tích</span>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/10">
                        {analyzingInbody ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Đang phân tích...
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            Quét ảnh InBody bằng AI
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleInbodyUpload}
                          className="hidden"
                          disabled={analyzingInbody}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chiều cao (cm)</label>
                        <input
                          type="number"
                          value={editForm.heightCm || ''}
                          onChange={(e) => setEditForm({...editForm, heightCm: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cân nặng (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.weight || ''}
                          onChange={(e) => setEditForm({...editForm, weight: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tỷ lệ mỡ (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.bodyFatPercent || ''}
                          onChange={(e) => setEditForm({...editForm, bodyFatPercent: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mục tiêu Calo / TDEE</label>
                        <input
                          type="number"
                          value={editForm.tdee || ''}
                          onChange={(e) => setEditForm({...editForm, tdee: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chế độ ăn</label>
                        <select
                          value={editForm.dietPreference || 'NORMAL'}
                          onChange={(e) => setEditForm({...editForm, dietPreference: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                          <option value="NORMAL">Bình thường</option>
                          <option value="VEGETARIAN">Ăn chay</option>
                          <option value="VEGAN">Thuần chay</option>
                          <option value="KETO">Chế độ Keto</option>
                          <option value="EAT_CLEAN">Ăn Eat Clean</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thành phần dị ứng</label>
                        <FoodAllergySelector
                          selectedFoodCodes={editForm.allergicFoodCodes || []}
                          onChange={(codes) => setEditForm({ ...editForm, allergicFoodCodes: codes })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lưu ý đặc biệt (v.d. không ăn cay, dị ứng khác)</label>
                        <input
                          type="text"
                          value={editForm.specialNotes || ''}
                          placeholder="v.d. Không ăn cay, dị ứng hải sản nhẹ"
                          onChange={(e) => setEditForm({...editForm, specialNotes: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                      <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setEditForm(profile); }}>Hủy</Button>
                      <Button type="submit" disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5">
                        {savingProfile ? 'Đang lưu...' : 'Lưu lại'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Thông tin cá nhân</h4>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700">
                          <div><span className="text-slate-450 font-normal">Họ tên:</span> {profile.fullName}</div>
                          <div><span className="text-slate-450 font-normal">Giới tính:</span> {profile.gender === 'male' ? 'Nam' : 'Nữ'}</div>
                          <div><span className="text-slate-450 font-normal">Chiều cao:</span> {profile.heightCm ? `${profile.heightCm} cm` : '—'}</div>
                          <div><span className="text-slate-450 font-normal">Cân nặng:</span> {profile.weight ? `${profile.weight} kg` : '—'}</div>
                          <div><span className="text-slate-450 font-normal">Tỷ lệ mỡ:</span> {profile.bodyFatPercent ? `${profile.bodyFatPercent}%` : '—'}</div>
                          <div><span className="text-slate-450 font-normal">Ngày sinh:</span> {profile.dateOfBirth || '—'}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Liên hệ</h4>
                        <div className="mt-2 text-sm font-semibold text-slate-700 space-y-1">
                          <div><span className="text-slate-450 font-normal">Email:</span> {profile.email}</div>
                          <div><span className="text-slate-450 font-normal">Điện thoại:</span> {profile.phoneNumber || '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mục tiêu & Chế độ ăn</h4>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700">
                          <div><span className="text-slate-450 font-normal">TDEE / Calo:</span> {profile.tdee ? `${profile.tdee} kcal` : '—'}</div>
                          <div><span className="text-slate-450 font-normal">Chế độ ăn:</span> {profile.dietPreference === 'NORMAL' ? 'Bình thường' : profile.dietPreference || '—'}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Lưu ý đặc biệt & Dị ứng</h4>
                        <div className="mt-2 text-sm font-semibold space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-slate-450 font-normal mr-1">Dị ứng:</span>
                            {allergicFoods && allergicFoods.length > 0 ? (
                              allergicFoods.map((food, idx) => (
                                <span key={food.foodCode || idx} className="bg-red-50 text-red-700 border border-red-100 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                  {food.nameVi}
                                </span>
                              ))
                            ) : (
                              <span className="text-emerald-650 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px]">Không có dị ứng</span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-450 font-normal">Lưu ý:</span>{' '}
                            {profile.specialNotes ? (
                              <span className="text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg text-xs font-bold inline-block mt-1">
                                {profile.specialNotes}
                              </span>
                            ) : (
                              <span className="text-slate-450 italic">Không có lưu ý đặc biệt</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Thiết Lập Mục Tiêu Dinh Dưỡng & Macro */}
          {profile && (
            <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden mt-6">
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-slate-800">Thiết lập Mục tiêu Dinh dưỡng & Macro</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Xác định giai đoạn tập luyện và phân bổ năng lượng hàng ngày.</p>
                </div>
                {!isEditingMacros && (
                  <Button size="sm" onClick={() => setIsEditingMacros(true)} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                    Cấu hình Mục tiêu & Macro
                  </Button>
                )}
              </div>
              <CardContent className="p-6">
                {isEditingMacros ? (
                  <form onSubmit={handleUpdateMacros} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mục tiêu giai đoạn</label>
                        <select
                          value={macroForm.nutritionGoal}
                          onChange={(e) => setMacroForm({...macroForm, nutritionGoal: e.target.value})}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-semibold"
                        >
                          <option value="WEIGHT_LOSS">Giảm mỡ (Lose Fat / Weight Loss)</option>
                          <option value="WEIGHT_GAIN">Tăng cơ (Gain Muscle / Weight Gain)</option>
                          <option value="MAINTAIN">Giữ cân (Maintain Weight)</option>
                          <option value="PREGNANT">Thai kỳ (Pregnancy)</option>
                          <option value="RECOVERY">Phục hồi (Recovery)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mục tiêu Calo / TDEE (kcal/ngày)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            required
                            value={macroForm.dailyCalories}
                            onChange={(e) => setMacroForm({...macroForm, dailyCalories: e.target.value})}
                            placeholder="v.d. 2000"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-semibold"
                          />
                          <Button
                            type="button"
                            onClick={handleSuggestMacros}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl px-4 text-xs font-bold border border-emerald-200"
                          >
                            Tự động chia Macro
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Protein (g)</label>
                        <input
                          type="number"
                          required
                          value={macroForm.protein}
                          onChange={(e) => setMacroForm({...macroForm, protein: e.target.value})}
                          placeholder="g"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                          = {Number(macroForm.protein || 0) * 4} kcal
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Carb (g)</label>
                        <input
                          type="number"
                          required
                          value={macroForm.carb}
                          onChange={(e) => setMacroForm({...macroForm, carb: e.target.value})}
                          placeholder="g"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                          = {Number(macroForm.carb || 0) * 4} kcal
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fat (g)</label>
                        <input
                          type="number"
                          required
                          value={macroForm.fat}
                          onChange={(e) => setMacroForm({...macroForm, fat: e.target.value})}
                          placeholder="g"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                          = {Number(macroForm.fat || 0) * 9} kcal
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Tổng Calo quy đổi từ Macro:</span>
                      <span className={`text-sm ${
                        Math.abs((Number(macroForm.protein || 0) * 4 + Number(macroForm.carb || 0) * 4 + Number(macroForm.fat || 0) * 9) - Number(macroForm.dailyCalories || 0)) > 20
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        {Number(macroForm.protein || 0) * 4 + Number(macroForm.carb || 0) * 4 + Number(macroForm.fat || 0) * 9} kcal / {macroForm.dailyCalories || 0} kcal
                      </span>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                      <Button type="button" variant="outline" onClick={() => { setIsEditingMacros(false); setMacroForm({
                        nutritionGoal: profile.nutritionGoal || 'MAINTAIN',
                        dailyCalories: profile.tdee || '',
                        protein: profile.protein || '',
                        carb: profile.carb || '',
                        fat: profile.fat || '',
                      }); }}>Hủy</Button>
                      <Button type="submit" disabled={savingMacros} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5">
                        {savingMacros ? 'Đang lưu...' : 'Lưu chốt mục tiêu'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Giai đoạn hiện tại</h4>
                        <div className="mt-2.5">
                          {profile.nutritionGoal === 'WEIGHT_LOSS' && (
                            <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                              Giảm mỡ (Lose Fat)
                            </span>
                          )}
                          {profile.nutritionGoal === 'WEIGHT_GAIN' && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                              Tăng cơ (Gain Muscle)
                            </span>
                          )}
                          {profile.nutritionGoal === 'MAINTAIN' && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                              Giữ cân (Maintain Weight)
                            </span>
                          )}
                          {profile.nutritionGoal === 'PREGNANT' && (
                            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                              Thai kỳ (Pregnancy)
                            </span>
                          )}
                          {profile.nutritionGoal === 'RECOVERY' && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                              Phục hồi (Recovery)
                            </span>
                          )}
                          {!profile.nutritionGoal && (
                            <span className="text-slate-500 italic text-sm">Chưa thiết lập mục tiêu</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">
                          {profile.nutritionGoal === 'WEIGHT_LOSS' && 'PT khuyến nghị thâm hụt năng lượng lành mạnh kết hợp protein cao để bảo vệ khối cơ.'}
                          {profile.nutritionGoal === 'WEIGHT_GAIN' && 'PT khuyến nghị thặng dư năng lượng nhẹ kèm lượng tinh bột cao để tối ưu hóa năng lượng buổi tập.'}
                          {profile.nutritionGoal === 'MAINTAIN' && 'PT khuyến nghị giữ mức Calo thăng bằng theo TDEE gợi ý để duy trì vóc dáng lý tưởng.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Phân bổ Macro hàng ngày</h4>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100 text-center">
                            <p className="text-[10px] font-bold text-blue-600 uppercase">Protein</p>
                            <p className="text-xl font-extrabold text-blue-900 mt-1">{profile.protein || '—'}g</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{profile.protein ? `${profile.protein * 4} kcal` : ''}</p>
                          </div>
                          <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 text-center">
                            <p className="text-[10px] font-bold text-amber-600 uppercase">Carb</p>
                            <p className="text-xl font-extrabold text-amber-900 mt-1">{profile.carb || '—'}g</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{profile.carb ? `${profile.carb * 4} kcal` : ''}</p>
                          </div>
                          <div className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100 text-center">
                            <p className="text-[10px] font-bold text-rose-600 uppercase">Fat</p>
                            <p className="text-xl font-extrabold text-rose-900 mt-1">{profile.fat || '—'}g</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{profile.fat ? `${profile.fat * 9} kcal` : ''}</p>
                          </div>
                        </div>
                        <div className="mt-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Tổng Năng Lượng / Ngày:</span>
                          <span className="text-sm font-black text-slate-900">{profile.tdee || '—'} kcal</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <ProgressTimelineCard
            goals={data?.goals}
            milestones={data?.milestones}
            regressionAlert={data?.regressionAlert}
            projectedCompletion={data?.projectedCompletion}
            bodyMetrics={weights}
          />

          {data?.calorieHistory?.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-bold text-slate-600 mb-3">Calories vs target (7 ngày)</p>
                <CalorieLineChart history={data.calorieHistory} />
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-500" /> Thực tế</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300 border-dashed" /> Mục tiêu</span>
                </div>
              </CardContent>
            </Card>
          )}

          {data?.postMealAggregate?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-bold text-slate-600">Phản hồi sau bữa ăn (TB/tuần)</p>
                <PostMealLineChart aggregate={data.postMealAggregate} />
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500" /> Năng lượng</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 border-dashed" /> No</span>
                </div>
                {data.postMealAggregate.map((w) => (
                  <div key={w.weekStart} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Tuần {w.weekStart}</span>
                    <span>Năng lượng: <strong>{w.avgEnergy}</strong> · No: <strong>{w.avgHunger}</strong> ({w.sampleCount} mẫu)</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data?.skipReasons?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-bold text-slate-600">Món bỏ qua trong thực đơn</p>
                {data.skipReasons.map((s) => (
                  <div key={s.itemId} className="text-sm p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <strong>{s.foodLabel}</strong> ({s.planDate}) — {s.skipReason}
                    {s.skipNote && <span className="text-slate-500"> · {s.skipNote}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data?.pendingSuggestions?.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <MealPlanSuggestionReviewList
                  suggestions={data.pendingSuggestions}
                  onUpdated={async () => {
                    await loadProgress(selectedMealPlanWeek || undefined);
                  }}
                />
              </CardContent>
            </Card>
          )}

          <WeeklySummaryForm clientId={clientId} adherence={summary?.mealPlanAdherenceRate} />
        </>
      )}
    </div>
  );
}
