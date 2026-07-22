import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { appointmentService } from '../../services/appointmentService';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';
import CoachingTimetable, { mergeTimetableSources } from '../../components/coaching/CoachingTimetable';

export default function PtAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchAppts = async () => {
    setLoading(true);
    try {
      const [apptRes, clientsRes] = await Promise.all([
        appointmentService.getPtUpcoming(),
        workspaceService.getClients({ page: 0, size: 100, status: 'ACTIVE' }).catch(() => null),
      ]);
      setAppointments(apptRes.data.data || []);
      const page = clientsRes?.data?.data;
      const list = page?.content || page?.items || (Array.isArray(page) ? page : []);
      setClients(list);
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

  const items = useMemo(() => {
    const nameByClientId = {};
    const sessions = [];
    clients.forEach((c) => {
      if (c.clientId && c.clientName) nameByClientId[c.clientId] = c.clientName;
      (c.sessions || []).forEach((s) => {
        sessions.push({ ...s, counterpartName: c.clientName });
      });
    });
    const enrichedAppts = appointments.map((a) => ({
      ...a,
      counterpartName: nameByClientId[a.clientId] || 'Học viên',
    }));
    return mergeTimetableSources({ sessions, appointments: enrichedAppts });
  }, [appointments, clients]);

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      await appointmentService.updateAppointment(id, 'CANCEL');
      toast.success('Đã hủy lịch — hoàn tiền buổi chưa dạy cho học viên (nếu còn escrow)');
      fetchAppts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hủy thất bại');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch buổi tập</h1>
          <p className="text-sm text-slate-500">
            Thời khóa biểu offline — nhấn vào buổi để xem chi tiết. Buổi đã chốt sau thanh toán, chỉ hủy khi cần.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          ) : (
            <CoachingTimetable
              items={items}
              emptyText="Tuần này chưa có lịch offline."
              roleLabel="Học viên"
              cancellingId={cancellingId}
              onCancel={handleCancel}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
