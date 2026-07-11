// src/pages/customer/MacroTargetsPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { userService } from '../../services/userService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Modal from '../../components/common/Modal';
import ProgressTimelineCard from './components/ProgressTimelineCard';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { 
  Loader2, ArrowLeft, Target, Flame, Beef, Wheat, Droplet, Save, 
  Upload, TrendingUp, Activity, Zap, Info, 
  CheckCircle2, Scale, Heart, Calculator, Edit3, Sparkles, ChevronRight,
  Check, Calendar, Star, AlertTriangle
} from 'lucide-react';

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

const getGoalsByGender = (gender) => {
  const base = [
    { value: 'WEIGHT_LOSS', label: 'Giảm cân' },
    { value: 'WEIGHT_GAIN', label: 'Tăng cân' },
    { value: 'MAINTAIN', label: 'Duy trì' },
  ];
  if (gender === 'female') {
    return [
      ...base,
      { value: 'PREGNANT', label: 'Mang thai' },
      { value: 'RECOVERY', label: 'Phục hồi sau mang thai' },
    ];
  }
  return base;
};

export default function MacroTargetsPage() {
  const fileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState('nutrition'); // sidebar tabs: nutrition, health, progress

  // Section 1: Nutrition targets states
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
  const [nutritionActiveTab, setNutritionActiveTab] = useState('current'); // sub-tab: current, calculator
  const [inBodyForm, setInBodyForm] = useState({
    weight: '',
    height: '',
    age: '',
    gender: 'male',
    bodyFat: '',
    activityLevel: 'moderate',
    goal: 'MAINTAIN',
    pregnancyTrimester: 1,
  });
  const [analyzedData, setAnalyzedData] = useState(null);
  const [loadingGoalSuggestion, setLoadingGoalSuggestion] = useState(false);

  // Section 2: Health & nutrition states
  const [allergens, setAllergens] = useState([]);
  const [dietPreference, setDietPreference] = useState('NORMAL');
  const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
  const [pregnancyTrimester, setPregnancyTrimester] = useState(1);
  const [savingHealth, setSavingHealth] = useState(false);
  const [userGender, setUserGender] = useState('male');
  const [postMealRatingOptIn, setPostMealRatingOptIn] = useState(true);
  const [hireResultEmail, setHireResultEmail] = useState(true);
  const [sosResultEmail, setSosResultEmail] = useState(true);
  const [weeklySummaryEmail, setWeeklySummaryEmail] = useState(true);
  const [bodyMetricReminder, setBodyMetricReminder] = useState(true);

  // Section 3: Goal & Progress states
  const [goalForm, setGoalForm] = useState({ targetWeight: '', baselineWeight: '', targetDate: '' });
  const [bodyWeight, setBodyWeight] = useState('');
  const [progressGoals, setProgressGoals] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [bodyMetricHistory, setBodyMetricHistory] = useState([]);
  const [savingGoals, setSavingGoals] = useState(false);
  const [showBodyMetricReminder, setShowBodyMetricReminder] = useState(false);

  useEffect(() => {
    fetchMacros();
    fetchHealthAndGoals();
  }, []);

  const fetchMacros = async () => {
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

  const fetchHealthAndGoals = async () => {
    try {
      const [profileRes, allergyRes] = await Promise.all([
        userService.getProfile(),
        userService.getAllergies().catch(() => ({ data: { data: [] } })),
      ]);
      const data = profileRes.data.data;
      setAllergens(allergyRes.data.data || data.allergens || []);
      if (data.dietPreference) setDietPreference(data.dietPreference);
      if (data.nutritionGoal) setNutritionGoal(data.nutritionGoal);
      if (data.pregnancyTrimester) setPregnancyTrimester(data.pregnancyTrimester);
      if (data.gender) {
        setUserGender(data.gender);
        if (data.gender === 'male' && (data.nutritionGoal === 'PREGNANT' || data.nutritionGoal === 'RECOVERY')) {
          setNutritionGoal('MAINTAIN');
        }
      }
      
      const optIn = data.notificationOptIn || {};
      setPostMealRatingOptIn(optIn.postMealRating !== false);
      setHireResultEmail(optIn.hireResultEmail !== false);
      setSosResultEmail(optIn.sosResultEmail !== false);
      setWeeklySummaryEmail(optIn.weeklySummaryEmail !== false);
      setBodyMetricReminder(optIn.bodyMetricReminder !== false);
    } catch (err) {
      console.error('Error fetching health profile:', err);
    }

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

  const handleSaveMacros = async () => {
    setIsSaving(true);
    try {
      await userService.setMacroTarget(macros);
      toast.success('Cập nhật mục tiêu dinh dưỡng thành công!');
    } catch (error) {
      toast.error('Không thể cập nhật mục tiêu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoalSuggestion = async () => {
    setLoadingGoalSuggestion(true);
    try {
      const res = await userService.getMacroSuggestion({
        nutritionGoal,
        pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
      });
      const m = res.data.data;
      if (m) {
        setMacros({
          dailyCalories: m.dailyCalories || 2000,
          protein: m.protein || 120,
          carb: m.carb || m.carbs || 200,
          fat: m.fat || 65,
        });
        setNutritionActiveTab('current');
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
    const { weight, height, age, gender, bodyFat, activityLevel, goal, pregnancyTrimester } = inBodyForm;
    
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
      if (goal === 'WEIGHT_LOSS') {
        targetCalories = Math.round(tdee - 400);
      } else if (goal === 'WEIGHT_GAIN') {
        targetCalories = Math.round(tdee + 300);
      } else if (goal === 'PREGNANT') {
        targetCalories = Math.round(tdee + (pregnancyTrimester === 3 ? 450 : 300));
      } else if (goal === 'RECOVERY') {
        targetCalories = Math.round(tdee + 200);
      } else {
        targetCalories = Math.round(tdee);
      }
      
      targetCalories = Math.max(1200, targetCalories);
      
      const leanMass = w * (1 - bf / 100);
      const protein = Math.round(w * (goal === 'WEIGHT_GAIN' ? 2.0 : 1.6));
      
      const fat = Math.round((targetCalories * 0.25) / 9);
      const carbCalories = targetCalories - (protein * 4) - (fat * 9);
      const carb = Math.max(0, Math.round(carbCalories / 4));
      
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
      setNutritionActiveTab('current');
      toast.success('Đã áp dụng gợi ý!');
    }
  };

  const toggleAllergen = (value) => {
    setAllergens((prev) => prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]);
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
      toast.error('Không thể lưu thông tin sức khỏe');
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
      toast.success('Đã lưu mục tiêu tiến độ');
    } catch {
      toast.error('Không lưu được mục tiêu');
    } finally {
      setSavingGoals(false);
    }
  };

  const handleLogWeight = async () => {
    if (!bodyWeight) {
      toast.error('Nhập cân nặng hiện tại');
      return;
    }
    try {
      await profileExtensionsService.recordBodyMetric({ weight: Number(bodyWeight) });
      toast.success('Đã ghi nhận cân nặng hôm nay!');
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

  // Calculate percentages
  const totalCalFromMacros = (macros.protein * 4) + (macros.carb * 4) + (macros.fat * 9);
  const proteinPct = totalCalFromMacros > 0 ? Math.round((macros.protein * 4 / totalCalFromMacros) * 100) : 0;
  const carbPct = totalCalFromMacros > 0 ? Math.round((macros.carb * 4 / totalCalFromMacros) * 100) : 0;
  const fatPct = totalCalFromMacros > 0 ? Math.round((macros.fat * 9 / totalCalFromMacros) * 100) : 0;

  // Helper components moved outside the page component to prevent focus loss on re-render

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in px-4">
      {/* Header */}
      <div className="mb-6">
        <Link to="/profile" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-semibold">Quay lại Hồ sơ</span>
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mục Tiêu & Chỉ Số Cá Nhân</h1>
        <p className="text-slate-500 mt-1 font-medium">Thiết lập mục tiêu dinh dưỡng, hồ sơ sức khỏe và theo dõi tiến độ cân nặng.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Navigation Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-1">
            {[
              { id: 'nutrition', label: 'Mục tiêu dinh dưỡng', icon: Target, desc: 'Calories & Tỷ lệ Macros' },
              { id: 'health', label: 'Sức khỏe & dinh dưỡng', icon: Heart, desc: 'Ăn kiêng, Dị ứng & Email' },
              { id: 'progress', label: 'Mục tiêu & tiến độ', icon: Scale, desc: 'Ghi nhận cân nặng & biểu đồ' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-start gap-3.5 ${
                  activeSection === item.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mt-0.5 ${activeSection === item.id ? 'text-white' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-sm">{item.label}</p>
                  <p className={`text-[10px] mt-0.5 truncate ${activeSection === item.id ? 'text-slate-300' : 'text-slate-400'}`}>{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel Content */}
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* SECTION 1: NUTRITION TARGETS */}
          {activeSection === 'nutrition' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Thiết lập Calo & Macro</h3>
                  <p className="text-slate-500 text-sm mt-0.5">Đặt mục tiêu hấp thụ dinh dưỡng tự do hoặc lấy gợi ý thông minh</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    onClick={handleGoalSuggestion}
                    disabled={loadingGoalSuggestion}
                    variant="outline"
                    className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 flex items-center gap-2 h-10 px-4"
                  >
                    {loadingGoalSuggestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                    <span className="font-bold text-xs">Gợi ý theo mục tiêu</span>
                  </Button>
                  <Button 
                    onClick={() => { setIsInBodyModalOpen(true); setNutritionActiveTab('calculator'); }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md flex items-center gap-2 h-10 px-4 border-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="font-bold text-xs">Tính Thông Minh</span>
                  </Button>
                </div>
              </div>

              {/* Sub-tabs for Nutrition panel */}
              <div className="flex gap-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setNutritionActiveTab('current')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    nutritionActiveTab === 'current'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mục Tiêu Hiện Tại
                </button>
                <button
                  onClick={() => setNutritionActiveTab('calculator')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    nutritionActiveTab === 'calculator'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tính Toán Gợi Ý (TDEE / InBody)
                </button>
              </div>

              {nutritionActiveTab === 'current' ? (
                <div className="grid grid-cols-12 gap-6">
                  {/* Stats & edit input */}
                  <div className="col-span-12 lg:col-span-7 space-y-6">
                    <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 border-0 text-white shadow-xl overflow-hidden relative rounded-3xl">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                      <CardContent className="p-8 relative z-10 text-center">
                        <p className="text-white/80 font-bold uppercase tracking-wider text-xs mb-1">Calories Hàng Ngày</p>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-5xl font-black tracking-tight">{macros.dailyCalories.toLocaleString()}</span>
                          <span className="text-lg text-white/80">kcal</span>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Protein */}
                      <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                        <div className="h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Beef className="w-4 h-4 text-rose-500" />
                            <span className="text-xs font-bold text-slate-500">Đạm</span>
                          </div>
                          <div className="text-2xl font-black text-slate-800">{macros.protein}g</div>
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">{proteinPct}%</span>
                            <span className="text-rose-600 font-bold">{Math.round(macros.protein * 4)} cal</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${proteinPct}%` }} />
                          </div>
                        </CardContent>
                      </Card>
                      {/* Carbs */}
                      <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                        <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Wheat className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-500">Tinh Bột</span>
                          </div>
                          <div className="text-2xl font-black text-slate-800">{macros.carb}g</div>
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">{carbPct}%</span>
                            <span className="text-amber-600 font-bold">{Math.round(macros.carb * 4)} cal</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${carbPct}%` }} />
                          </div>
                        </CardContent>
                      </Card>
                      {/* Fat */}
                      <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                        <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Droplet className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-500">Chất Béo</span>
                          </div>
                          <div className="text-2xl font-black text-slate-800">{macros.fat}g</div>
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">{fatPct}%</span>
                            <span className="text-indigo-600 font-bold">{Math.round(macros.fat * 9)} cal</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${fatPct}%` }} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl">
                      <CardContent className="p-6">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-slate-500" />
                          Chỉnh sửa thủ công
                        </h3>
                        <div className="space-y-4">
                          <InputField
                            icon={Flame}
                            label="Calories hàng ngày"
                            type="number"
                            value={macros.dailyCalories}
                            onChange={(e) => setMacros(m => ({...m, dailyCalories: Number(e.target.value)}))}
                          />
                          <div className="grid grid-cols-3 gap-4">
                            <InputField
                              label="Đạm (g)"
                              type="number"
                              value={macros.protein}
                              onChange={(e) => setMacros(m => ({...m, protein: Number(e.target.value)}))}
                              className="text-center font-bold"
                            />
                            <InputField
                              label="Tinh bột (g)"
                              type="number"
                              value={macros.carb}
                              onChange={(e) => setMacros(m => ({...m, carb: Number(e.target.value)}))}
                              className="text-center font-bold"
                            />
                            <InputField
                              label="Chất béo (g)"
                              type="number"
                              value={macros.fat}
                              onChange={(e) => setMacros(m => ({...m, fat: Number(e.target.value)}))}
                              className="text-center font-bold"
                            />
                          </div>
                          <Button
                            onClick={handleSaveMacros}
                            disabled={isSaving}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-5 font-semibold flex items-center justify-center gap-2"
                          >
                            {isSaving ? (
                              <><Loader2 className="h-4 h-4 animate-spin" /> Đang lưu...</>
                            ) : (
                              <><Save className="h-4 w-4" /> Lưu mục tiêu dinh dưỡng</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="col-span-12 lg:col-span-5 space-y-6">
                    <Card className="bg-slate-900 border-0 text-white shadow-lg rounded-3xl">
                      <CardContent className="p-6">
                        <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
                          <Info className="w-4 h-4 text-blue-400" />
                          Hướng Dẫn Nhanh
                        </h3>
                        <div className="space-y-4 text-sm">
                          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                            <Beef className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-extrabold text-white">Đạm (Protein)</p>
                              <p className="text-xs text-slate-300 mt-0.5">1.6g - 2.2g mỗi kg cơ thể để giữ và xây cơ bắp.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                            <Wheat className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-extrabold text-white">Tinh Bột (Carbs)</p>
                              <p className="text-xs text-slate-300 mt-0.5">Nguồn cấp năng lượng chính cho cơ bắp & não bộ.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                            <Droplet className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-extrabold text-white">Chất Béo (Fat)</p>
                              <p className="text-xs text-slate-300 mt-0.5">Hỗ trợ trao đổi chất, hấp thụ vitamin & hormone.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-6 animate-fade-in">
                  <div className="col-span-12 lg:col-span-7">
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                          <Calculator className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className="text-base font-bold text-slate-800">Tính toán chỉ số TDEE & InBody</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Nhập các chỉ số để máy tính đưa ra gợi ý tối ưu.</p>
                          </div>
                        </div>

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
                              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                              <p className="text-emerald-700 font-bold text-sm">Đã tải ảnh InBody!</p>
                              <img src={inBodyPreview} alt="InBody" className="max-h-20 mx-auto rounded-lg shadow" />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                              <p className="text-slate-700 font-bold text-sm">Tải Lên Ảnh InBody (Tùy chọn)</p>
                              <p className="text-xs text-slate-400">Hệ thống hỗ trợ lưu trữ ảnh InBody của bạn</p>
                            </div>
                          )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInBodyImageUpload} className="hidden" />

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <InputField icon={Scale} label="Cân nặng (kg)" type="text" inputMode="decimal" placeholder="70" value={inBodyForm.weight} onChange={(e) => setInBodyForm(f => ({...f, weight: e.target.value.replace(/[^0-9.]/g, '')}))} />
                          <InputField icon={TrendingUp} label="Chiều cao (cm)" type="text" inputMode="numeric" placeholder="175" value={inBodyForm.height} onChange={(e) => setInBodyForm(f => ({...f, height: e.target.value.replace(/[^0-9]/g, '')}))} />
                          <InputField icon={Activity} label="Tuổi" type="text" inputMode="numeric" placeholder="25" value={inBodyForm.age} onChange={(e) => setInBodyForm(f => ({...f, age: e.target.value.replace(/[^0-9]/g, '')}))} />
                          <SelectField label="Giới tính" value={inBodyForm.gender} 
                            onChange={(e) => {
                              const nextGender = e.target.value;
                              setInBodyForm(f => {
                                const nextGoal = (nextGender === 'male' && (f.goal === 'PREGNANT' || f.goal === 'RECOVERY')) ? 'MAINTAIN' : f.goal;
                                return { ...f, gender: nextGender, goal: nextGoal };
                              });
                            }} 
                            options={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }]} />
                          <InputField icon={Heart} label="Tỷ lệ mỡ (%)" type="text" inputMode="decimal" placeholder="18" value={inBodyForm.bodyFat} onChange={(e) => setInBodyForm(f => ({...f, bodyFat: e.target.value.replace(/[^0-9.]/g, '')}))} />
                          <SelectField label="Mức vận động" value={inBodyForm.activityLevel} onChange={(e) => setInBodyForm(f => ({...f, activityLevel: e.target.value}))} options={[
                            { value: 'sedentary', label: 'Ít vận động' },
                            { value: 'light', label: 'Nhẹ (1-3 buổi/tuần)' },
                            { value: 'moderate', label: 'Vừa (3-5 buổi/tuần)' },
                            { value: 'active', label: 'Năng động (6-7 buổi/tuần)' },
                            { value: 'veryActive', label: 'Rất năng động' },
                          ]} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <SelectField label="Mục tiêu của bạn" value={inBodyForm.goal} 
                            onChange={(e) => setInBodyForm(f => ({...f, goal: e.target.value}))} 
                            options={getGoalsByGender(inBodyForm.gender)} />
                          {inBodyForm.goal === 'PREGNANT' ? (
                            <SelectField label="Giai đoạn thai kỳ (Tam cá nguyệt)" value={inBodyForm.pregnancyTrimester} 
                              onChange={(e) => setInBodyForm(f => ({...f, pregnancyTrimester: Number(e.target.value)}))} 
                              options={[
                                { value: 1, label: 'Tam cá nguyệt 1' },
                                { value: 2, label: 'Tam cá nguyệt 2' },
                                { value: 3, label: 'Tam cá nguyệt 3' }
                              ]} />
                          ) : (
                            <div className="hidden sm:block" />
                          )}
                        </div>

                        <Button 
                          onClick={calculateMacrosFromInBody}
                          disabled={isAnalyzing}
                          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-5 font-semibold flex items-center justify-center gap-2 border-0"
                        >
                          {isAnalyzing ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Đang tính toán...</>
                          ) : (
                            <><Zap className="h-4 w-4" /> Tính Toán Ngay</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="col-span-12 lg:col-span-5">
                    {analyzedData ? (
                      <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-white shadow-xl rounded-3xl">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="w-5 h-5 text-white" />
                            <div>
                              <h3 className="text-lg font-bold">Gợi Ý Của Máy Tính</h3>
                              <p className="text-xs text-white/80">Khuyến nghị dành riêng cho cơ thể bạn</p>
                            </div>
                          </div>

                          <div className="text-center py-5 border-b border-white/20 mb-5">
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Calories Khuyến Nghị</p>
                            <div className="flex items-baseline justify-center gap-1.5 mt-1">
                              <span className="text-4xl font-black">{analyzedData.dailyCalories.toLocaleString()}</span>
                              <span className="text-sm text-white/80">kcal/ngày</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5 mb-5">
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                              <Beef className="w-4 h-4 mx-auto mb-1 text-rose-200" />
                              <p className="text-xl font-bold">{analyzedData.protein}g</p>
                              <p className="text-[10px] text-white/80">Đạm</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                              <Wheat className="w-4 h-4 mx-auto mb-1 text-amber-200" />
                              <p className="text-xl font-bold">{analyzedData.carb}g</p>
                              <p className="text-[10px] text-white/80">Tinh Bột</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                              <Droplet className="w-4 h-4 mx-auto mb-1 text-indigo-200" />
                              <p className="text-xl font-bold">{analyzedData.fat}g</p>
                              <p className="text-[10px] text-white/80">Chất Béo</p>
                            </div>
                          </div>

                          <div className="bg-white/10 rounded-xl p-4 text-xs space-y-2 mb-6">
                            <div className="flex justify-between">
                              <span className="text-white/80">Chuyển hóa cơ bản (BMR):</span>
                              <span className="font-semibold">{analyzedData.bmr} kcal</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/80">Nhu cầu năng lượng (TDEE):</span>
                              <span className="font-semibold">{analyzedData.tdee} kcal</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/80">Khối lượng nạc (LBM):</span>
                              <span className="font-semibold">{analyzedData.leanMass} kg</span>
                            </div>
                          </div>

                          <Button 
                            onClick={applyRecommendedMacros}
                            className="w-full bg-white text-emerald-600 hover:bg-white/95 rounded-xl py-5 font-bold flex items-center justify-center gap-2 border-0"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Áp Dụng Gợi Ý
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                        <CardContent className="p-12 text-center">
                          <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h4 className="text-sm font-bold text-slate-600 mb-1">Chưa có kết quả tính toán</h4>
                          <p className="text-xs text-slate-400">Nhập các thông số cơ thể bên trái rồi nhấn tính toán.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: HEALTH & NUTRITION SETTINGS */}
          {activeSection === 'health' && (
            <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl animate-fade-in">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Sức khỏe & Dinh dưỡng</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Quản lý cơ chế dị ứng, mục tiêu sinh hoạt và kênh thông báo</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Thực phẩm gây dị ứng</p>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGEN_OPTIONS.map((opt) => (
                      <button 
                        key={opt.value} 
                        type="button" 
                        onClick={() => toggleAllergen(opt.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                          allergens.includes(opt.value)
                            ? 'bg-rose-100 border-rose-300 text-rose-700'
                            : 'bg-white border-slate-250 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Chế độ ăn ưa thích</label>
                    <select 
                      value={dietPreference} 
                      onChange={(e) => setDietPreference(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium"
                    >
                      {DIET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Mục tiêu hiện tại</label>
                    <select 
                      value={nutritionGoal} 
                      onChange={(e) => setNutritionGoal(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium"
                    >
                      {getGoalsByGender(userGender).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {nutritionGoal === 'PREGNANT' && (
                  <div className="animate-fade-in">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Giai đoạn thai kỳ (Tam cá nguyệt)</label>
                    <select 
                      value={pregnancyTrimester} 
                      onChange={(e) => setPregnancyTrimester(Number(e.target.value))}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium"
                    >
                      {[1, 2, 3].map((t) => <option key={t} value={t}>Tam cá nguyệt {t}</option>)}
                    </select>
                  </div>
                )}

                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postMealRatingOptIn}
                    onChange={(e) => setPostMealRatingOptIn(e.target.checked)}
                    className="rounded border-slate-350 text-blue-600 mt-1"
                  />
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">Nhắc đánh giá sau bữa ăn</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tự động kích hoạt thông báo nhắc nhở đánh giá độ hài lòng khoảng 30 phút sau khi bạn ghi nhận bữa ăn.</p>
                  </div>
                </label>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đăng ký thông báo qua Email</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { checked: hireResultEmail, set: setHireResultEmail, title: 'Kết quả thuê PT', desc: 'Nhận email thông báo khi PT chấp nhận/từ chối.' },
                      { checked: sosResultEmail, set: setSosResultEmail, title: 'Yêu cầu khẩn cấp (SOS)', desc: 'Nhận email khi ticket SOS được xử lý/phân công.' },
                      { checked: weeklySummaryEmail, set: setWeeklySummaryEmail, title: 'Báo cáo tổng kết tuần', desc: 'Nhận email chứa đánh giá chi tiết hàng tuần từ PT.' },
                      { checked: bodyMetricReminder, set: setBodyMetricReminder, title: 'Nhắc ghi cân hàng tuần', desc: 'Thông báo nhắc nếu bạn chưa ghi cân nặng quá 7 ngày.' },
                    ].map((item) => (
                      <label key={item.title} className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => item.set(e.target.checked)}
                          className="rounded border-slate-350 text-blue-600 mt-1"
                        />
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">{item.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <Button 
                    onClick={handleSaveHealth} 
                    disabled={savingHealth} 
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-bold"
                  >
                    {savingHealth ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu cài đặt sức khỏe'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 3: GOALS & PROGRESS TIMELINE */}
          {activeSection === 'progress' && (
            <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl animate-fade-in">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <Scale className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Mục tiêu & Tiến độ</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Lập kế hoạch cân nặng mong muốn và ghi nhận nhật ký cân nặng cơ thể</p>
                  </div>
                </div>

                {showBodyMetricReminder && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Bạn chưa ghi cân nặng hơn 7 ngày. Hãy cập nhật để theo dõi tiến trình tốt nhất!</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Kế hoạch cân nặng mục tiêu</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InputField 
                      label="Cân nặng gốc (baseline) (kg)" 
                      placeholder="Cân baseline (kg)" 
                      type="text"
                      inputMode="decimal"
                      value={goalForm.baselineWeight}
                      onChange={(e) => setGoalForm((f) => ({ ...f, baselineWeight: e.target.value.replace(/[^0-9.]/g, '') }))}
                    />
                    <InputField 
                      label="Cân nặng mục tiêu (kg)" 
                      placeholder="Cân mục tiêu (kg)" 
                      type="text"
                      inputMode="decimal"
                      value={goalForm.targetWeight}
                      onChange={(e) => setGoalForm((f) => ({ ...f, targetWeight: e.target.value.replace(/[^0-9.]/g, '') }))}
                    />
                    <InputField 
                      icon={Calendar}
                      label="Ngày hoàn thành dự kiến" 
                      type="date"
                      value={goalForm.targetDate}
                      onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveGoals} 
                    disabled={savingGoals} 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold py-5"
                  >
                    {savingGoals ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu mục tiêu'}
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Ghi nhận cân nặng hôm nay</p>
                  <div className="flex gap-3">
                    <InputField 
                      placeholder="Cân hôm nay (kg)" 
                      type="text"
                      inputMode="decimal"
                      value={bodyWeight} 
                      onChange={(e) => setBodyWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleLogWeight} 
                      className="rounded-xl h-11 px-5 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold shrink-0"
                    >
                      Lưu chỉ số cân nặng
                    </Button>
                  </div>
                </div>

                {bodyMetricHistory.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Lịch sử đo gần nhất</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {bodyMetricHistory.slice(0, 6).map((m) => (
                        <div key={m.id || m.recordDate} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-450 uppercase">{m.recordDate}</p>
                          <p className="text-lg font-black text-slate-800 mt-0.5">{m.weight} kg</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Biểu đồ tiến trình & Cột mốc</p>
                  <ProgressTimelineCard goals={progressGoals} milestones={milestones} bodyMetrics={bodyMetricHistory} compact={false} />
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* InBody Calculation Modal (Self-contained) */}
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
        <div className="text-center py-6">
          <p className="text-slate-650 mb-4 font-semibold text-sm">Các chỉ số đo thể hình của bạn đã được tối ưu hóa.</p>
          <Button 
            onClick={() => {
              setIsInBodyModalOpen(false);
              setActiveTab('calculator');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 font-bold"
          >
            Đóng để xem bảng tính toán
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const InputField = ({ icon: Icon, label, className = "", ...props }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-slate-650">{label}</label>
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
    <label className="text-sm font-semibold text-slate-650">{label}</label>
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
