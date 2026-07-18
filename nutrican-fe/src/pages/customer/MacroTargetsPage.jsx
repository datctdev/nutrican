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
  Upload, CheckCircle2, Zap, Scale, Heart, TrendingUp
} from 'lucide-react';

export default function MacroTargetsPage() {
  const fileInputRef = useRef(null);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [macros, setMacros] = useState({ dailyCalories: 0, protein: 0, carb: 0, fat: 0 });
  const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
  const [pregnancyTrimester, setPregnancyTrimester] = useState(1);
  
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [macrosRes, profileRes, goalsRes, metricsRes, milestonesRes] = await Promise.all([
        userService.getMacroTarget().catch(() => ({ data: { data: null } })),
        userService.getProfile().catch(() => ({ data: { data: null } })),
        profileExtensionsService.getGoals().catch(() => ({ data: { data: null } })),
        profileExtensionsService.getBodyMetrics({ page: 0, size: 20 }).catch(() => ({ data: { data: [] } })),
        profileExtensionsService.getMilestones().catch(() => ({ data: { data: [] } }))
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
      }

      if (goalsRes.data?.data) {
        setProgressGoals(goalsRes.data.data);
      }

      setBodyMetricHistory(metricsRes.data?.data?.content || metricsRes.data?.data || []);
      setMilestones(milestonesRes.data?.data || []);
      
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
      // 1. Save new Body Metric
      await profileExtensionsService.recordBodyMetric({
        weight: Number(updateForm.weight),
        bodyFatPercent: updateForm.bodyFatPercent ? Number(updateForm.bodyFatPercent) : null,
        muscleMass: updateForm.muscleMass ? Number(updateForm.muscleMass) : null,
        lbm: updateForm.lbm ? Number(updateForm.lbm) : null,
      });

      // 2. Fetch Macro Suggestion based on new weight (backend automatically uses latest BodyMetric)
      const suggestionRes = await userService.getMacroSuggestion({
        nutritionGoal,
        pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
      });

      const newMacros = suggestionRes.data?.data;
      if (newMacros) {
        const payload = {
          dailyCalories: newMacros.dailyCalories,
          protein: newMacros.protein,
          carb: newMacros.carb || newMacros.carbs,
          fat: newMacros.fat
        };
        // 3. Save new Macro Targets to profile
        await userService.setMacroTarget(payload);
        setMacros(payload);
      }

      // 4. Refresh History
      const metricsRes = await profileExtensionsService.getBodyMetrics({ page: 0, size: 20 });
      setBodyMetricHistory(metricsRes.data?.data?.content || metricsRes.data?.data || []);

      toast.success('Tiến độ và Mục tiêu Dinh dưỡng đã được cập nhật!');
      setUpdateForm({ weight: '', bodyFatPercent: '', muscleMass: '', lbm: '' });
      setInBodyPreview(null);

    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật tiến độ');
    } finally {
      setIsSaving(false);
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
                Ghi nhận Tiến độ & Tự động Tính Macro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TIMELINE CHART */}
      <div className="pt-2">
        <h3 className="text-lg font-bold text-slate-900 mb-4 px-2">Biểu Đồ Theo Dõi</h3>
        <ProgressTimelineCard 
          goals={progressGoals} 
          milestones={milestones} 
          bodyMetrics={bodyMetricHistory} 
          compact={false} 
        />
      </div>
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
