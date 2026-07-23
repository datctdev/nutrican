// src/pages/auth/SetPasswordPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { resolveCustomerHomePath } from '../../services/profileExtensionsService';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
    Loader2, Lock, ArrowRight, Eye, EyeOff, KeyRound,
    ShieldCheck, Sparkles, Check, X, ShieldAlert, CheckCircle2
} from 'lucide-react';
import logo from '../../assets/nutrican_logo.png';

const PASSWORD_RULES = [
    { key: 'length', label: 'Tối thiểu 8 ký tự', test: (p) => p.length >= 8 },
    { key: 'upper', label: 'Ít nhất 01 chữ hoa (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { key: 'lower', label: 'Ít nhất 01 chữ thường (a-z)', test: (p) => /[a-z]/.test(p) },
    { key: 'number', label: 'Ít nhất 01 chữ số (0-9)', test: (p) => /\d/.test(p) },
];

const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-400' };
    const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
    if (passed <= 1) return { score: 1, label: 'Rất yếu', color: 'bg-red-500', textColor: 'text-red-600' };
    if (passed <= 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500', textColor: 'text-amber-600' };
    if (passed <= 3) return { score: 3, label: 'Khá tốt', color: 'bg-blue-500', textColor: 'text-blue-600' };
    return { score: 4, label: 'Tuyệt đối an toàn', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
};

export default function SetPasswordPage() {
    const { user, setPassword, isLoading } = useAuthStore();
    const navigate = useNavigate();

    const [password, setPasswordValue] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const strength = getPasswordStrength(password);

    const getRedirectPath = (role) => {
        switch (role) {
            case 'ADMIN': return '/admin';
            case 'PT_CERTIFIED':
            case 'PT_FREELANCE': return '/pt';
            default: return '/diet';
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!password) {
            newErrors.password = 'Vui lòng tạo mật khẩu mới';
        } else if (password.length < 8) {
            newErrors.password = 'Mật khẩu phải từ 8 ký tự trở lên';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            newErrors.password = 'Mật khẩu chưa đạt đủ các quy tắc bảo mật bên dưới';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const response = await setPassword(password);
            toast.success('Thiết lập mật khẩu thành công!', {
                description: 'Tài khoản của bạn đã được bảo vệ tuyệt đối.'
            });
            const newUser = response?.data?.data?.user;
            const role = newUser?.role || user?.role;

            if (role === 'CUSTOMER') {
                const path = await resolveCustomerHomePath();
                navigate(path);
            } else {
                navigate(newUser ? getRedirectPath(role) : '/diet');
            }
        } catch (error) {
            toast.error('Thiết lập mật khẩu thất bại', {
                description: error.response?.data?.message || 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
            });
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 font-sans selection:bg-amber-500 selection:text-white overflow-hidden relative">

            {/* CỘT TRÁI: BRANDING & SECURITY VALUE (5 COLS) */}
            <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-bl from-slate-900 via-slate-900 to-amber-950 text-white border-r border-slate-800/80">

                {/* Ambient Glows */}
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

                {/* Logo */}
                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-3 group inline-flex">
                        <img src={logo} alt="Nutrican Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover group-hover:scale-105 transition-transform duration-300 border border-white/10" />
                        <span className="font-black text-2xl tracking-tight text-white">Nutrican<span className="text-amber-500">.</span></span>
                    </Link>
                </div>

                {/* Content Showcase */}
                <div className="relative z-10 my-auto space-y-6 py-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Bảo mật tài khoản tuyệt đối
          </span>
                    <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
                        Thiết lập mật khẩu, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400">
              Chủ động truy cập mọi lúc.
            </span>
                    </h2>

                    <div className="space-y-4 pt-4 border-t border-slate-800/80">
                        <div className="flex items-start gap-3.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 text-amber-400 font-bold text-sm">✓</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200">Đăng nhập đa nền tảng linh hoạt</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Sau khi thiết lập, bạn có thể đăng nhập song song bằng cả Google hoặc Email & Mật khẩu.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400 font-bold text-sm">✓</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200">Mã hóa tiêu chuẩn quốc tế</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Mật khẩu của bạn được băm (hash) bảo mật 1 hướng, tuyệt đối an toàn trên máy chủ Nutrican.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Trust Badge */}
                <div className="relative z-10 flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-2xl backdrop-blur-sm">
                    <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0 p-1 bg-amber-400/10 rounded-lg" />
                    <div className="text-xs">
                        <p className="font-bold text-slate-200">Quyền kiểm soát tài khoản của bạn</p>
                        <p className="text-slate-400 text-[11px]">Dễ dàng thay đổi hoặc cập nhật mật khẩu mới bất kỳ lúc nào tại Cài đặt.</p>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: FORM SET PASSWORD INTERACTIVE (7 COLS) */}
            <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-white min-h-screen relative overflow-y-auto">
                <div className="w-full max-w-[480px] space-y-8 animate-fade-in py-8">

                    {/* Mobile Header Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-2.5 mb-2">
                        <img src={logo} alt="Nutrican Logo" className="w-9 h-9 rounded-xl shadow-md object-cover" />
                        <span className="font-black text-2xl tracking-tight text-slate-900">Nutrican<span className="text-amber-500">.</span></span>
                    </div>

                    {/* Form Header */}
                    <div className="space-y-2 text-center lg:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4 mx-auto lg:mx-0 shadow-sm">
                            <KeyRound className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Tạo mật khẩu bảo mật
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            Hoàn tất bước thiết lập cuối cùng để bảo vệ tài khoản của bạn
                        </p>

                        {/* Email Badge */}
                        {user?.email && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs mt-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Tài khoản: {user.email}
                            </div>
                        )}
                    </div>

                    {/* Form Thiết lập mật khẩu */}
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                Mật khẩu mới <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none transition-colors" />
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Tạo mật khẩu từ 8 ký tự..."
                                    className={`pl-10 pr-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-semibold text-sm transition-all shadow-sm ${errors.password ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30' : ''}`}
                                    value={password}
                                    onChange={(e) => {
                                        setPasswordValue(e.target.value);
                                        if (errors.password) setErrors({ ...errors, password: null });
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-lg"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs font-bold text-red-500 animate-slide-in">{errors.password}</p>}

                            {/* Password Strength Meter & Interactive Rules Checklist */}
                            {password && (
                                <div className="space-y-2.5 mt-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Độ mạnh mật khẩu:</span>
                                        <span className={`text-xs font-black uppercase tracking-wider ${strength.textColor}`}>{strength.label}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full flex gap-1 overflow-hidden">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div key={level} className={`h-full flex-1 transition-all duration-300 ${level <= strength.score ? strength.color : 'bg-transparent'}`} />
                                        ))}
                                    </div>

                                    {/* Real-time Checklist */}
                                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/60">
                                        {PASSWORD_RULES.map((rule) => {
                                            const isPassed = rule.test(password);
                                            return (
                                                <div key={rule.key} className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${isPassed ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {isPassed ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                                                    <span>{rule.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none transition-colors" />
                                <Input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Nhập lại mật khẩu phía trên"
                                    className={`pl-10 pr-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-semibold text-sm transition-all shadow-sm ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500 bg-red-50/30' : ''}`}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-lg"
                                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs font-bold text-red-500 animate-slide-in">{errors.confirmPassword}</p>}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl py-6 font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5 mt-4"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang lưu mật khẩu...</>
                            ) : (
                                <>Hoàn tất & Truy cập ngay <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </form>

                    {/* Footer Note */}
                    <div className="pt-4 border-t border-slate-100 text-center">
                        <p className="text-xs font-semibold text-slate-400">
                            💡 Bạn vẫn có thể đăng nhập nhanh bằng tài khoản Google bất kỳ lúc nào mà không cần nhập mật khẩu này.
                        </p>
                    </div>

                </div>
            </div>

        </div>
    );
}