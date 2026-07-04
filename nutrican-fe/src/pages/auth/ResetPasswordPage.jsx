// src/pages/auth/ResetPasswordPage.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Loader2, Lock, Sparkles, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';

const PASSWORD_RULES = [
  { key: 'length', label: 'Tối thiểu 8 ký tự', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'Ít nhất một chữ hoa', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Ít nhất một chữ thường', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'Ít nhất một chữ số', test: (p) => /\d/.test(p) },
];

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: 'Yếu', color: 'bg-red-500', textColor: 'text-red-600' };
  if (passed <= 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500', textColor: 'text-amber-600' };
  if (passed <= 3) return { score: 3, label: 'Khá', color: 'bg-blue-500', textColor: 'text-blue-600' };
  return { score: 4, label: 'Mạnh', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const strength = getPasswordStrength(formData.newPassword);

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

  const validate = () => {
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Mật khẩu tối thiểu 8 ký tự';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Phải chứa chữ hoa, chữ thường và chữ số';
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu nhập lại không khớp';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await authService.resetPassword(token, formData.newPassword);
      toast.success('Đặt lại mật khẩu thành công!', { description: 'Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg && (msg.includes('expired') || msg.includes('Invalid') || msg.includes('used'))) {
        setTokenError(true);
      } else {
        toast.error('Đặt lại mật khẩu thất bại', { description: msg || 'Đã xảy ra lỗi.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-6 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </Link>
          </div>
          <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl rounded-3xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-900">Liên kết không hợp lệ hoặc đã hết hạn</h2>
              <p className="text-slate-500 text-sm">
                Liên kết khôi phục mật khẩu này không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.
              </p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl py-6 font-bold mt-2">
                <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
              </Button>
              <div className="pt-2">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại đăng nhập
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-[100px] -z-10" />

      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Đặt mật khẩu mới</h1>
          <p className="text-slate-500 font-medium">Tạo mật khẩu mạnh cho tài khoản của bạn</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu mới"
                    className="pl-10 pr-10 py-6 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium"
                    value={formData.newPassword}
                    onChange={(e) => { setFormData({ ...formData, newPassword: e.target.value }); setErrors({ ...errors, newPassword: '' }); }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                {formData.newPassword && (
                  <div className="space-y-1 mt-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div key={level} className={`h-full flex-1 rounded-full ${level <= strength.score ? strength.color : 'bg-transparent'}`} />
                        ))}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.textColor}`}>{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {PASSWORD_RULES.map((rule) => (
                        <div key={rule.key} className={`text-[10px] flex items-center gap-1 ${rule.test(formData.newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span>{rule.test(formData.newPassword) ? '\u2713' : '\u2717'}</span>{rule.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {errors.newPassword && <p className="text-xs font-bold text-red-500">{errors.newPassword}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    className="pl-10 py-6 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium"
                    value={formData.confirmPassword}
                    onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }); }}
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs font-bold text-red-500">{errors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 font-bold shadow-md mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang thiết lập lại...</>
                ) : (
                  'Đặt lại mật khẩu'
                )}
              </Button>
            </form>
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
