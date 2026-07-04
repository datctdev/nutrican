// src/pages/auth/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Sparkles, Eye } from 'lucide-react';

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

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', fullName: '', phoneNumber: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const strength = getPasswordStrength(formData.password);

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
    if (!formData.email) newErrors.email = 'Vui lòng nhập Email';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Định dạng Email không hợp lệ';
    if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    else if (formData.password.length < 8) newErrors.password = 'Mật khẩu tối thiểu 8 ký tự';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Phải chứa chữ hoa, chữ thường và chữ số';
    }
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Mật khẩu nhập lại không khớp';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = { email: formData.email, password: formData.password, fullName: formData.fullName, phoneNumber: formData.phoneNumber };
      await register(payload);
      toast.success('Đăng ký thành công!', { description: 'Chào mừng bạn đến với Nutrican PT' });
      navigate('/login');
    } catch (error) {
      toast.error('Đăng ký thất bại', { description: error.response?.data?.message || 'Đã xảy ra lỗi' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden py-12">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-[100px] -z-10" />
      <div className="w-full max-w-[460px] animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg mb-6"><Sparkles className="w-5 h-5 text-white" /></div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Đăng ký tài khoản</h1>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl rounded-3xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input placeholder="Nguyễn Văn A" className="pl-10 py-5 rounded-xl bg-slate-50" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
                </div>
                {errors.fullName && <p className="text-xs text-red-500 font-bold">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Địa chỉ Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input type="email" placeholder="you@example.com" className="pl-10 py-5 rounded-xl bg-slate-50" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                {errors.email && <p className="text-xs text-red-500 font-bold">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Tạo mật khẩu" className="pl-10 pr-10 py-5 rounded-xl bg-slate-50" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Eye className="w-4.5 h-4.5" /></button>
                </div>
                {errors.password && <p className="text-xs text-red-500 font-bold">{errors.password}</p>}
                {formData.password && (
                  <div className="space-y-2 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full flex gap-1">
                        {[1, 2, 3, 4].map((level) => (<div key={level} className={`h-full flex-1 rounded-full ${level <= strength.score ? strength.color : 'bg-transparent'}`} />))}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.textColor}`}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Nhập lại mật khẩu" className="pl-10 pr-10 py-5 rounded-xl bg-slate-50" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 font-bold">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 font-bold mt-4" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng ký tài khoản'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm font-medium text-slate-500">
              Đã có tài khoản? <Link to="/login" className="text-blue-600 font-bold">Đăng nhập</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}