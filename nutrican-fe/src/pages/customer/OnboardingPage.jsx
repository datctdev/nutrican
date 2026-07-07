import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { toast } from 'sonner';
import { Loader2, ChevronRight, Sparkles } from 'lucide-react';

const GOALS = [
  { value: 'WEIGHT_LOSS', label: 'Giảm cân' },
  { value: 'WEIGHT_GAIN', label: 'Tăng cân' },
  { value: 'MAINTAIN', label: 'Duy trì' },
  { value: 'PREGNANT', label: 'Bà bầu' },
  { value: 'RECOVERY', label: 'Phục hồi' },
];

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
  const [step2, setStep2] = useState({
    nutritionGoal: 'MAINTAIN',
    dietPreference: 'NORMAL',
  });

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
              <Input type="date" value={step1.dateOfBirth}
                onChange={(e) => setStep1((s) => ({ ...s, dateOfBirth: e.target.value }))} className="rounded-xl" />
              <select value={step1.gender} onChange={(e) => setStep1((s) => ({ ...s, gender: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
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
              <select value={step2.nutritionGoal}
                onChange={(e) => setStep2((s) => ({ ...s, nutritionGoal: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <select value={step2.dietPreference}
                onChange={(e) => setStep2((s) => ({ ...s, dietPreference: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {DIET_PREFS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <Button onClick={submitStep2} disabled={submitting} className="w-full rounded-xl gap-2">
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
