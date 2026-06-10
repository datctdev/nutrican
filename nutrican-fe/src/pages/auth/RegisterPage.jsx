// src/pages/auth/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Phone, ArrowRight, UserCircle, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '', phoneNumber: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register(formData);
      toast.success('Account created!', { description: 'Welcome to Nutrican PT' });
      navigate('/login');
    } catch (error) {
      toast.error('Registration failed', { description: error.response?.data?.message || 'Something went wrong' });
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-100/50 to-transparent rounded-full blur-[100px] -z-10" />

      <div className="w-full max-w-[460px] animate-fade-in py-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Create Account</h1>
          <p className="text-slate-500 font-medium">Join Nutrican and transform your nutrition</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input placeholder="John Doe" className="pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium" value={formData.fullName} onChange={handleChange('fullName')} />
                </div>
                {errors.fullName && <p className="text-xs font-bold text-red-500">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input type="email" placeholder="you@example.com" className="pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium" value={formData.email} onChange={handleChange('email')} />
                </div>
                {errors.email && <p className="text-xs font-bold text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input type="password" placeholder="Min 6 characters" className="pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium" value={formData.password} onChange={handleChange('password')} />
                </div>
                {errors.password && <p className="text-xs font-bold text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Phone <span className="text-slate-400 font-normal">(Optional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input placeholder="+84..." className="pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium" value={formData.phoneNumber} onChange={handleChange('phoneNumber')} />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base font-bold shadow-md mt-4 transition-all" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...</> : <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>

            <div className="mt-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500 font-semibold">Or</span></div>
              </div>
              
              <Link to="/register/pt">
                <Button variant="outline" className="w-full bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 rounded-xl py-5 font-bold transition-all">
                  <UserCircle className="w-5 h-5 mr-2 text-slate-400" /> Apply as Personal Trainer
                </Button>
              </Link>

              <div className="text-center text-sm font-medium text-slate-500 pt-2">
                Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:text-blue-800 transition-colors">Sign in</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}