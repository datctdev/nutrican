// src/pages/pt/PtAppointmentsPage.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { appointmentService } from '../../services/appointmentService';
import { toast } from 'sonner';
import { Loader2, Calendar, Check, X } from 'lucide-react';

const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-red-100 text-red-700',
};

export default function PtAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const fetchAppts = async () => {
    setLoading(true);
    try {
      const res = await appointmentService.getPtUpcoming();
      setAppointments(res.data.data || []);
    } catch {
      toast.error('Không thể tải lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    const t = setTimeout(() => fetchAppts(), 0); 
    return () => clearTimeout(t); 
  }, []);

  const handleAction = async (id, action) => {
    setActing(id + action);
    try {
      await appointmentService.updateAppointment(id, action);
      toast.success(action === 'CONFIRM' ? 'Đã xác nhận lịch' : 'Đã hủy lịch');
      fetchAppts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch hẹn</h1>
          <p className="text-sm text-slate-500">Xác nhận hoặc hủy lịch với học viên</p>
        </div>
      </div>

      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
      ) : appointments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-500">Chưa có lịch hẹn sắp tới.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    {new Date(a.startTime).toLocaleString('vi-VN')}
                    {' — '}
                    {new Date(a.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {a.note && <p className="text-sm text-slate-500 mt-1">{a.note}</p>}
                  <span className={`inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] || ''}`}>
                    {a.status}
                  </span>
                </div>
                {a.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAction(a.id, 'CONFIRM')} disabled={!!acting}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                      {acting === a.id + 'CONFIRM' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Xác nhận
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(a.id, 'CANCEL')} disabled={!!acting}
                      className="gap-1 text-red-600">
                      <X className="w-4 h-4" /> Hủy
                    </Button>
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
