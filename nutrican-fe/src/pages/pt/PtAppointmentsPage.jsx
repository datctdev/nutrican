import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { appointmentService } from '../../services/appointmentService';
import { workspaceService } from '../../services/workspaceService';
import SessionDisputeThread from '../../components/coaching/SessionDisputeThread';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';
import CoachingTimetable, { mergeTimetableSources } from '../../components/coaching/CoachingTimetable';
import useWebSocket from '../../hooks/useWebSocket';

export default function PtAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [disputeActing, setDisputeActing] = useState(null);

  useWebSocket();

  const fetchAppts = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, clientsRes, disputesRes] = await Promise.all([
        appointmentService.getPtUpcoming(),
        workspaceService.getClients({ page: 0, size: 100, status: 'ACTIVE' }).catch(() => null),
        workspaceService.getSessionDisputes({ status: 'PENDING' }).catch(() => null),
      ]);
      setAppointments(apptRes.data.data || []);
      const page = clientsRes?.data?.data;
      const list = page?.content || page?.items || (Array.isArray(page) ? page : []);
      setClients(list);
      setDisputes(disputesRes?.data?.data || []);
    } catch {
      toast.error('Không thể tải lịch hẹn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchAppts(), 0);
    const onUpdate = () => fetchAppts();
    window.addEventListener('session_confirm_updated', onUpdate);
    return () => {
      clearTimeout(t);
      window.removeEventListener('session_confirm_updated', onUpdate);
    };
  }, [fetchAppts]);

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

  const handleMarkDone = async (sessionId) => {
    setActingId(sessionId);
    try {
      await workspaceService.markSessionDone(sessionId);
      toast.success('Đã gửi xác nhận buổi tập cho khách');
      fetchAppts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xác nhận buổi');
    } finally {
      setActingId(null);
    }
  };

  const handleDisputeReply = async (disputeId, body) => {
    setDisputeActing(disputeId);
    try {
      await workspaceService.replySessionDispute(disputeId, { body });
      toast.success('Đã gửi phản hồi tranh chấp');
      const res = await workspaceService.getSessionDisputes({ status: 'PENDING' });
      setDisputes(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi phản hồi thất bại');
    } finally {
      setDisputeActing(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch buổi tập</h1>
          <p className="text-sm text-slate-500">
            Nút «Đã dạy xong» chỉ bật khi đã tới giờ buổi. Nếu khách không đồng ý, phản hồi ngay bên dưới.
          </p>
        </div>
      </div>

      {disputes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-rose-700">
            Tranh chấp đang mở ({disputes.length})
          </h2>
          {disputes.map((d) => (
            <SessionDisputeThread
              key={d.id}
              dispute={d}
              viewerRole="pt"
              actingId={disputeActing}
              onSendMessage={handleDisputeReply}
            />
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          ) : (
            <CoachingTimetable
              items={items}
              emptyText="Tuần này chưa có lịch offline."
              role="pt"
              roleLabel="Học viên"
              cancellingId={cancellingId}
              actingId={actingId}
              onCancel={handleCancel}
              onMarkDone={handleMarkDone}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
