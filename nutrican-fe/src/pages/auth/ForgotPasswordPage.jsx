// src/pages/auth/ForgotPasswordPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Loader2, Mail, Sparkles, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email format');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || '';
      if (status === 429 || message.toLowerCase().includes('wait')) {
        toast.error('Please wait', { description: 'You can only request one reset email per minute.' });
      } else {
        toast.error('Request failed', { description: 'Something went wrong. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-100/50 to-transparent -z-10" />

      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </Link>
          {sent ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Check your email</h1>
              <p className="text-slate-500 font-medium">
                If an account with <span className="font-semibold text-slate-700">{email}</span> exists, we sent a password reset link.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Forgot password?</h1>
              <p className="text-slate-500 font-medium">
                No worries, we'll send you a reset link.
              </p>
            </>
          )}
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            {sent ? (
              <div className="space-y-6 text-center">
                <p className="text-sm text-slate-500">
                  Click the link in the email to reset your password. The link expires in <strong>15 minutes</strong>.
                </p>
                <Button
                  onClick={() => { setSent(false); setEmail(''); }}
                  variant="outline"
                  className="w-full rounded-xl py-5 font-bold"
                >
                  Resend email
                </Button>
                <div className="pt-2 border-t border-slate-100">
                  <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 py-6 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      />
                    </div>
                    {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-bold shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
