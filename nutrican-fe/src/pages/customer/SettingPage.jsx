import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../../services/userService';
import { Card, CardContent } from '../../components/ui/card';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Loader2, Settings, Bell, Mail, Smartphone, ChevronRight, Target } from 'lucide-react';

export default function SettingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification Preferences States
  const [postMealRatingOptIn, setPostMealRatingOptIn] = useState(true);
  const [hireResultEmail, setHireResultEmail] = useState(true);
  const [weeklySummaryEmail, setWeeklySummaryEmail] = useState(true);
  const [bodyMetricReminder, setBodyMetricReminder] = useState(true);

  // Keep existing preferences to not overwrite them when saving only notifications
  const [dietPreference, setDietPreference] = useState('NORMAL');
  const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
  const [pregnancyTrimester, setPregnancyTrimester] = useState(1);
  const [targetWeight, setTargetWeight] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');
  const [hasActivePt, setHasActivePt] = useState(false);
  const [activityLevel, setActivityLevel] = useState('MODERATE');
  const [initialNutritionGoal, setInitialNutritionGoal] = useState('MAINTAIN');
  const [initialPregnancyTrimester, setInitialPregnancyTrimester] = useState(1);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const [profileRes, allergyRes, goalsRes, ptRes] = await Promise.all([
        userService.getProfile(),
        userService.getAllergies().catch(() => ({ data: { data: [] } })),
        profileExtensionsService.getGoals().catch(() => ({ data: { data: null } })),
        profileExtensionsService.hasActivePt().catch(() => ({ data: { data: { hasActivePt: false } } })),
      ]);
      const data = profileRes.data.data;
      
      setAllergyNotes(allergyRes.data.data?.allergyNotes || data.allergyNotes || '');
      setHasActivePt(Boolean(ptRes.data?.data?.hasActivePt));

      if (data.dietPreference) setDietPreference(data.dietPreference);
      if (data.nutritionGoal) {
        setNutritionGoal(data.nutritionGoal);
        setInitialNutritionGoal(data.nutritionGoal);
      }
      if (data.pregnancyTrimester) {
        setPregnancyTrimester(data.pregnancyTrimester);
        setInitialPregnancyTrimester(data.pregnancyTrimester);
      }
      if (data.activityLevel) setActivityLevel(data.activityLevel);

      if (goalsRes.data?.data) {
        setTargetWeight(goalsRes.data.data.targetWeight || '');
      }

      const optIn = data.notificationOptIn || {};
      setPostMealRatingOptIn(optIn.postMealRating !== false);
      setHireResultEmail(optIn.hireResultEmail !== false);
      setWeeklySummaryEmail(optIn.weeklySummaryEmail !== false);
      setBodyMetricReminder(optIn.bodyMetricReminder !== false);
    } catch (err) {
      toast.error('Không thể tải cấu hình thông báo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const macroFieldsChanged =
      nutritionGoal !== initialNutritionGoal
      || (nutritionGoal === 'PREGNANT' && pregnancyTrimester !== initialPregnancyTrimester);

    try {
      await userService.updatePreferences({
        dietPreference,
        nutritionGoal,
        pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
        notificationOptIn: {
          postMealRating: postMealRatingOptIn,
          hireResultEmail,
          weeklySummaryEmail,
          bodyMetricReminder,
        },
      });
      await userService.updateAllergies({ allergyNotes });

      if (targetWeight) {
        await profileExtensionsService.saveGoals({
          nutritionGoal,
          targetWeight: Number(targetWeight),
          trimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null
        });
      }

      if (!hasActivePt && macroFieldsChanged) {
        try {
          const res = await userService.recalculateMacros({
            activityLevel,
            nutritionGoal,
            pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
          });
          const kcal = res.data?.data?.macros?.dailyCalories;
          window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
          setInitialNutritionGoal(nutritionGoal);
          setInitialPregnancyTrimester(pregnancyTrimester);
          if (kcal != null) {
            toast.success(`Đã lưu — mục tiêu calo: ${Math.round(Number(kcal))} kcal`);
          } else {
            toast.success('Đã lưu cấu hình thành công');
          }
        } catch {
          toast.warning('Đã lưu tuỳ chọn, nhưng chưa cập nhật lại mục tiêu calo — vui lòng thử lại');
        }
      } else {
        toast.success('Đã lưu cấu hình thành công');
      }
    } catch {
      toast.error('Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cài đặt</h1>
        <p className="text-slate-500 mt-1 font-medium">Quản lý cấu hình thông báo và các tùy chọn hệ thống.</p>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl animate-fade-in">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Bell className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Thông báo hệ thống</h3>
              <p className="text-slate-500 text-xs mt-0.5">Tùy chỉnh cách bạn nhận cập nhật từ NutriCan</p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer transition-colors hover:bg-slate-50">
            <input
              type="checkbox"
              checked={postMealRatingOptIn}
              onChange={(e) => setPostMealRatingOptIn(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-extrabold text-slate-800">Nhắc đánh giá sau bữa ăn</p>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tự động kích hoạt thông báo nhắc nhở đánh giá độ hài lòng khoảng 30 phút sau khi bạn ghi nhận bữa ăn.
              </p>
            </div>
          </label>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đăng ký thông báo qua Email</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { checked: hireResultEmail, set: setHireResultEmail, title: 'Kết quả thuê PT', desc: 'Nhận email thông báo khi PT chấp nhận/từ chối.' },
                { checked: weeklySummaryEmail, set: setWeeklySummaryEmail, title: 'Báo cáo tổng kết tuần', desc: 'Nhận email chứa đánh giá chi tiết hàng tuần từ PT.' },
                { checked: bodyMetricReminder, set: setBodyMetricReminder, title: 'Nhắc ghi cân hàng tuần', desc: 'Thông báo nhắc nếu bạn chưa ghi cân nặng quá 7 ngày.' },
              ].map((item) => (
                <label key={item.title} className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50/50 cursor-pointer transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.set(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 mt-1"
                  />
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl animate-fade-in mt-6">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Settings className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sức khoẻ & Dinh dưỡng</h3>
              <p className="text-slate-500 text-xs mt-0.5">Tùy chỉnh chế độ ăn và ghi chú dị ứng</p>
            </div>
          </div>

          <Link
            to="/macro-targets"
            className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-800">Điều chỉnh macro & mức vận động</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Đổi mức vận động (TDEE) và tính lại calo/P/C/F tại trang Tiến độ
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          </Link>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Chế độ ăn ưa thích</label>
              <select
                value={dietPreference}
                onChange={(e) => setDietPreference(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium"
              >
                {[
                  { value: 'NORMAL', label: 'Ăn thường' },
                  { value: 'VEGETARIAN', label: 'Ăn chay' },
                  { value: 'VEGAN', label: 'Thuần chay' },
                  { value: 'KETO', label: 'Keto' },
                  { value: 'EAT_CLEAN', label: 'Eat clean' },
                ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Mục tiêu dinh dưỡng</label>
              {hasActivePt && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2 font-medium">
                  Mục tiêu dinh dưỡng đang do PT quản lý — liên hệ PT để thay đổi
                </p>
              )}
              <select
                value={nutritionGoal}
                onChange={(e) => setNutritionGoal(e.target.value)}
                disabled={hasActivePt}
                className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium ${hasActivePt ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
              >
                {[
                  { value: 'WEIGHT_LOSS', label: 'Giảm cân' },
                  { value: 'WEIGHT_GAIN', label: 'Tăng cân' },
                  { value: 'MAINTAIN', label: 'Duy trì' },
                  { value: 'PREGNANT', label: 'Mang thai' },
                  { value: 'RECOVERY', label: 'Phục hồi' },
                ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Cân nặng mục tiêu (kg)</label>
              <input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="Ví dụ: 65.5"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {nutritionGoal === 'PREGNANT' && (
              <div className="animate-fade-in">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Giai đoạn thai kỳ</label>
                <select
                  value={pregnancyTrimester}
                  onChange={(e) => setPregnancyTrimester(Number(e.target.value))}
                  disabled={hasActivePt}
                  className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium ${hasActivePt ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
                >
                  <option value={1}>3 tháng đầu (Trimester 1)</option>
                  <option value={2}>3 tháng giữa (Trimester 2)</option>
                  <option value={3}>3 tháng cuối (Trimester 3)</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Ghi chú dị ứng</label>
              <textarea
                value={allergyNotes}
                onChange={(e) => setAllergyNotes(e.target.value)}
                placeholder="Ví dụ: Dị ứng đậu phộng, hải sản..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 font-medium min-h-[100px]"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-5 px-8 font-bold min-w-[150px]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu thay đổi'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
