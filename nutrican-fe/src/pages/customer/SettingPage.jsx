import { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Loader2, Settings, Bell, Mail, Smartphone } from 'lucide-react';

export default function SettingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification Preferences States
  const [postMealRatingOptIn, setPostMealRatingOptIn] = useState(true);
  const [hireResultEmail, setHireResultEmail] = useState(true);
  const [sosResultEmail, setSosResultEmail] = useState(true);
  const [weeklySummaryEmail, setWeeklySummaryEmail] = useState(true);
  const [bodyMetricReminder, setBodyMetricReminder] = useState(true);

  // Keep existing preferences to not overwrite them when saving only notifications
  const [dietPreference, setDietPreference] = useState('NORMAL');
  const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
  const [pregnancyTrimester, setPregnancyTrimester] = useState(1);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const profileRes = await userService.getProfile();
      const data = profileRes.data.data;

      if (data.dietPreference) setDietPreference(data.dietPreference);
      if (data.nutritionGoal) setNutritionGoal(data.nutritionGoal);
      if (data.pregnancyTrimester) setPregnancyTrimester(data.pregnancyTrimester);

      const optIn = data.notificationOptIn || {};
      setPostMealRatingOptIn(optIn.postMealRating !== false);
      setHireResultEmail(optIn.hireResultEmail !== false);
      setSosResultEmail(optIn.sosResultEmail !== false);
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
    try {
      await userService.updatePreferences({
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
      });
      toast.success('Đã lưu cấu hình thông báo thành công');
    } catch {
      toast.error('Không thể lưu cấu hình thông báo');
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
                { checked: sosResultEmail, set: setSosResultEmail, title: 'Yêu cầu khẩn cấp (SOS)', desc: 'Nhận email khi ticket SOS được xử lý/phân công.' },
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
