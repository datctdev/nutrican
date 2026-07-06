import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Loader2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  let passed = 0;
  if (password.length >= 8) passed++;
  if (/[A-Z]/.test(password)) passed++;
  if (/[a-z]/.test(password)) passed++;
  if (/\d/.test(password)) passed++;
  if (passed <= 1) return { score: 1, label: 'Yếu', color: 'bg-red-500', textColor: 'text-red-600' };
  if (passed <= 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500', textColor: 'text-amber-600' };
  if (passed <= 3) return { score: 3, label: 'Khá', color: 'bg-blue-500', textColor: 'text-blue-600' };
  return { score: 4, label: 'Mạnh', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
};

export default function SetPasswordPage() {
  const { user, setPassword, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const strength = getPasswordStrength(password);

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
    setLocalError('');

    if (!password) {
      setLocalError('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 8) {
      setLocalError('Mật khẩu phải tối thiểu 8 ký tự');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setLocalError('Mật khẩu phải chứa chữ hoa, chữ thường và chữ số');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Mật khẩu nhập lại không khớp');
      return;
    }

    try {
      const response = await setPassword(password);
      toast.success('Thiết lập mật khẩu thành công!', { description: 'Chào mừng bạn đến với Nutrican PT' });
      const newUser = response?.data?.data?.user;
      navigate(newUser ? getRedirectPath(newUser.role) : '/diet');
    } catch (error) {
      toast.error('Thiết lập mật khẩu thất bại', { description: error.response?.data?.message || 'Vui lòng thử lại' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-amber-100/40 to-transparent -z-10" />

      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 mb-6">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Thiết lập mật khẩu</h1>
          <p className="text-slate-500 font-medium">
            Thiết lập mật khẩu để bảo vệ tài khoản của bạn, giúp bạn có thể đăng nhập bằng email và mật khẩu.
          </p>
          {user?.email && (
            <p className="mt-2 text-sm font-semibold text-blue-600">{user.email}</p>
          )}
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tạo mật khẩu mạnh"
                    className="pl-10 pr-10 py-6 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 font-medium"
                    value={password}
                    onChange={(e) => setPasswordValue(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                {password && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div key={level} className={`h-full flex-1 rounded-full transition-all ${level <= strength.score ? strength.color : 'bg-transparent'}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.textColor}`}>{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    className="pl-10 pr-10 py-6 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 font-medium"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {localError && <p className="text-xs font-bold text-red-500">{localError}</p>}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">
                  Mật khẩu phải có tối thiểu 8 ký tự, bao gồm cả chữ hoa, chữ thường và chữ số.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl py-6 font-bold shadow-md mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang thiết lập...</>
                ) : (
                  <>Thiết lập mật khẩu <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm font-medium text-slate-500">
              Bạn vẫn có thể đăng nhập bằng Google bất kỳ lúc nào
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
