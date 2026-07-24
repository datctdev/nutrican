// src/pages/customer/SettingPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../../services/userService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
    Loader2, Bell, Mail, Smartphone, Shield, KeyRound,
    Sparkles, Lock, CheckCircle2, ShieldCheck, Sliders
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function SettingPage() {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State cấu hình thông báo
    const [postMealRatingOptIn, setPostMealRatingOptIn] = useState(true);
    const [hireResultEmail, setHireResultEmail] = useState(true);
    const [weeklySummaryEmail, setWeeklySummaryEmail] = useState(true);
    const [bodyMetricReminder, setBodyMetricReminder] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const profileRes = await userService.getProfile();
            const data = profileRes.data.data;

            const optIn = data.notificationOptIn || {};
            setPostMealRatingOptIn(optIn.postMealRating !== false);
            setHireResultEmail(optIn.hireResultEmail !== false);
            setWeeklySummaryEmail(optIn.weeklySummaryEmail !== false);
            setBodyMetricReminder(optIn.bodyMetricReminder !== false);
        } catch (err) {
            toast.error('Không thể tải cấu hình thông báo hệ thống');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await userService.updatePreferences({
                notificationOptIn: {
                    postMealRating: postMealRatingOptIn,
                    hireResultEmail,
                    weeklySummaryEmail,
                    bodyMetricReminder,
                },
            });
            toast.success('Đã lưu cấu hình cài đặt hệ thống!');
        } catch {
            toast.error('Không thể lưu cấu hình, vui lòng thử lại');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Đang tải tùy chọn cấu hình...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 animate-fade-in space-y-8">

            {/* Header Full-Width */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
                <div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-600 text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> System Configuration
          </span>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Cài đặt hệ thống</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Quản lý tùy chọn thông báo, bản tin email và tiêu chuẩn bảo mật tài khoản Nutrican của bạn.</p>
                </div>

                <Button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-6 px-8 font-extrabold text-sm shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] shrink-0"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                    Lưu tất cả cấu hình
                </Button>
            </div>

            {/* LƯỚI 2 CỘT FULL-WIDTH SANG TRỌNG (GRID 12 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* CỘT TRÁI (7 COLS): THÔNG BÁO & NHẮC NHỞ */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Thông báo ứng dụng</h3>
                                    <p className="text-slate-500 text-xs mt-0.5 font-medium">Tùy chỉnh các lời nhắc tự động trên màn hình thiết bị của bạn</p>
                                </div>
                            </div>

                            {/* Nhắc đánh giá bữa ăn */}
                            <label className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 cursor-pointer transition-all hover:bg-white hover:border-blue-300 hover:shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={postMealRatingOptIn}
                                    onChange={(e) => setPostMealRatingOptIn(e.target.checked)}
                                    className="rounded-lg border-slate-300 text-blue-600 mt-1 w-5 h-5 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                                        <p className="text-base font-extrabold text-slate-800">Nhắc đánh giá sau bữa ăn</p>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                                        Tự động gửi lời nhắc đánh giá cảm giác no và độ hài lòng khoảng 30 phút sau khi bạn ghi nhận bữa ăn trong ngày.
                                    </p>
                                </div>
                            </label>

                            {/* Bản tin Email */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 px-1">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đăng ký bản tin & Thông báo Email</p>
                                </div>

                                <div className="grid grid-cols-1 gap-3.5">
                                    {[
                                        { checked: hireResultEmail, set: setHireResultEmail, title: 'Kết quả thuê PT & Phản hồi hợp đồng', desc: 'Nhận email thông báo tức thì khi Huấn luyện viên chấp nhận hoặc từ chối yêu cầu đồng hành của bạn.' },
                                        { checked: weeklySummaryEmail, set: setWeeklySummaryEmail, title: 'Báo cáo tổng kết tuần chuyên sâu', desc: 'Nhận email định kỳ vào cuối tuần chứa bảng phân tích, đánh giá tiến độ và lời khuyên từ PT.' },
                                        { checked: bodyMetricReminder, set: setBodyMetricReminder, title: 'Nhắc nhở cập nhật cân nặng định kỳ', desc: 'Hệ thống gửi email nhắc nhở nhẹ nhàng nếu bạn quên cập nhật cân nặng sau 7 ngày liên tục.' },
                                    ].map((item) => (
                                        <label key={item.title} className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/60 cursor-pointer transition-all shadow-2xs hover:border-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={(e) => item.set(e.target.checked)}
                                                className="rounded-lg border-slate-300 text-blue-600 mt-1 w-5 h-5 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <div>
                                                <p className="text-base font-extrabold text-slate-800">{item.title}</p>
                                                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CỘT PHẢI (5 COLS): BẢO MẬT & TÀI KHOẢN */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Bảo mật & Quyền riêng tư</h3>
                                    <p className="text-slate-500 text-xs mt-0.5 font-medium">Quản lý mật khẩu và các tiêu chuẩn bảo vệ tài khoản</p>
                                </div>
                            </div>

                            {/* Thông tin đăng nhập */}
                            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-500 shadow-2xs shrink-0">
                                        <KeyRound className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-extrabold text-slate-800">Mật khẩu đăng nhập</p>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">Tài khoản: <span className="font-bold text-slate-700">{user?.email || 'Chưa định danh'}</span></p>
                                    </div>
                                </div>

                                <Button asChild variant="outline" className="w-full rounded-xl border-slate-300 font-bold text-xs hover:bg-white hover:border-amber-500 hover:text-amber-600 transition-colors py-5">
                                    <Link
                                        to={user?.hasPassword === false ? '/set-password' : '/change-password'}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        {user?.hasPassword === false
                                            ? 'Thiết lập mật khẩu'
                                            : 'Đổi mật khẩu'}
                                    </Link>
                                </Button>
                                {user?.hasPassword !== false && (
                                <p className="text-center text-[11px] text-slate-500 font-medium">
                                    Quên mật khẩu?{' '}
                                    <Link to="/forgot-password" className="text-amber-600 hover:text-amber-700 font-bold underline-offset-2 hover:underline">
                                        Đặt lại qua email
                                    </Link>
                                </p>
                                )}
                            </div>

                            {/* Trust Badges */}
                            <div className="space-y-3 pt-2">
                                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3 text-emerald-950 text-xs font-medium leading-relaxed">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-extrabold block text-emerald-900">Mã hóa đầu cuối SSL/TLS</span>
                                        Toàn bộ dữ liệu sức khỏe và nhật ký dinh dưỡng của bạn được mã hóa bảo mật tuyệt đối trên máy chủ Nutrican.
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3 text-blue-950 text-xs font-medium leading-relaxed">
                                    <Sliders className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-extrabold block text-blue-900">Chủ động kiểm soát</span>
                                        Bạn có đầy đủ quyền ngắt kết nối với Huấn luyện viên hoặc xuất lịch sử ăn uống của mình bất kỳ lúc nào.
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}