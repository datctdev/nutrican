import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Loader2, Mail } from 'lucide-react';

export default function CheckEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = useMemo(
    () => location.state?.email || sessionStorage.getItem('pendingVerificationEmail') || '',
    [location.state],
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error('Không tìm thấy email', { description: 'Vui lòng đăng ký lại.' });
      navigate('/register');
      return;
    }
    setIsLoading(true);
    try {
      await authService.resendVerification(email);
      toast.success('Đã gửi lại email xác nhận', {
        description: 'Vui lòng kiểm tra hộp thư (và cả thư mục spam).',
      });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || '';
      if (status === 429 || message.toLowerCase().includes('wait')) {
        toast.error('Vui lòng chờ', {
          description: 'Bạn chỉ có thể yêu cầu gửi lại sau mỗi 1 phút.',
        });
      } else {
        toast.error('Gửi lại thất bại', {
          description: message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-emerald-100/50 to-transparent -z-10" />

      <div className="w-full max-w-[440px] animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Kiểm tra Email</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Chúng tôi đã gửi liên kết xác nhận đến{' '}
            {email ? (
              <span className="font-semibold text-slate-700">{email}</span>
            ) : (
              'email của bạn'
            )}
            . Nhấp vào liên kết trong email để kích hoạt tài khoản.
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardContent className="p-8 space-y-5 text-center">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-600">
              Liên kết có hiệu lực trong <strong>24 giờ</strong>. Nếu không thấy email, hãy kiểm tra thư mục spam.
            </div>

            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full rounded-xl py-5 font-bold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang gửi...
                </>
              ) : (
                'Gửi lại email xác nhận'
              )}
            </Button>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Sau khi xác nhận, bạn có thể đăng nhập bình thường.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
