import { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import ProgressTimelineCard from './components/ProgressTimelineCard';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Target, Beef, Wheat, Droplet,
  Upload, CheckCircle2, Zap, Scale, Heart, TrendingUp,
  Pencil, X, Activity, AlertTriangle, RefreshCw
} from 'lucide-react';
import {
  ACTIVITY_LEVEL_OPTIONS,
  DEFAULT_ACTIVITY_LEVEL,
  ActivityLevelInfoTooltip,
} from './components/activityLevelOptions';

export default function MacroTargetsPage() {
  const fileInputRef = useRef(null);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [macros, setMacros] = useState({ dailyCalories: 0, protein: 0, carb: 0, fat: 0 });
  const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
  const [pregnancyTrimester, setPregnancyTrimester] = useState(1);
  const [activityLevel, setActivityLevel] = useState(DEFAULT_ACTIVITY_LEVEL);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [hasActivePt, setHasActivePt] = useState(false);
  const [progressGoals, setProgressGoals] = useState(null);
  const [bodyMetricHistory, setBodyMetricHistory] = useState([]);
  const [milestones, setMilestones] = useState([]);
  
  const [isAnalyzingInbody, setIsAnalyzingInbody] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update Station Form
  const [updateForm, setUpdateForm] = useState({
    weight: '',
    bodyFatPercent: '',
    muscleMass: '',
    lbm: ''
  });
  const [inBodyPreview, setInBodyPreview] = useState(null);

  // Confirm Recalculate Modal State
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);

  // Edit Goal Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editGoalForm, setEditGoalForm] = useState({
    nutritionGoal: 'MAINTAIN',
    targetWeight: '',
    targetDate: ''
  });

  const openGoalModal = () => {
    setEditGoalForm({
      nutritionGoal: progressGoals?.nutritionGoal || nutritionGoal || 'MAINTAIN',
      targetWeight: progressGoals?.targetWeight || '',
      targetDate: progressGoals?.targetDate || ''
    });
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    const currentWeight = bodyMetricHistory[0]?.weight || 0;
    const target = Number(editGoalForm.targetWeight);
    const previousGoal = progressGoals?.nutritionGoal || nutritionGoal;
    
    if (editGoalForm.nutritionGoal === 'WEIGHT_LOSS' && currentWeight && target >= currentWeight) {
      return toast.error('Lỗi: Cân nặng mục tiêu (Giảm cân) phải NHỎ HƠN cân nặng hiện tại!');
    }
    if (editGoalForm.nutritionGoal === 'WEIGHT_GAIN' && currentWeight && target <= currentWeight) {
      return toast.error('Lỗi: Cân nặng mục tiêu (Tăng cân) phải LỚN HƠN cân nặng hiện tại!');
    }
    
    setIsSaving(true);
    try {
      await profileExtensionsService.saveGoals({
        nutritionGoal: editGoalForm.nutritionGoal,
        targetWeight: target || null,
        targetDate: editGoalForm.targetDate || null
      });
      
      await userService.updatePreferences({
        nutritionGoal: editGoalForm.nutritionGoal
      });
      
      const goalsRes = await profileExtensionsService.getGoals();
      setProgressGoals(goalsRes.data.data);
      setNutritionGoal(editGoalForm.nutritionGoal);

      if (!hasActivePt && editGoalForm.nutritionGoal !== previousGoal) {
        try {
          const res = await userService.recalculateMacros({
            activityLevel,
            nutritionGoal: editGoalForm.nutritionGoal,
            pregnancyTrimester: editGoalForm.nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
          });
          const data = res.data?.data;
          if (data?.macros) {
            setMacros({
              dailyCalories: data.macros.dailyCalories || 0,
              protein: data.macros.protein || 0,
              carb: data.macros.carb || data.macros.carbs || 0,
              fat: data.macros.fat || 0,
            });
          }
          window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
          toast.success('Đã cập nhật mục tiêu và tính lại macro');
        } catch (e) {
          toast.warning('Đã lưu mục tiêu, nhưng chưa cập nhật lại macro — vui lòng thử lại');
        }
      } else {
        toast.success('Đã cập nhật mục tiêu thành công');
      }
      setShowGoalModal(false);
    } catch (err) {
      toast.error('Lỗi khi lưu mục tiêu');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [macrosRes, profileRes, goalsRes, metricsRes, milestonesRes, ptRes] = await Promise.all([
        userService.getMacroTarget().catch(() => ({ data: { data: null } })),
        userService.getProfile().catch(() => ({ data: { data: null } })),
        profileExtensionsService.getGoals().catch(() => ({ data: { data: null } })),
        profileExtensionsService.getBodyMetrics({ page: 0, size: 20 }).catch(() => ({ data: { data: [] } })),
        profileExtensionsService.getMilestones().catch(() => ({ data: { data: [] } })),
        profileExtensionsService.hasActivePt().catch(() => ({ data: { data: { hasActivePt: false } } })),
      ]);

      if (macrosRes.data?.data) {
        setMacros({
          dailyCalories: macrosRes.data.data.dailyCalories || 0,
          protein: macrosRes.data.data.protein || 0,
          carb: macrosRes.data.data.carb || macrosRes.data.data.carbs || 0,
          fat: macrosRes.data.data.fat || 0,
        });
      }

      if (profileRes.data?.data) {
        setNutritionGoal(profileRes.data.data.nutritionGoal || 'MAINTAIN');
        setPregnancyTrimester(profileRes.data.data.pregnancyTrimester || 1);
        setActivityLevel(profileRes.data.data.activityLevel || DEFAULT_ACTIVITY_LEVEL);
      }

      if (goalsRes.data?.data) {
        setProgressGoals(goalsRes.data.data);
      }

      setBodyMetricHistory(metricsRes.data?.data?.content || metricsRes.data?.data || []);
      setMilestones(milestonesRes.data?.data || []);
      setHasActivePt(Boolean(ptRes.data?.data?.hasActivePt));
      
    } catch (error) {
      toast.error('Không thể tải dữ liệu tiến độ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInbodyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn file hình ảnh');
    
    const reader = new FileReader();
    reader.onload = (ev) => setInBodyPreview(ev.target.result);
    reader.readAsDataURL(file);

    setIsAnalyzingInbody(true);
    toast.loading('Đang phân tích phiếu InBody...', { id: 'inbody-ocr' });
    try {
      const res = await profileExtensionsService.analyzeInbody(file);
      const data = res.data.data;
      if (data) {
        setUpdateForm({
          weight: data.weight ? data.weight.toString() : '',
          bodyFatPercent: data.bodyFatPercent ? data.bodyFatPercent.toString() : '',
          muscleMass: data.muscleMass ? data.muscleMass.toString() : '',
          lbm: data.lbm ? data.lbm.toString() : ''
        });
        toast.success('Phân tích thành công! Kiểm tra lại số liệu.', { id: 'inbody-ocr' });
      }
    } catch (err) {
      toast.error('Không thể phân tích ảnh InBody.', { id: 'inbody-ocr' });
      setInBodyPreview(null);
    } finally {
      setIsAnalyzingInbody(false);
      e.target.value = '';
    }
  };

  const handleUpdateProgressAndMacros = async () => {
    if (!updateForm.weight) {
      toast.error('Vui lòng nhập cân nặng để ghi nhận tiến độ');
      return;
    }

    setIsSaving(true);
    try {
      await profileExtensionsService.recordBodyMetric({
        weight: Number(updateForm.weight),
        bodyFatPercent: updateForm.bodyFatPercent ? Number(updateForm.bodyFatPercent) : null,
        muscleMass: updateForm.muscleMass ? Number(updateForm.muscleMass) : null,
        lbm: updateForm.lbm ? Number(updateForm.lbm) : null,
      });

      if (!hasActivePt) {
        const suggestionRes = await userService.getMacroSuggestion({
          nutritionGoal,
          pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
          activityLevel,
        });

        const newMacros = suggestionRes.data?.data;
        if (newMacros) {
          const payload = {
            dailyCalories: newMacros.dailyCalories,
            protein: newMacros.protein,
            carb: newMacros.carb || newMacros.carbs,
            fat: newMacros.fat
          };
          await userService.setMacroTarget(payload);
          setMacros(payload);
          window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
        }
      }

      const metricsRes = await profileExtensionsService.getBodyMetrics({ page: 0, size: 20 });
      setBodyMetricHistory(metricsRes.data?.data?.content || metricsRes.data?.data || []);

      toast.success(hasActivePt
        ? 'Đã ghi nhận tiến độ cơ thể'
        : 'Tiến độ và Mục tiêu Dinh dưỡng đã được cập nhật!');
      setUpdateForm({ weight: '', bodyFatPercent: '', muscleMass: '', lbm: '' });
      setInBodyPreview(null);

    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật tiến độ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculateMacros = async () => {
    setShowRecalcConfirm(false);
    setIsRecalculating(true);
    try {
      const res = await userService.recalculateMacros({
        activityLevel,
        nutritionGoal,
        pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
      });
      const data = res.data?.data;
      if (data?.activityLevel) setActivityLevel(data.activityLevel);
      if (data?.macros) {
        setMacros({
          dailyCalories: data.macros.dailyCalories || 0,
          protein: data.macros.protein || 0,
          carb: data.macros.carb || data.macros.carbs || 0,
          fat: data.macros.fat || 0,
        });
      }
      toast.success('Đã cập nhật mức vận động và tính lại macro');
      window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không tính lại được macro');
    } finally {
      setIsRecalculating(false);
    }
  };

  const getDeltaString = () => {
    if (bodyMetricHistory.length < 2) return null;
    const current = bodyMetricHistory[0].weight;
    const previous = bodyMetricHistory[1].weight;
    const diff = (current - previous).toFixed(1);
    if (diff > 0) return { text: `Tăng ${Math.abs(diff)}kg so với lần trước`, type: 'gain' };
    if (diff < 0) return { text: `Giảm ${Math.abs(diff)}kg so với lần trước`, type: 'loss' };
    return { text: 'Không thay đổi so với lần trước', type: 'maintain' };
  };

  const delta = getDeltaString();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const goalLabels = {
    'WEIGHT_LOSS': 'Giảm cân',
    'WEIGHT_GAIN': 'Tăng cân',
    'MAINTAIN': 'Duy trì',
    'PREGNANT': 'Mang thai',
    'RECOVERY': 'Phục hồi'
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in space-y-6 px-4 sm:px-0">
      <div className="mb-6 flex flex-col gap-1">
        <Link to="/profile" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-semibold mb-2 w-fit">
          <ArrowLeft className="w-4 h-4" /> Quay lại Hồ sơ
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tiến độ & Mục tiêu Dinh dưỡng</h1>
        <p className="text-slate-500 font-medium">Theo dõi sự thay đổi cơ thể và tự động tối ưu hóa khẩu phần ăn.</p>
      </div>

      {hasActivePt && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          Mục tiêu dinh dưỡng và mức vận động đang do PT quản lý — liên hệ PT để thay đổi. Bạn vẫn có thể ghi nhận tiến độ cân nặng.
        </div>
      )}

      {/* DASHBOARD CARD */}
      <Card className="bg-slate-900 border-0 text-white shadow-xl overflow-hidden rounded-3xl relative">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Target className="w-48 h-48" />
        </div>
        <CardContent className="p-8 relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Mục tiêu hiện tại</p>
              <h2 className="text-2xl font-black mt-1">{goalLabels[nutritionGoal] || 'Chưa xác định'}</h2>
              {delta && (
                <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  delta.type === 'loss' ? 'bg-emerald-500/20 text-emerald-300' :
                  delta.type === 'gain' ? 'bg-rose-500/20 text-rose-300' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  <TrendingUp className={`w-3.5 h-3.5 mr-1 ${delta.type === 'loss' ? 'rotate-180' : ''}`} />
                  {delta.text}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Tổng Calories</p>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-4xl font-black">{macros.dailyCalories.toLocaleString()}</span>
                <span className="text-slate-400 text-sm">kcal</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-700/50 pt-6">
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-rose-400">
                <Beef className="w-4 h-4" /> <span className="font-bold text-xs uppercase tracking-wider">Đạm</span>
              </div>
              <p className="text-xl font-bold">{macros.protein}g</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-amber-400">
                <Wheat className="w-4 h-4" /> <span className="font-bold text-xs uppercase tracking-wider">Tinh bột</span>
              </div>
              <p className="text-xl font-bold">{macros.carb}g</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-indigo-400">
                <Droplet className="w-4 h-4" /> <span className="font-bold text-xs uppercase tracking-wider">Chất béo</span>
              </div>
              <p className="text-xl font-bold">{macros.fat}g</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIVITY LEVEL → recalculate macros */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Mức độ vận động</h3>
              <p className="text-xs text-slate-500 mt-0.5">TDEE = BMR × R — áp dụng sẽ tính lại mục tiêu macro</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Mức độ vận động hàng ngày</label>
              <ActivityLevelInfoTooltip />
            </div>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              disabled={hasActivePt}
              className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium ${hasActivePt ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
            >
              {ACTIVITY_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => setShowRecalcConfirm(true)}
            disabled={hasActivePt || isRecalculating || isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-5 font-bold text-sm disabled:opacity-60"
          >
            {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Áp dụng & tính lại macro
          </Button>
        </CardContent>
      </Card>

      {/* UPDATE STATION */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">Cập nhật Trạng thái Cơ thể</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`h-full border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  inBodyPreview ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {inBodyPreview ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="text-emerald-700 font-bold text-sm">Đã tải ảnh InBody!</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-slate-700 font-bold text-sm">Tải Lên Ảnh InBody</p>
                    <p className="text-xs text-slate-500 mt-1">Hệ thống AI sẽ tự động đọc số liệu</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInbodyUpload} className="hidden" />
            </div>

            <div className="md:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="Cân nặng (kg)" 
                  icon={Scale} 
                  value={updateForm.weight} 
                  onChange={(e) => setUpdateForm(f => ({...f, weight: e.target.value.replace(/[^0-9.]/g, '')}))} 
                />
                <InputField 
                  label="Tỷ lệ mỡ (%)" 
                  icon={Heart} 
                  value={updateForm.bodyFatPercent} 
                  onChange={(e) => setUpdateForm(f => ({...f, bodyFatPercent: e.target.value.replace(/[^0-9.]/g, '')}))} 
                />
                <InputField 
                  label="Khối lượng cơ (kg)" 
                  value={updateForm.muscleMass} 
                  onChange={(e) => setUpdateForm(f => ({...f, muscleMass: e.target.value.replace(/[^0-9.]/g, '')}))} 
                />
                <InputField 
                  label="Khối lượng nạc (kg)" 
                  value={updateForm.lbm} 
                  onChange={(e) => setUpdateForm(f => ({...f, lbm: e.target.value.replace(/[^0-9.]/g, '')}))} 
                />
              </div>
              
              <Button 
                onClick={handleUpdateProgressAndMacros}
                disabled={isSaving || isAnalyzingInbody}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-5 font-bold text-sm mt-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {hasActivePt ? 'Ghi nhận tiến độ' : 'Ghi nhận Tiến độ & Tự động Tính Macro'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TIMELINE CHART */}
      <div className="pt-2">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-lg font-bold text-slate-900">Biểu Đồ Theo Dõi</h3>
          <Button
            onClick={openGoalModal}
            variant="outline"
            disabled={hasActivePt}
            className="text-xs font-bold border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 rounded-lg disabled:opacity-60"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa Mục Tiêu
          </Button>
        </div>
        <ProgressTimelineCard 
          goals={progressGoals} 
          milestones={milestones} 
          bodyMetrics={bodyMetricHistory} 
          compact={false} 
        />
      </div>

      {/* MODAL: CONFIRM RECALCULATE MACROS */}
      {showRecalcConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up relative">
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 text-white relative overflow-hidden">
              <div className="absolute -top-4 -right-4 opacity-20 pointer-events-none">
                <RefreshCw className="w-28 h-28" />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Tính lại mục tiêu macro?</h3>
                  <p className="text-indigo-100 text-xs font-medium mt-0.5">
                    {ACTIVITY_LEVEL_OPTIONS.find((o) => o.value === activityLevel)?.label || 'Mức vận động mới'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  Áp dụng mức vận động mới sẽ <span className="font-bold">ghi đè</span> mục tiêu Calo / Đạm / Tinh bột / Chất béo hiện tại của bạn.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Calo</p>
                  <p className="text-sm font-bold text-slate-800">{macros.dailyCalories.toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-400">Đạm</p>
                  <p className="text-sm font-bold text-rose-600">{macros.protein}g</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Tinh bột</p>
                  <p className="text-sm font-bold text-amber-600">{macros.carb}g</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Béo</p>
                  <p className="text-sm font-bold text-indigo-600">{macros.fat}g</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center font-medium">Các giá trị hiện tại ở trên sẽ được thay thế bằng kết quả tính mới.</p>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <Button
                onClick={() => setShowRecalcConfirm(false)}
                variant="ghost"
                className="flex-1 font-bold text-slate-600 hover:bg-slate-100 rounded-xl py-5"
              >
                Huỷ
              </Button>
              <Button
                onClick={handleRecalculateMacros}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl py-5 shadow-lg shadow-indigo-500/30"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Áp dụng ngay
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up relative">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Cập nhật Mục tiêu</h3>
              <button onClick={() => setShowGoalModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Loại Mục tiêu</label>
                <select
                  value={editGoalForm.nutritionGoal}
                  onChange={(e) => setEditGoalForm(f => ({ ...f, nutritionGoal: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium outline-none focus:border-blue-500"
                >
                  <option value="WEIGHT_LOSS">Giảm cân</option>
                  <option value="WEIGHT_GAIN">Tăng cân</option>
                  <option value="MAINTAIN">Duy trì</option>
                  <option value="PREGNANT">Mang thai</option>
                  <option value="RECOVERY">Phục hồi</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  Cân nặng hướng đến (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editGoalForm.targetWeight}
                  onChange={(e) => setEditGoalForm(f => ({ ...f, targetWeight: e.target.value }))}
                  placeholder="Ví dụ: 65.5"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  Ngày dự kiến đạt được
                </label>
                <input
                  type="date"
                  value={editGoalForm.targetDate}
                  onChange={(e) => setEditGoalForm(f => ({ ...f, targetDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button onClick={() => setShowGoalModal(false)} variant="ghost" className="font-bold text-slate-600 hover:bg-slate-200 rounded-xl">
                Hủy
              </Button>
              <Button onClick={handleSaveGoal} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Lưu Mục tiêu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const InputField = ({ icon: Icon, label, className = "", ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative flex items-center">
      {Icon && <Icon className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />}
      <input
        className={`w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${Icon ? 'pl-9 pr-3' : 'px-4'} ${className}`}
        {...props}
      />
    </div>
  </div>
);
