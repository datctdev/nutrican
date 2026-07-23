import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { appointmentService } from '../../services/appointmentService';
import { workspaceService } from '../../services/workspaceService';
import { userService } from '../../services/userService';
import { marketplaceService } from '../../services/marketplaceService';
import SessionDisputeThread from '../../components/coaching/SessionDisputeThread';
import { toast } from 'sonner';
import { Loader2, Calendar, Plus } from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import CoachingTimetable, { mergeTimetableSources } from '../../components/coaching/CoachingTimetable';
import PtWeeklyCalendarPicker from '../../components/pt/PtWeeklyCalendarPicker';
import { nowInVn } from '../customer/components/dietUtils';
import { addWeeks, getWeekStart, sessionMinutesFromRateUnit as slotMinutes, slotsOverlap, isSlotOccupied, toLocalDateTimeIso } from '../../utils/offlineHireSlots';

const DAY_VI = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };

function toLocalInputValue(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`;
}

function formatTimePart(t) {
  if (!t) return '';
  if (typeof t === 'string') return t.slice(0, 5);
  if (Array.isArray(t) && t.length >= 2) {
    return `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}`;
  }
  return String(t);
}

function formatAvailabilityHint(windows) {
  if (!windows?.length) return 'Chưa cấu hình khung nhận học viên — cập nhật trong Portfolio.';
  const byDay = {};
  windows.forEach((w) => {
    const d = w.dayOfWeek;
    if (!d) return;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(`${formatTimePart(w.startTime)}–${formatTimePart(w.endTime)}`);
  });
  return Object.keys(byDay)
    .sort((a, b) => Number(a) - Number(b))
    .map((d) => `${DAY_VI[d] || `T${d}`} ${byDay[d].join(', ')}`)
    .join(' · ');
}

function moneyVnd(v) {
  return `${Number(v || 0).toLocaleString('vi-VN')}đ`;
}

function sessionMinutesFromRateUnit(rateUnit) {
  return slotMinutes(rateUnit);
}

function parseLocalWall(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0);
}

/** Soft FE overlap vs timetable items (BE still authoritative). */
function checkOverlapWithItems(localInputValue, durationMinutes, items, excludeAppointmentId) {
  const start = parseLocalWall(localInputValue);
  if (!start) return { ok: true, reason: '' };
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const hit = (items || []).some((it) => {
    if (!it?.start) return false;
    const id = it.appointmentId || it.id;
    if (excludeAppointmentId && id === excludeAppointmentId) return false;
    if (['CANCELLED', 'EXPIRED'].includes(it.status)) return false;
    const itEnd = it.end || new Date(it.start.getTime() + 60 * 60_000);
    return slotsOverlap(start, end, it.start, itEnd);
  });
  if (hit) {
    return { ok: false, reason: 'Trùng buổi đã có trên lịch — chọn giờ khác' };
  }
  return { ok: true, reason: '' };
}

/** Soft FE check vs marketplace occupied (incl. HOLD). BE still authoritative. */
function checkOccupiedCalendar(localInputValue, durationMinutes, occupiedSlots) {
  const start = parseLocalWall(localInputValue);
  if (!start) return { ok: true, reason: '' };
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  if (isSlotOccupied(start, end, occupiedSlots || [])) {
    return { ok: false, reason: 'Khung giờ đang bận trên lịch (có thể HOLD). Chọn slot khác.' };
  }
  return { ok: true, reason: '' };
}

function isoToDatetimeLocal(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return m ? m[1] : '';
}

function timeToMinutes(t) {
  if (t == null) return null;
  if (typeof t === 'string') {
    const parts = t.split(':');
    if (parts.length < 2) return null;
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  if (Array.isArray(t) && t.length >= 2) {
    return Number(t[0]) * 60 + Number(t[1]);
  }
  return null;
}

/** Mirror BE assertSlotWithinAvailability — dayOfWeek 1=Mon…7=Sun. */
function checkSlotAgainstAvailability(windows, localInputValue, durationMinutes = 60) {
  if (!localInputValue) {
    return { ok: false, reason: 'Chọn thời gian bắt đầu' };
  }
  const m = String(localInputValue).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) {
    return { ok: false, reason: 'Thời gian không hợp lệ' };
  }
  const start = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, reason: 'Thời gian không hợp lệ' };
  }
  if (start.getTime() <= nowInVn().getTime()) {
    return { ok: false, reason: 'Thời gian phải trong tương lai' };
  }
  if (!windows?.length) {
    return { ok: false, reason: 'Chưa cấu hình khung nhận học viên' };
  }
  const jsDay = start.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = startMin + durationMinutes;
  if (endMin > 24 * 60) {
    return { ok: false, reason: 'Buổi phải bắt đầu và kết thúc trong cùng một ngày' };
  }
  const fits = windows.some((w) => {
    if (Number(w.dayOfWeek) !== dayOfWeek) return false;
    const wStart = timeToMinutes(w.startTime);
    const wEnd = timeToMinutes(w.endTime);
    if (wStart == null || wEnd == null) return false;
    return startMin >= wStart && endMin <= wEnd;
  });
  if (!fits) {
    return { ok: false, reason: 'Nằm ngoài khung nhận học viên đã cấu hình' };
  }
  return { ok: true, reason: '' };
}

async function fetchAllActiveClients() {
  const all = [];
  let page = 0;
  let last = false;
  while (!last && page < 30) {
    const clientsRes = await workspaceService.getClients({ page, size: 100, status: 'ACTIVE' }).catch(() => null);
    const data = clientsRes?.data?.data;
    const list = data?.content || data?.items || (Array.isArray(data) ? data : []);
    all.push(...list);
    last = data?.last != null ? Boolean(data.last) : list.length < 100;
    page += 1;
  }
  return all;
}

export default function PtAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [availabilityWindows, setAvailabilityWindows] = useState([]);
  const [availabilityHint, setAvailabilityHint] = useState('');
  const [availabilityLoadError, setAvailabilityLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [disputeActing, setDisputeActing] = useState(null);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMappingId, setAddMappingId] = useState('');
  const [addAt, setAddAt] = useState('');
  const [adding, setAdding] = useState(false);
  const [datetimeMin, setDatetimeMin] = useState(() => toLocalInputValue(nowInVn()));
  const [ptProfileId, setPtProfileId] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [manualTime, setManualTime] = useState(false);
  const [pickedSlots, setPickedSlots] = useState([]);

  const offlineClients = useMemo(
    () => (clients || []).filter((c) => c.selectedTrainingMode === 'OFFLINE' && c.mappingId),
    [clients],
  );
  const hasOffline = offlineClients.length > 0 || (appointments || []).some((a) => a.type === 'OFFLINE');
  const selectedAddClient = useMemo(
    () => offlineClients.find((c) => c.mappingId === addMappingId),
    [offlineClients, addMappingId],
  );

  const rescheduleClient = useMemo(
    () => offlineClients.find((c) => String(c.clientId) === String(rescheduleItem?.clientId)),
    [offlineClients, rescheduleItem],
  );
  const rescheduleDuration = useMemo(() => {
    if (rescheduleClient?.agreedRateUnit) {
      return sessionMinutesFromRateUnit(rescheduleClient.agreedRateUnit);
    }
    if (rescheduleItem?.start && rescheduleItem?.end) {
      const mins = Math.round((rescheduleItem.end.getTime() - rescheduleItem.start.getTime()) / 60000);
      if (mins >= 30 && mins <= 120) return mins;
    }
    return sessionMinutesFromRateUnit(undefined);
  }, [rescheduleItem, rescheduleClient]);
  const rescheduleRateUnit = rescheduleClient?.agreedRateUnit
    || (rescheduleDuration >= 90 ? 'SESSION_90' : 'SESSION_60');
  const addDuration = sessionMinutesFromRateUnit(selectedAddClient?.agreedRateUnit);

  const rescheduleCheck = useMemo(
    () => checkSlotAgainstAvailability(availabilityWindows, rescheduleAt, rescheduleDuration),
    [availabilityWindows, rescheduleAt, rescheduleDuration],
  );
  const addCheck = useMemo(
    () => checkSlotAgainstAvailability(availabilityWindows, addAt, addDuration),
    [availabilityWindows, addAt, addDuration],
  );

  const fetchAppts = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, clientsList, disputesRes, availRes] = await Promise.all([
        appointmentService.getPtUpcoming(),
        fetchAllActiveClients(),
        workspaceService.getSessionDisputes({ status: 'PENDING' }).catch(() => null),
        userService.getPtAvailability().catch(() => null),
      ]);
      setAppointments(apptRes.data.data || []);
      setClients(clientsList);
      setDisputes(disputesRes?.data?.data || []);
      if (availRes == null) {
        setAvailabilityWindows([]);
        setAvailabilityLoadError(true);
        setAvailabilityHint('Không tải được khung giờ — thử làm mới trang.');
      } else {
        const windows = availRes?.data?.data || [];
        setAvailabilityWindows(windows);
        setAvailabilityLoadError(false);
        setAvailabilityHint(formatAvailabilityHint(windows));
      }
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

  useEffect(() => {
    if (!rescheduleItem && !addOpen) return undefined;
    setDatetimeMin(toLocalInputValue(nowInVn()));
    const id = setInterval(() => setDatetimeMin(toLocalInputValue(nowInVn())), 30_000);
    return () => clearInterval(id);
  }, [rescheduleItem, addOpen]);

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

  const rescheduleExcludeId = rescheduleItem?.appointmentId || rescheduleItem?.id;
  const rescheduleOverlap = useMemo(
    () => checkOverlapWithItems(rescheduleAt, rescheduleDuration, items, rescheduleExcludeId),
    [rescheduleAt, rescheduleDuration, items, rescheduleExcludeId],
  );
  const addOverlap = useMemo(
    () => checkOverlapWithItems(addAt, addDuration, items, null),
    [addAt, addDuration, items],
  );

  const loadPtCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      let profileId = ptProfileId;
      if (!profileId) {
        const profileRes = await userService.getProfile();
        profileId = profileRes?.data?.data?.ptProfile?.id || null;
        setPtProfileId(profileId);
      }
      if (!profileId) {
        setCalendarData(null);
        return;
      }
      const from = toLocalDateTimeIso(getWeekStart(nowInVn()));
      const to = toLocalDateTimeIso(addWeeks(getWeekStart(nowInVn()), 8));
      const res = await marketplaceService.getPtCalendar(profileId, { from, to });
      setCalendarData(res?.data?.data || null);
    } catch {
      setCalendarData(null);
    } finally {
      setCalendarLoading(false);
    }
  }, [ptProfileId]);

  useEffect(() => {
    if (!rescheduleItem && !addOpen) return undefined;
    loadPtCalendar();
    return undefined;
  }, [rescheduleItem, addOpen, loadPtCalendar]);

  const occupiedForPicker = useMemo(() => {
    const raw = calendarData?.occupiedSlots || [];
    if (!rescheduleItem?.start) return raw;
    const excludeStart = rescheduleItem.start.getTime();
    return raw.filter((o) => {
      const s = o?.startTime ? new Date(o.startTime).getTime() : NaN;
      return Number.isNaN(s) || Math.abs(s - excludeStart) > 60_000;
    });
  }, [calendarData, rescheduleItem]);

  const rescheduleCalendarBusy = useMemo(
    () => checkOccupiedCalendar(rescheduleAt, rescheduleDuration, occupiedForPicker),
    [rescheduleAt, rescheduleDuration, occupiedForPicker],
  );
  const addCalendarBusy = useMemo(
    () => checkOccupiedCalendar(addAt, addDuration, occupiedForPicker),
    [addAt, addDuration, occupiedForPicker],
  );

  const canSubmitReschedule = Boolean(fromLocalInputValue(rescheduleAt))
    && rescheduleCheck.ok
    && rescheduleOverlap.ok
    && rescheduleCalendarBusy.ok
    && !availabilityLoadError;
  const canSubmitAdd = Boolean(addMappingId)
    && Boolean(fromLocalInputValue(addAt))
    && (selectedAddClient?.escrowFreeSessions || 0) >= 1
    && addCheck.ok
    && addOverlap.ok
    && addCalendarBusy.ok
    && !availabilityLoadError;

  const pickerAvailability = calendarData?.availability?.length
    ? calendarData.availability
    : availabilityWindows;

  const onPickSlots = (sessions) => {
    setPickedSlots(sessions);
    const local = isoToDatetimeLocal(sessions[0]);
    if (rescheduleItem) setRescheduleAt(local || '');
    else setAddAt(local || '');
  };

  const requestCancel = (id) => {
    setCancelTargetId(id);
  };

  const confirmCancel = async () => {
    if (!cancelTargetId) return;
    setCancellingId(cancelTargetId);
    try {
      const res = await appointmentService.updateAppointment(cancelTargetId, 'CANCEL');
      toast.success(res?.data?.message || 'Đã hủy buổi và hoàn tiền HV');
      setCancelTargetId(null);
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

  const openReschedule = (item) => {
    setDatetimeMin(toLocalInputValue(nowInVn()));
    setManualTime(false);
    setRescheduleItem(item);
    setRescheduleAt(toLocalInputValue(item.start));
    if (item?.start) {
      const d = item.start instanceof Date ? item.start : new Date(item.start);
      setPickedSlots(Number.isNaN(d.getTime()) ? [] : [toLocalDateTimeIso(d)]);
    } else {
      setPickedSlots([]);
    }
  };

  const submitReschedule = async () => {
    const id = rescheduleItem?.appointmentId || rescheduleItem?.id;
    const startTime = fromLocalInputValue(rescheduleAt);
    if (!id || !startTime) {
      toast.error('Chọn thời gian hợp lệ');
      return;
    }
    if (!rescheduleCheck.ok) {
      toast.error(rescheduleCheck.reason);
      return;
    }
    if (!rescheduleOverlap.ok) {
      toast.error(rescheduleOverlap.reason);
      return;
    }
    if (!rescheduleCalendarBusy.ok) {
      toast.error(rescheduleCalendarBusy.reason);
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
    if ((selectedAddClient?.escrowFreeSessions || 0) < 1) {
      toast.error('Escrow không đủ — nhờ HV mua Extra sessions');
      return;
    }
    if (!addCheck.ok) {
      toast.error(addCheck.reason);
      return;
    }
    if (!addOverlap.ok) {
      toast.error(addOverlap.reason);
      return;
    }
    if (!addCalendarBusy.ok) {
      toast.error(addCalendarBusy.reason);
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
              Hủy buổi chờ dạy sẽ hoàn ví (nếu còn escrow). Tranh chấp phản hồi bên dưới.
            </p>
          </div>
        </div>
        {hasOffline && offlineClients.length > 0 && (
          <Button
            onClick={() => {
              setDatetimeMin(toLocalInputValue(nowInVn()));
              setManualTime(false);
              setPickedSlots([]);
              setAddAt('');
              setAddOpen(true);
            }}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-4 shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Thêm buổi
          </Button>
        )}
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
                onCancel={requestCancel}
                onMarkDone={handleMarkDone}
                onReschedule={openReschedule}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={!!rescheduleItem}
        onClose={() => { setRescheduleItem(null); setManualTime(false); setPickedSlots([]); }}
        title="Đổi lịch buổi tập"
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Chọn slot trống trên lịch. Không đụng tới tiền escrow.
          </p>
          <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed border ${
            availabilityLoadError
              ? 'bg-amber-50 border-amber-100 text-amber-900'
              : 'bg-slate-50 border-slate-100 text-slate-600'
          }`}
          >
            <span className="font-bold text-slate-700">Khung nhận HV: </span>
            {availabilityHint || 'Đang tải…'}
          </div>
          {calendarLoading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          ) : pickerAvailability?.length > 0 ? (
            <PtWeeklyCalendarPicker
              availability={pickerAvailability}
              occupiedSlots={occupiedForPicker}
              rateUnit={rescheduleRateUnit}
              selectedSessions={pickedSlots}
              onSelectedSessionsChange={onPickSlots}
              selectionMode="single"
              showPackageTotal={false}
              now={nowInVn()}
            />
          ) : (
            <p className="text-xs text-amber-700">Không tải được lưới slot — dùng nhập giờ thủ công.</p>
          )}
          <button
            type="button"
            className="text-xs font-semibold text-blue-600 hover:underline"
            onClick={() => setManualTime((v) => !v)}
          >
            {manualTime ? 'Ẩn nhập giờ thủ công' : 'Nhập giờ khác (thủ công)'}
          </button>
          {manualTime && (
            <input
              type="datetime-local"
              min={datetimeMin}
              value={rescheduleAt}
              onChange={(e) => { setRescheduleAt(e.target.value); setPickedSlots([]); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          )}
          {rescheduleAt && !rescheduleCheck.ok && (
            <p className="text-xs font-medium text-amber-700">{rescheduleCheck.reason}</p>
          )}
          {rescheduleAt && rescheduleCheck.ok && !rescheduleOverlap.ok && (
            <p className="text-xs font-medium text-amber-700">{rescheduleOverlap.reason}</p>
          )}
          {rescheduleAt && rescheduleCheck.ok && rescheduleOverlap.ok && !rescheduleCalendarBusy.ok && (
            <p className="text-xs font-medium text-amber-700">{rescheduleCalendarBusy.reason}</p>
          )}
          {rescheduleAt && rescheduleCheck.ok && rescheduleOverlap.ok && rescheduleCalendarBusy.ok && (
            <p className="text-xs font-medium text-emerald-700">Khớp khung nhận HV ({rescheduleDuration} phút).</p>
          )}
          <Button
            disabled={rescheduling || !canSubmitReschedule}
            onClick={submitReschedule}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
          >
            {rescheduling ? 'Đang đổi...' : 'Xác nhận đổi lịch'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setManualTime(false); setPickedSlots([]); }}
        title="Thêm buổi offline"
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Chỉ thêm khi escrow còn đủ ít nhất 1 buổi chưa gán. Nếu thiếu, nhờ học viên mua thêm buổi.
          </p>
          <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed border ${
            availabilityLoadError
              ? 'bg-amber-50 border-amber-100 text-amber-900'
              : 'bg-slate-50 border-slate-100 text-slate-600'
          }`}
          >
            <span className="font-bold text-slate-700">Khung nhận HV: </span>
            {availabilityHint || 'Đang tải…'}
          </div>
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
                {c.escrowFreeSessions != null ? ` · còn ${c.escrowFreeSessions} buổi escrow` : ''}
              </option>
            ))}
          </select>
          {selectedAddClient && (
            <div className={`rounded-xl px-3 py-2.5 text-xs font-medium border ${
              (selectedAddClient.escrowFreeSessions || 0) >= 1
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-amber-50 border-amber-100 text-amber-900'
            }`}
            >
              Escrow còn {moneyVnd(selectedAddClient.remainingEscrow)} · trống khoảng{' '}
              <strong>{selectedAddClient.escrowFreeSessions ?? 0}</strong> buổi
              {(selectedAddClient.escrowFreeSessions || 0) < 1
                && ' — nhờ học viên mua Extra sessions trước.'}
            </div>
          )}
          {calendarLoading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          ) : pickerAvailability?.length > 0 ? (
            <PtWeeklyCalendarPicker
              availability={pickerAvailability}
              occupiedSlots={occupiedForPicker}
              rateUnit={selectedAddClient?.agreedRateUnit || 'SESSION_60'}
              selectedSessions={pickedSlots}
              onSelectedSessionsChange={onPickSlots}
              selectionMode="single"
              showPackageTotal={false}
              now={nowInVn()}
            />
          ) : (
            <p className="text-xs text-amber-700">Không tải được lưới slot — dùng nhập giờ thủ công.</p>
          )}
          <button
            type="button"
            className="text-xs font-semibold text-blue-600 hover:underline"
            onClick={() => setManualTime((v) => !v)}
          >
            {manualTime ? 'Ẩn nhập giờ thủ công' : 'Nhập giờ khác (thủ công)'}
          </button>
          {manualTime && (
            <input
              type="datetime-local"
              min={datetimeMin}
              value={addAt}
              onChange={(e) => { setAddAt(e.target.value); setPickedSlots([]); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          )}
          {addAt && !addCheck.ok && (
            <p className="text-xs font-medium text-amber-700">{addCheck.reason}</p>
          )}
          {addAt && addCheck.ok && !addOverlap.ok && (
            <p className="text-xs font-medium text-amber-700">{addOverlap.reason}</p>
          )}
          {addAt && addCheck.ok && addOverlap.ok && !addCalendarBusy.ok && (
            <p className="text-xs font-medium text-amber-700">{addCalendarBusy.reason}</p>
          )}
          {addAt && addCheck.ok && addOverlap.ok && addCalendarBusy.ok && (
            <p className="text-xs font-medium text-emerald-700">
              Khớp khung nhận HV ({addDuration} phút
              {selectedAddClient?.agreedRateUnit ? ` · ${selectedAddClient.agreedRateUnit}` : ''}).
            </p>
          )}
          <Button
            disabled={adding || !canSubmitAdd}
            onClick={submitAdd}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
          >
            {adding ? 'Đang thêm...' : 'Thêm buổi'}
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!cancelTargetId}
        title="Hủy buổi & hoàn tiền HV?"
        description="Buổi sẽ bị hủy và phần escrow tương ứng được hoàn về ví học viên (nếu còn). Thao tác không hoàn tác."
        confirmLabel="Hủy & hoàn tiền"
        cancelLabel="Giữ buổi"
        danger
        loading={!!cancellingId}
        onClose={() => !cancellingId && setCancelTargetId(null)}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
