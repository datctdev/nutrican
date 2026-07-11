import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { toast } from 'sonner';
import { Loader2, ChevronRight, Sparkles } from 'lucide-react';

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

const DIET_PREFS = [
  { value: 'NORMAL', label: 'Ăn bình thường' },
  { value: 'VEGETARIAN', label: 'Ăn chay' },
  { value: 'VEGAN', label: 'Thuần chay' },
  { value: 'KETO', label: 'Keto' },
  { value: 'EAT_CLEAN', label: 'Eat clean' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step1, setStep1] = useState({
    heightCm: '',
    weightKg: '',
    dateOfBirth: '',
    gender: 'male',
  });
  const [dobDisplay, setDobDisplay] = useState('');

  const handleDobChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = val;
    if (val.length > 4) {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length > 2) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setDobDisplay(formatted);
    if (val.length === 8) {
      const day = val.slice(0, 2);
      const month = val.slice(2, 4);
      const year = val.slice(4);
      setStep1((s) => ({ ...s, dateOfBirth: `${year}-${month}-${day}` }));
    } else {
      setStep1((s) => ({ ...s, dateOfBirth: '' }));
    }
  };
  const [step2, setStep2] = useState({
    nutritionGoal: 'MAINTAIN',
    dietPreference: 'NORMAL',
    activityLevel: 'moderate',
    pregnancyTrimester: 1,
  });

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  useEffect(() => {
    profileExtensionsService.getOnboardingStatus()
      .then((res) => {
        const s = res.data?.data;
        if (s?.completed) {
          navigate('/diet', { replace: true });
          return;
        }
        if (s?.step) setStep(s.step);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSkip = async () => {
    try {
      await profileExtensionsService.skipOnboarding();
      navigate('/diet');
    } catch {
      toast.error('Không thể bỏ qua onboarding');
    }
  };

  const submitStep1 = async () => {
    if (!step1.heightCm || !step1.weightKg) {
      toast.error('Nhập chiều cao và cân nặng');
      return;
    }
    if (dobDisplay && dobDisplay.replace(/\D/g, '').length < 8) {
      toast.error('Vui lòng nhập ngày sinh đầy đủ dạng DD/MM/YYYY (8 chữ số)');
      return;
    }
    if (dobDisplay) {
      const digits = dobDisplay.replace(/\D/g, '');
      const d = parseInt(digits.slice(0, 2));
      const m = parseInt(digits.slice(2, 4));
      const y = parseInt(digits.slice(4));
      if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
        toast.error('Ngày sinh không hợp lệ');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await profileExtensionsService.submitOnboarding({
        step: 1,
        heightCm: Number(step1.heightCm),
        weightKg: Number(step1.weightKg),
        dateOfBirth: step1.dateOfBirth || undefined,
        gender: step1.gender,
      });
      setStep(res.data.data?.step || 2);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không lưu được bước 1');
    } finally {
      setSubmitting(false);
    }
  };

  const submitStep2 = async () => {
    setSubmitting(true);
    try {
      const res = await profileExtensionsService.submitOnboarding({
        step: 2,
        nutritionGoal: step2.nutritionGoal,
        dietPreference: step2.dietPreference,
        activityFactor: activityMultipliers[step2.activityLevel],
        pregnancyTrimester: step2.nutritionGoal === 'PREGNANT' ? step2.pregnancyTrimester : null,
        weightKg: Number(step1.weightKg) || undefined,
      });
      setStep(res.data.data?.step || 3);
      toast.success('Đã tạo mục tiêu macro tự động');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không lưu được bước 2');
    } finally {
      setSubmitting(false);
    }
  };

  const finishWithPt = async (wantsPt) => {
    setSubmitting(true);
    try {
      await profileExtensionsService.submitOnboarding({ step: 3, wantsPt });
      navigate(wantsPt ? '/marketplace' : '/diet');
    } catch {
      toast.error('Không hoàn tất onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-slate-200 shadow-lg rounded-3xl">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Bước {step}/3</p>
            <h1 className="text-2xl font-black text-slate-900">Thiết lập hồ sơ NutriCan</h1>
            <p className="text-sm text-slate-500">Giúp theo dõi macro và coaching chính xác hơn</p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800">Thông tin cơ bản</h2>
              <Input placeholder="Chiều cao (cm)" type="number" value={step1.heightCm}
                onChange={(e) => setStep1((s) => ({ ...s, heightCm: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Cân nặng hiện tại (kg)" type="number" value={step1.weightKg}
                onChange={(e) => setStep1((s) => ({ ...s, weightKg: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Ngày sinh (DD/MM/YYYY) ví dụ: 13022004" type="text" value={dobDisplay}
                onChange={handleDobChange} className="rounded-xl" />
              <select value={step1.gender} onChange={(e) => {
                const nextGender = e.target.value;
                setStep1((s) => ({ ...s, gender: nextGender }));
                if (nextGender === 'male' && (step2.nutritionGoal === 'PREGNANT' || step2.nutritionGoal === 'RECOVERY')) {
                  setStep2((s) => ({ ...s, nutritionGoal: 'MAINTAIN' }));
                }
              }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
              <Button onClick={submitStep1} disabled={submitting} className="w-full rounded-xl gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Tiếp tục <ChevronRight className="w-4 h-4" /></>}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" /> Mục tiêu dinh dưỡng
              </h2>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Mục tiêu cân nặng/sức khoẻ</label>
                <select value={step2.nutritionGoal}
                  onChange={(e) => setStep2((s) => ({ ...s, nutritionGoal: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  {getGoalsByGender(step1.gender).map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>

              {step2.nutritionGoal === 'PREGNANT' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-slate-500">Giai đoạn thai kỳ (Tam cá nguyệt)</label>
                  <select value={step2.pregnancyTrimester}
                    onChange={(e) => setStep2((s) => ({ ...s, pregnancyTrimester: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                    {[1, 2, 3].map((t) => <option key={t} value={t}>Tam cá nguyệt {t}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Chế độ ăn ưa thích</label>
                <select value={step2.dietPreference}
                  onChange={(e) => setStep2((s) => ({ ...s, dietPreference: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  {DIET_PREFS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Mức độ vận động hàng ngày</label>
                <select value={step2.activityLevel}
                  onChange={(e) => setStep2((s) => ({ ...s, activityLevel: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  <option value="sedentary">Ít vận động (1.2)</option>
                  <option value="light">Vận động nhẹ (1.375)</option>
                  <option value="moderate">Vận động vừa (1.55)</option>
                  <option value="active">Vận động nhiều (1.725)</option>
                  <option value="veryActive">Vận động rất nặng (1.9)</option>
                </select>
              </div>

              <Button onClick={submitStep2} disabled={submitting} className="w-full rounded-xl gap-2 mt-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Tạo macro & tiếp tục <ChevronRight className="w-4 h-4" /></>}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <h2 className="font-bold text-slate-800">Bạn có muốn tìm PT không?</h2>
              <p className="text-sm text-slate-500">PT giúp duyệt bữa ăn, lên kế hoạch và theo dõi tiến độ</p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => finishWithPt(true)} disabled={submitting} className="rounded-xl">
                  Có — xem Marketplace
                </Button>
                <Button variant="outline" onClick={() => finishWithPt(false)} disabled={submitting} className="rounded-xl">
                  Không — vào Diet Tracker
                </Button>
              </div>
            </div>
          )}

          <button type="button" onClick={handleSkip} className="w-full text-sm text-slate-400 hover:text-slate-600">
            Bỏ qua — làm sau
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
