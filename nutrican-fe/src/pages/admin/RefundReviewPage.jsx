import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import { coachingPaymentService } from '../../services/coachingPaymentService';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';

const STATUS_LABEL = {
  PENDING_REVIEW: 'Chờ duyệt',
  AUTO_APPROVED: 'Tự động duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

export default function RefundReviewPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [escrowWallet, setEscrowWallet] = useState(null);
  const [platformWallet, setPlatformWallet] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [refundRes, escrowRes, platformRes] = await Promise.all([
        adminService.getRefunds(),
        coachingPaymentService.getSystemWallet('ESCROW').catch(() => null),
        coachingPaymentService.getSystemWallet('PLATFORM').catch(() => null),
      ]);
      setRefunds(refundRes.data.data || []);
      setEscrowWallet(escrowRes?.data?.data || null);
      setPlatformWallet(platformRes?.data?.data || null);
    } catch {
      toast.error('Không tải được danh sách hoàn tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useWebSocket();

  useEffect(() => {
    const onRefundUpdate = () => load();
    window.addEventListener('refund_update', onRefundUpdate);
    return () => window.removeEventListener('refund_update', onRefundUpdate);
  }, []);

  const review = async (id, action) => {
    setActing(id + action);
    try {
      await adminService.reviewRefund(id, { action, adminNote: action === 'APPROVE' ? 'Approved by admin' : 'Rejected' });
      toast.success(action === 'APPROVE' ? 'Đã duyệt hoàn tiền' : 'Đã từ chối');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Yêu cầu hoàn tiền</h1>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Tiền đang giữ trong escrow</p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {Number(escrowWallet?.lockedBalance || 0).toLocaleString('vi-VN')}đ
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Phí nền tảng đã nhận</p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {Number(platformWallet?.availableBalance || 0).toLocaleString('vi-VN')}đ
            </p>
          </CardContent>
        </Card>
      </div>
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
      ) : refunds.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-500">Không có yêu cầu.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {refunds.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.reason} — {STATUS_LABEL[r.status] || r.status}</p>
                  <p className="text-sm text-slate-500">{r.note || '—'}</p>
                  <p className="text-xs text-slate-400 mt-1">{r.createdAt}</p>
                </div>
                {r.status === 'PENDING_REVIEW' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review(r.id, 'APPROVE')} disabled={!!acting}>Duyệt</Button>
                    <Button size="sm" variant="outline" onClick={() => review(r.id, 'REJECT')} disabled={!!acting}>Từ chối</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
