import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Liên kết xác nhận không hợp lệ hoặc thiếu token.');
        return;
      }
      try {
        const res = await authService.verifyEmail(token);
        if (cancelled) return;
        setStatus('success');
        setMessage(res.data?.message || 'Email đã được xác nhận. Bạn có thể đăng nhập.');
        toast.success('Xác nhận email thành công', {
          description: 'Chuyển đến trang đăng nhập...',
        });
        try {
          sessionStorage.removeItem('pendingVerificationEmail');
        } catch {
          // ignore
        }
        setTimeout(() => navigate('/login'), 1800);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          err.response?.data?.message
            || 'Liên kết xác nhận không hợp lệ hoặc đã hết hạn.',
        );
      }
    };

    run();
    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-100/50 to-transparent -z-10" />

      <div className="w-full max-w-[420px] animate-fade-in">
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-5">
            {status === 'loading' && (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                <h1 className="text-2xl font-black text-slate-900">Đang xác nhận email...</h1>
                <p className="text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-black text-slate-900">Email đã xác nhận</h1>
                <p className="text-sm text-slate-500">{message}</p>
                <Button
                  className="w-full rounded-xl py-5 font-bold bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={() => navigate('/login')}
                >
                  Đăng nhập ngay
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-rose-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-black text-slate-900">Xác nhận thất bại</h1>
                <p className="text-sm text-slate-500">{message}</p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl py-5 font-bold"
                    onClick={() => navigate('/check-email')}
                  >
                    Gửi lại email xác nhận
                  </Button>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại đăng nhập
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
