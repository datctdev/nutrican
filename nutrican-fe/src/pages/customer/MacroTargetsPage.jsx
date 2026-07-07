// src/pages/customer/MacroTargetsPage.jsx
import { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Modal from '../../components/common/Modal';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, Target, Flame, Beef, Wheat, Droplet, Save, 
  Upload, TrendingUp, Activity, Zap, Info, 
  CheckCircle2, Scale, Heart, Calculator, Edit3, Sparkles, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MacroTargetsPage() {
  const fileInputRef = useRef(null);
  
  const [macros, setMacros] = useState({
    dailyCalories: 2000,
    protein: 120,
    carb: 200,
    fat: 65,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInBodyModalOpen, setIsInBodyModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inBodyPreview, setInBodyPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const [inBodyForm, setInBodyForm] = useState({
    weight: '',
    height: '',
    age: '',
    gender: 'male',
    bodyFat: '',
    activityLevel: 'moderate',
    goal: 'maintain',
  });
  const [analyzedData, setAnalyzedData] = useState(null);
  const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
  const [loadingGoalSuggestion, setLoadingGoalSuggestion] = useState(false);

  useEffect(() => {
    fetchMacros();
    userService.getProfile().then((res) => {
      const g = res.data?.data?.nutritionGoal;
      if (g) setNutritionGoal(g);
    }).catch(() => {});
  }, []);

  const fetchMacros = async () => {
    setIsLoading(true);
    try {
      const response = await userService.getMacroTarget();
      const data = response.data.data;
      if (data) {
        setMacros({
          dailyCalories: data.dailyCalories || 2000,
          protein: data.protein || 120,
          carb: data.carb || data.carbs || 200,
          fat: data.fat || 65,
        });
      }
    } catch (error) {
      toast.error('Không thể tải mục tiêu dinh dưỡng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMacros = async () => {
    setIsSaving(true);
    try {
      await userService.setMacroTarget(macros);
      toast.success('Cập nhật mục tiêu thành công!');
    } catch (error) {
      toast.error('Không thể cập nhật mục tiêu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoalSuggestion = async () => {
    setLoadingGoalSuggestion(true);
    try {
      const res = await userService.getMacroSuggestion();
      const m = res.data.data;
      if (m) {
        setMacros({
          dailyCalories: m.dailyCalories || 2000,
          protein: m.protein || 120,
          carb: m.carb || m.carbs || 200,
          fat: m.fat || 65,
        });
        setActiveTab('current');
        toast.success(`Đã áp dụng gợi ý theo mục tiêu ${nutritionGoal}`);
      }
    } catch {
      toast.error('Không thể lấy gợi ý macro — cập nhật hồ sơ sức khỏe trước');
    } finally {
      setLoadingGoalSuggestion(false);
    }
  };

  const handleInBodyImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn file hình ảnh');
    if (file.size > 10 * 1024 * 1024) return toast.error('Kích thước ảnh phải nhỏ hơn 10MB');

    const reader = new FileReader();
    reader.onload = (ev) => setInBodyPreview(ev.target.result);
    reader.readAsDataURL(file);
    toast.info('Đã tải ảnh InBody! Điền thông tin bên dưới để nhận gợi ý.');
  };

  const calculateMacrosFromInBody = () => {
    const { weight, height, age, gender, bodyFat, activityLevel, goal } = inBodyForm;
    
    if (!weight || !height || !age) {
      toast.error('Vui lòng nhập cân nặng, chiều cao và tuổi');
      return;
    }

    setIsAnalyzing(true);
    
    setTimeout(() => {
      const w = parseFloat(weight);
      const h = parseFloat(height);
      const a = parseInt(age);
      const bf = bodyFat ? parseFloat(bodyFat) : (gender === 'male' ? 18 : 25);
      
      let bmr;
      if (gender === 'male') {
        bmr = 10 * w + 6.25 * h - 5 * a + 5;
      } else {
        bmr = 10 * w + 6.25 * h - 5 * a - 161;
      }
      
      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9,
      };
      
      const tdee = bmr * activityMultipliers[activityLevel];
      
      let targetCalories;
      if (goal === 'cut') {
        targetCalories = Math.round(tdee * 0.8);
      } else if (goal === 'bulk') {
        targetCalories = Math.round(tdee * 1.15);
      } else {
        targetCalories = Math.round(tdee);
      }
      
      const leanMass = w * (1 - bf / 100);
      const proteinPerKg = goal === 'cut' ? 2.2 : goal === 'bulk' ? 1.8 : 1.6;
      const protein = Math.round(leanMass * proteinPerKg);
      
      const fat = Math.round((targetCalories * 0.25) / 9);
      const carbCalories = targetCalories - (protein * 4) - (fat * 9);
      const carb = Math.round(carbCalories / 4);
      
      const calculated = {
        dailyCalories: targetCalories,
        protein,
        carb,
        fat,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        bodyFat: bf,
        leanMass: Math.round(leanMass * 10) / 10,
      };
      
      setAnalyzedData(calculated);
      setIsAnalyzing(false);
      toast.success('Phân tích hoàn tất!');
    }, 2000);
  };

  const applyRecommendedMacros = () => {
    if (analyzedData) {
      setMacros({
        dailyCalories: analyzedData.dailyCalories,
        protein: analyzedData.protein,
        carb: analyzedData.carb,
        fat: analyzedData.fat,
      });
      setIsInBodyModalOpen(false);
      setActiveTab('current');
      toast.success('Đã áp dụng gợi ý!');
    }
  };

  // Calculate percentages
  const totalCalFromMacros = (macros.protein * 4) + (macros.carb * 4) + (macros.fat * 9);
  const proteinPct = Math.round((macros.protein * 4 / totalCalFromMacros) * 100);
  const carbPct = Math.round((macros.carb * 4 / totalCalFromMacros) * 100);
  const fatPct = Math.round((macros.fat * 9 / totalCalFromMacros) * 100);

  const InputField = ({ icon: Icon, label, className = "", ...props }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />}
        <input
          className={`w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${Icon ? 'pl-9 pr-3' : 'px-4'} ${className}`}
          {...props}
        />
      </div>
    </div>
  );

  const SelectField = ({ label, options, className = "", ...props }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      <select
        className={`w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link to="/profile" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Quay lại Hồ sơ</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mục Tiêu Dinh Dưỡng</h1>
            <p className="text-slate-500 mt-1">Thiết lập và theo dõi mục tiêu ăn uống hàng ngày của bạn</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGoalSuggestion}
              disabled={loadingGoalSuggestion}
              variant="outline"
              className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 flex items-center gap-2 px-5 py-3"
            >
              {loadingGoalSuggestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              <span className="font-semibold">Gợi ý theo mục tiêu</span>
            </Button>
            <Button 
              onClick={() => { setIsInBodyModalOpen(true); setActiveTab('calculator'); }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg flex items-center gap-2 px-5 py-3"
            >
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">Tính Thông Minh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'current' 
              ? 'bg-slate-900 text-white shadow-lg' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          Mục Tiêu Hiện Tại
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'calculator' 
              ? 'bg-slate-900 text-white shadow-lg' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Tính Toán Gợi Ý
        </button>
      </div>

      {/* Current Targets Tab */}
      {activeTab === 'current' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Main Stats */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Calories Hero Card */}
            <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 border-0 text-white shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
              <CardContent className="p-8 relative z-10">
                <div className="text-center">
                  <p className="text-white/70 font-medium mb-2">Calories Hàng Ngày</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-black tracking-tight">{macros.dailyCalories.toLocaleString()}</span>
                    <span className="text-xl text-white/70">kcal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macro Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Protein */}
              <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-rose-500 to-pink-500" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                      <Beef className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-500">Đạm</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{macros.protein}g</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">{proteinPct}%</span>
                    <span className="text-rose-500 font-medium">{Math.round(macros.protein * 4)} cal</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" style={{ width: `${proteinPct}%` }} />
                  </div>
                </CardContent>
              </Card>

              {/* Carbs */}
              <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Wheat className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-500">Tinh Bột</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{macros.carb}g</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">{carbPct}%</span>
                    <span className="text-amber-500 font-medium">{Math.round(macros.carb * 4)} cal</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${carbPct}%` }} />
                  </div>
                </CardContent>
              </Card>

              {/* Fat */}
              <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Droplet className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-500">Chất Béo</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{macros.fat}g</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">{fatPct}%</span>
                    <span className="text-indigo-500 font-medium">{Math.round(macros.fat * 9)} cal</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${fatPct}%` }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Edit Section */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-slate-500" />
                  Chỉnh Sửa Mục Tiêu
                </h3>
                <div className="space-y-4">
                  <InputField
                    icon={Flame}
                    label="Calories Hàng Ngày"
                    type="number"
                    value={macros.dailyCalories}
                    onChange={(e) => setMacros(m => ({...m, dailyCalories: Number(e.target.value)}))}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <InputField
                      icon={Beef}
                      label="Đạm (g)"
                      type="number"
                      value={macros.protein}
                      onChange={(e) => setMacros(m => ({...m, protein: Number(e.target.value)}))}
                      className="text-center font-semibold"
                    />
                    <InputField
                      icon={Wheat}
                      label="Tinh Bột (g)"
                      type="number"
                      value={macros.carb}
                      onChange={(e) => setMacros(m => ({...m, carb: Number(e.target.value)}))}
                      className="text-center font-semibold"
                    />
                    <InputField
                      icon={Droplet}
                      label="Chất Béo (g)"
                      type="number"
                      value={macros.fat}
                      onChange={(e) => setMacros(m => ({...m, fat: Number(e.target.value)}))}
                      className="text-center font-semibold"
                    />
                  </div>
                  <Button
                    onClick={handleSaveMacros}
                    disabled={isSaving}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-5 font-semibold flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Đang lưu...</>
                    ) : (
                      <><Save className="h-5 w-5" /> Lưu Thay Đổi</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Quick Guide */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Hướng Dẫn Nhanh
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                    <Beef className="w-5 h-5 text-rose-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Đạm (Protein)</p>
                      <p className="text-sm text-slate-300">1.6-2.2g/kg để phát triển cơ bắp</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                    <Wheat className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Tinh Bột (Carbs)</p>
                      <p className="text-sm text-slate-300">45-65% tổng calories cho năng lượng</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                    <Droplet className="w-5 h-5 text-indigo-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Chất Béo (Fat)</p>
                      <p className="text-sm text-slate-300">20-35% cho hormone và sức khỏe</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Calculator CTA */}
            <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-200 cursor-pointer hover:border-emerald-300 hover:shadow-lg transition-all" onClick={() => setActiveTab('calculator')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800">Tính Toán Thông Minh</h4>
                    <p className="text-sm text-slate-600">Nhập thông số InBody để nhận gợi ý cá nhân hóa</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            {/* Macro Distribution Pie */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Tỷ Lệ Phân Bổ</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-sm font-medium text-slate-600">Đạm</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{proteinPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-sm font-medium text-slate-600">Tinh Bột</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{carbPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-500" />
                      <span className="text-sm font-medium text-slate-600">Chất Béo</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{fatPct}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <Card className="bg-white border border-slate-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Tính Toán Dinh Dưỡng Cá Nhân</h3>
                    <p className="text-sm text-slate-500">Nhập thông số cơ thể để nhận gợi ý tối ưu</p>
                  </div>
                </div>

                {/* Image Upload */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all mb-6 ${
                    inBodyPreview 
                      ? 'border-emerald-400 bg-emerald-50' 
                      : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {inBodyPreview ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                      <p className="text-emerald-700 font-semibold">Đã tải ảnh InBody!</p>
                      <img src={inBodyPreview} alt="InBody" className="max-h-24 mx-auto rounded-lg shadow" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="text-slate-600 font-medium">Tải Lên Ảnh InBody (Tùy chọn)</p>
                      <p className="text-sm text-slate-400">Click để chọn ảnh</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInBodyImageUpload} className="hidden" />

                {/* Form */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <InputField
                    icon={Scale}
                    label="Cân Nặng (kg)"
                    type="number"
                    step="0.1"
                    placeholder="VD: 70"
                    value={inBodyForm.weight}
                    onChange={(e) => setInBodyForm(f => ({...f, weight: e.target.value}))}
                  />
                  <InputField
                    icon={TrendingUp}
                    label="Chiều Cao (cm)"
                    type="number"
                    placeholder="VD: 175"
                    value={inBodyForm.height}
                    onChange={(e) => setInBodyForm(f => ({...f, height: e.target.value}))}
                  />
                  <InputField
                    icon={Activity}
                    label="Tuổi"
                    type="number"
                    placeholder="VD: 25"
                    value={inBodyForm.age}
                    onChange={(e) => setInBodyForm(f => ({...f, age: e.target.value}))}
                  />
                  <SelectField
                    label="Giới Tính"
                    value={inBodyForm.gender}
                    onChange={(e) => setInBodyForm(f => ({...f, gender: e.target.value}))}
                    options={[
                      { value: 'male', label: 'Nam' },
                      { value: 'female', label: 'Nữ' },
                    ]}
                  />
                  <InputField
                    icon={Heart}
                    label="Tỷ Lệ Mỡ (%)"
                    type="number"
                    placeholder="VD: 18"
                    value={inBodyForm.bodyFat}
                    onChange={(e) => setInBodyForm(f => ({...f, bodyFat: e.target.value}))}
                  />
                  <SelectField
                    label="Mức Độ Vận Động"
                    value={inBodyForm.activityLevel}
                    onChange={(e) => setInBodyForm(f => ({...f, activityLevel: e.target.value}))}
                    options={[
                      { value: 'sedentary', label: 'Ít vận động' },
                      { value: 'light', label: 'Nhẹ (1-3 ngày/tuần)' },
                      { value: 'moderate', label: 'Vừa (3-5 ngày/tuần)' },
                      { value: 'active', label: 'Năng động (6-7 ngày/tuần)' },
                      { value: 'veryActive', label: 'Rất năng động' },
                    ]}
                  />
                </div>

                <SelectField
                  label="Mục Tiêu Của Bạn"
                  value={inBodyForm.goal}
                  onChange={(e) => setInBodyForm(f => ({...f, goal: e.target.value}))}
                  options={[
                    { value: 'cut', label: 'Giảm Mỡ' },
                    { value: 'maintain', label: 'Giữ Cân' },
                    { value: 'bulk', label: 'Tăng Cơ' },
                  ]}
                />

                <Button 
                  onClick={calculateMacrosFromInBody}
                  disabled={isAnalyzing}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-5 font-semibold flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Đang phân tích...</>
                  ) : (
                    <><Zap className="h-5 w-5" /> Tính Toán Ngay</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="col-span-12 lg:col-span-5">
            {analyzedData ? (
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-white shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Kết Quả Phân Tích</h3>
                      <p className="text-sm text-white/70">Dựa trên thông số của bạn</p>
                    </div>
                  </div>

                  {/* Calories */}
                  <div className="text-center py-6 border-b border-white/20 mb-6">
                    <p className="text-white/70 font-medium">Calories Khuyến Nghị</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-black">{analyzedData.dailyCalories.toLocaleString()}</span>
                      <span className="text-lg text-white/70">kcal/ngày</span>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <Beef className="w-5 h-5 mx-auto mb-1 text-rose-300" />
                      <p className="text-2xl font-bold">{analyzedData.protein}g</p>
                      <p className="text-xs text-white/70">Đạm</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <Wheat className="w-5 h-5 mx-auto mb-1 text-amber-300" />
                      <p className="text-2xl font-bold">{analyzedData.carb}g</p>
                      <p className="text-xs text-white/70">Tinh Bột</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <Droplet className="w-5 h-5 mx-auto mb-1 text-indigo-300" />
                      <p className="text-2xl font-bold">{analyzedData.fat}g</p>
                      <p className="text-xs text-white/70">Chất Béo</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="bg-white/10 rounded-xl p-4 text-sm space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-white/70">BMR (Trao đổi chất):</span>
                      <span className="font-semibold">{analyzedData.bmr} kcal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">TDEE (Nhu cầu):</span>
                      <span className="font-semibold">{analyzedData.tdee} kcal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Khối Lượng Nạc:</span>
                      <span className="font-semibold">{analyzedData.leanMass} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Tỷ Lệ Mỡ:</span>
                      <span className="font-semibold">{analyzedData.bodyFat}%</span>
                    </div>
                  </div>

                  <Button 
                    onClick={applyRecommendedMacros}
                    className="w-full bg-white text-emerald-600 hover:bg-white/90 rounded-xl py-5 font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Áp Dụng Gợi Ý Này
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-100 border-2 border-dashed border-slate-300">
                <CardContent className="p-12 text-center">
                  <Calculator className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-slate-600 mb-2">Chưa Có Kết Quả</h4>
                  <p className="text-sm text-slate-400">Nhập thông số bên trái và nhấn tính toán để xem gợi ý</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* InBody Modal */}
      <Modal 
        isOpen={isInBodyModalOpen} 
        onClose={() => {
          setIsInBodyModalOpen(false);
          setInBodyPreview(null);
          setAnalyzedData(null);
        }} 
        title="Tính Toán Dinh Dưỡng Thông Minh"
        size="lg"
      >
        {/* Modal content moved to tab */}
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">Vui lòng sử dụng tab "Tính Toán Gợi Ý" để nhập thông tin.</p>
          <Button 
            onClick={() => {
              setIsInBodyModalOpen(false);
              setActiveTab('calculator');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Mở Tab Tính Toán
          </Button>
        </div>
      </Modal>
    </div>
  );
}
