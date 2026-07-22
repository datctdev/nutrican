import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { appointmentService } from '../../services/appointmentService';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';
import { Loader2, Calendar, Plus } from 'lucide-react';
import Modal from '../../components/common/Modal';
import CoachingTimetable, { mergeTimetableSources } from '../../components/coaching/CoachingTimetable';

function toLocalInputValue(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value) {
  if (!value) return null;
  // Treat as local wall-clock (no Z) — matches BE LocalDateTime
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`;
}

export default function PtAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMappingId, setAddMappingId] = useState('');
  const [addAt, setAddAt] = useState('');
  const [adding, setAdding] = useState(false);

  const offlineClients = useMemo(
    () => (clients || []).filter((c) => c.selectedTrainingMode === 'OFFLINE' && c.mappingId),
    [clients],
  );
  const hasOffline = offlineClients.length > 0 || (appointments || []).some((a) => a.type === 'OFFLINE');

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
      if (c.selectedTrainingMode !== 'OFFLINE') return;
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
      const res = await appointmentService.updateAppointment(id, 'CANCEL');
      const msg = res?.data?.message;
      toast.success(msg || 'Đã hủy buổi');
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

  const openReschedule = (item) => {
    setRescheduleItem(item);
    setRescheduleAt(toLocalInputValue(item.start));
  };

  const submitReschedule = async () => {
    const id = rescheduleItem?.appointmentId || rescheduleItem?.id;
    const startTime = fromLocalInputValue(rescheduleAt);
    if (!id || !startTime) {
      toast.error('Chọn thời gian hợp lệ');
      return;
    }
    setRescheduling(true);
    try {
      const res = await appointmentService.reschedule(id, startTime);
      toast.success(res?.data?.message || 'Đã đổi lịch buổi tập');
      setRescheduleItem(null);
      fetchAppts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không đổi được lịch');
    } finally {
      setRescheduling(false);
    }
  };

  const submitAdd = async () => {
    const startTime = fromLocalInputValue(addAt);
    if (!addMappingId || !startTime) {
      toast.error('Chọn học viên và thời gian');
      return;
    }
    setAdding(true);
    try {
      const res = await appointmentService.addSession(addMappingId, startTime);
      toast.success(res?.data?.message || 'Đã thêm buổi tập');
      setAddOpen(false);
      setAddMappingId('');
      setAddAt('');
      fetchAppts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thêm được buổi');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lịch buổi tập offline</h1>
            <p className="text-sm text-slate-500 mt-0.5 max-w-xl">
              Đổi lịch hoặc thêm buổi khi còn tiền escrow. «Đã dạy xong» bật khi tới giờ.
              Hủy buổi chờ dạy (≥48h phía HV): hoàn ví; hủy sát giờ: không hoàn.
            </p>
          </div>
        </div>
        {hasOffline && offlineClients.length > 0 && (
          <Button
            onClick={() => setAddOpen(true)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-4 shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Thêm buổi
          </Button>
        )}
      </div>

      {!loading && !hasOffline ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="p-10 text-center space-y-2">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Trang này dành cho coaching offline</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Bạn chưa có học viên offline ACTIVE. Với coaching online, quản lý qua Tin nhắn và Thực đơn tuần.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200/80 shadow-md shadow-slate-200/40 rounded-3xl overflow-hidden">
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
                onReschedule={openReschedule}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={!!rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        title="Đổi lịch buổi tập"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Chọn khung giờ trong lịch nhận học viên của bạn. Không đụng tới tiền escrow.
          </p>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Thời gian mới</label>
          <input
            type="datetime-local"
            value={rescheduleAt}
            onChange={(e) => setRescheduleAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <Button
            disabled={rescheduling}
            onClick={submitReschedule}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold"
          >
            {rescheduling ? 'Đang đổi...' : 'Xác nhận đổi lịch'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Thêm buổi offline" size="sm">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Chỉ thêm khi escrow còn đủ ít nhất 1 buổi chưa gán. Nếu thiếu, nhờ học viên mua thêm buổi.
          </p>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Học viên</label>
          <select
            value={addMappingId}
            onChange={(e) => setAddMappingId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="">— Chọn —</option>
            {offlineClients.map((c) => (
              <option key={c.mappingId} value={c.mappingId}>
                {c.clientName}
              </option>
            ))}
          </select>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Thời gian</label>
          <input
            type="datetime-local"
            value={addAt}
            onChange={(e) => setAddAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <Button
            disabled={adding}
            onClick={submitAdd}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold"
          >
            {adding ? 'Đang thêm...' : 'Thêm buổi'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
