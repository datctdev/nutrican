// src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { resolveCustomerHomePath } from '../../services/profileExtensionsService';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import { toast } from 'sonner';
import {
    Loader2, Mail, Lock, ArrowRight, Eye, EyeOff,
    Sparkles, ShieldCheck, Activity, Zap, TrendingUp, CheckCircle2
} from 'lucide-react';
import logo from '../../assets/nutrican_logo.png';

export default function LoginPage() {
    const { login, isLoading } = useAuthStore();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!formData.email) newErrors.email = 'Vui lòng nhập địa chỉ Email';
        if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getRedirectPath = (role) => {
        switch (role) {
            case 'ADMIN': return '/admin';
            case 'PT_CERTIFIED':
            case 'PT_FREELANCE': return '/pt';
            default: return '/diet';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            const response = await login(formData);
            toast.success('Chào mừng quay trở lại!', { description: 'Đăng nhập vào hệ thống thành công.' });
            const user = response?.data?.data?.user;
            const role = user?.role;
            if (role === 'CUSTOMER') {
                const path = await resolveCustomerHomePath();
                navigate(path);
            } else {
                navigate(user ? getRedirectPath(role) : '/');
            }
        } catch (error) {
            toast.error('Đăng nhập thất bại', {
                description: error.response?.data?.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.'
            });
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 font-sans selection:bg-blue-500 selection:text-white overflow-hidden">

            {/* CỘT TRÁI: BRANDING & VISUAL SHOWCASE (7 COLS) */}
            <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-12 xl:p-16 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border-r border-slate-800/80">

                {/* Hiệu ứng ánh sáng nền (Ambient Glows) */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

                {/* Logo & Header */}
                <div className="relative z-10 flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-3 group">
                        <img src={logo} alt="Nutrican Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover group-hover:scale-105 transition-transform duration-300 border border-white/10" />
                        <span className="font-black text-2xl tracking-tight text-white">Nutrican<span className="text-blue-500">.</span></span>
                    </Link>
                </div>

                {/* Khối Visual giữa trang (Floating AI Showcase Cards) */}
                <div className="relative z-10 my-auto max-w-lg space-y-8 py-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide uppercase shadow-inner">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                            Nền tảng Dinh dưỡng & Huấn luyện AI
                        </div>
                        <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
                            Kết nối chuyên gia, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                Tối ưu hóa vóc dáng bằng AI.
              </span>
                        </h2>
                        <p className="text-slate-400 text-sm xl:text-base font-medium leading-relaxed">
                            Truy cập ngay để theo dõi tiến độ độ chính xác 98%, nhận thực đơn cá nhân hóa và tương tác trực tiếp cùng huấn luyện viên của bạn.
                        </p>
                    </div>

                    {/* Thẻ Widget mô phỏng Dashboard (SaaS Element) */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 space-y-3 shadow-xl hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-xs font-bold uppercase tracking-wider">AI Scanner 2.0</span>
                                <Zap className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">98.5%</span>
                                <span className="text-xs font-bold text-emerald-400">Chính xác</span>
                            </div>
                            <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full w-[98%]" />
                            </div>
                        </div>

                        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 space-y-3 shadow-xl hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-xs font-bold uppercase tracking-wider">PT Coaching</span>
                                <Activity className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">24/7</span>
                                <span className="text-xs font-bold text-blue-400">Kết nối</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold pt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                Kiểm duyệt thực đơn mỗi ngày
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-semibold border-t border-slate-800/80 pt-6">
                    <p>© 2026 Nutrican PT Platform. All rights reserved.</p>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Bảo mật dữ liệu sức khỏe tuyệt đối</span>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: LOGIN FORM INTERACTIVE (5 COLS) */}
            <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-12 bg-white min-h-screen relative">
                <div className="w-full max-w-[400px] space-y-8 animate-fade-in">

                    {/* Mobile Header Logo (Chỉ hiện trên màn hình nhỏ) */}
                    <div className="lg:hidden flex items-center justify-center gap-2.5 mb-6">
                        <img src={logo} alt="Nutrican Logo" className="w-9 h-9 rounded-xl shadow-md object-cover" />
                        <span className="font-black text-2xl tracking-tight text-slate-900">Nutrican<span className="text-blue-600">.</span></span>
                    </div>

                    {/* Tiêu đề Form */}
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Đăng nhập tài khoản
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            Nhập thông tin truy cập để tiếp tục hành trình của bạn
                        </p>
                    </div>

                    {/* Khối Google Login */}
                    <div className="space-y-4">
                        <GoogleLoginButton
                            isLoading={isGoogleLoading}
                            onLoadingChange={setIsGoogleLoading}
                        />

                        <div className="relative flex items-center justify-center my-6">
                            <div className="border-t border-slate-200 w-full" />
                            <span className="bg-white px-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 absolute">
                Hoặc bằng Email
              </span>
                        </div>
                    </div>

                    {/* Form chính */}
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                        {/* Input Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none transition-colors group-focus-within:text-blue-600" />
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    className={`pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-semibold text-sm transition-all shadow-sm ${errors.email ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30' : ''}`}
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        if (errors.email) setErrors({ ...errors, email: null });
                                    }}
                                />
                            </div>
                            {errors.email && <p className="text-xs font-bold text-red-500 animate-slide-in">{errors.email}</p>}
                        </div>

                        {/* Input Password */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                    Mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none transition-colors" />
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••••••"
                                    className={`pl-10 pr-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-semibold text-sm transition-all shadow-sm ${errors.password ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30' : ''}`}
                                    value={formData.password}
                                    onChange={(e) => {
                                        setFormData({ ...formData, password: e.target.value });
                                        if (errors.password) setErrors({ ...errors, password: null });
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-lg"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs font-bold text-red-500 animate-slide-in">{errors.password}</p>}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full bg-slate-900 hover:bg-blue-600 text-white rounded-xl py-6 font-extrabold text-sm shadow-lg shadow-slate-900/10 hover:shadow-blue-600/25 transition-all duration-300 hover:-translate-y-0.5 mt-2"
                            disabled={isLoading || isGoogleLoading}
                        >
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang kiểm tra...</>
                            ) : (
                                <>Đăng nhập vào hệ thống <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </form>

                    {/* Footer Navigation */}
                    <p className="text-center text-sm font-semibold text-slate-500 pt-4 border-t border-slate-100">
                        Chưa có tài khoản Nutrican?{' '}
                        <Link to="/register" className="text-blue-600 font-extrabold hover:text-blue-700 hover:underline transition-all inline-flex items-center gap-0.5 ml-1">
                            Tạo tài khoản mới
                        </Link>
                    </p>

                </div>
            </div>

        </div>
    );
}