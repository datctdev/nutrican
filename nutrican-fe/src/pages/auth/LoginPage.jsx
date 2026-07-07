// src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { resolveCustomerHomePath } from '../../services/profileExtensionsService';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Vui lòng nhập Email';
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
      toast.success('Chào mừng quay trở lại!', { description: 'Đăng nhập thành công' });
      const user = response?.data?.data?.user;
      const role = user?.role;
      if (role === 'CUSTOMER') {
        const path = await resolveCustomerHomePath();
        navigate(path);
      } else {
        navigate(user ? getRedirectPath(role) : '/');
      }
    } catch (error) {
      toast.error('Đăng nhập thất bại', { description: error.response?.data?.message || 'Thông tin đăng nhập không hợp lệ' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-100/50 to-transparent -z-10" />

      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Chào mừng quay trở lại</h1>
          <p className="text-slate-500 font-medium">Nhập thông tin của bạn để truy cập tài khoản</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="mb-5">
              <GoogleLoginButton
                isLoading={isGoogleLoading}
                onLoadingChange={setIsGoogleLoading}
              />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">hoặc</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Địa chỉ Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  <Input type="email" placeholder="you@example.com" className="pl-10 py-6 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                {errors.email && <p className="text-xs font-bold text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between"><label className="text-sm font-bold text-slate-700">Mật khẩu</label><Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-800">Quên mật khẩu?</Link></div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10 py-6 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs font-bold text-red-500">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-bold shadow-md mt-2" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang đăng nhập...</> : <>Đăng nhập <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
            <div className="mt-8 text-center text-sm font-medium text-slate-500">
              Chưa có tài khoản? <Link to="/register" className="text-blue-600 font-bold hover:text-blue-800">Tạo tài khoản mới</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}