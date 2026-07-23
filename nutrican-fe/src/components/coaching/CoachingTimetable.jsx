import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, User, FileText, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import Modal from '../common/Modal';
import { addWeeks, formatWeekRange, getWeekStart } from '../../utils/offlineHireSlots';
import { nowInVn } from '../../pages/customer/components/dietUtils';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const PX_PER_HOUR = 56;

const SESSION_STATUS = {
  SCHEDULED: { text: 'Chờ dạy', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  AWAITING_CONFIRM: { text: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  CONFIRMED: { text: 'Đã chốt', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  AUTO_CONFIRMED: { text: 'Tự xác nhận', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  DISPUTED: { text: 'Tranh chấp', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  CANCELLED: { text: 'Đã hủy', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  PENDING: { text: 'Chờ xử lý', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  EXPIRED: { text: 'Hết hạn', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const BLOCK_COLORS = {
  SCHEDULED: 'bg-sky-500/90 hover:bg-sky-600',
  AWAITING_CONFIRM: 'bg-amber-500/90 hover:bg-amber-600',
  CONFIRMED: 'bg-emerald-500/90 hover:bg-emerald-600',
  AUTO_CONFIRMED: 'bg-emerald-500/90 hover:bg-emerald-600',
  DISPUTED: 'bg-rose-500/90 hover:bg-rose-600',
  CANCELLED: 'bg-slate-400/80 hover:bg-slate-500',
  PENDING: 'bg-amber-500/90 hover:bg-amber-600',
  EXPIRED: 'bg-red-400/80',
};

function parseDate(value) {
  if (!value) return null;
  // Jackson sometimes serializes LocalDateTime as [y, m, d, h, min, s, nano]
  if (Array.isArray(value) && value.length >= 5) {
    const [y, m, d, h = 0, min = 0, s = 0] = value;
    const dt = new Date(y, m - 1, d, h, min, s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  if (typeof value === 'string') {
    // Treat "2026-07-22T20:00:00" (no Z) as local wall-clock — matches BE LocalDateTime.
    const m = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
    );
    if (m && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value.trim())) {
      const dt = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6] || 0),
      );
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatTime(date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function statusMeta(status) {
  return SESSION_STATUS[status] || { text: status || '—', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
}

/** Hủy khi còn chờ dạy / chờ xử lý — ẩn khi đã chốt (CONFIRMED) hoặc sau đó. */
function canCancelByStatus(status) {
  return status === 'SCHEDULED' || status === 'PENDING';
}

function canCancelMergedItem(sessionStatus, appointmentStatus) {
  if (sessionStatus) {
    return canCancelByStatus(sessionStatus);
  }
  return appointmentStatus === 'PENDING';
}

/** Hủy chỉ khi buổi chưa bắt đầu và còn SCHEDULED/PENDING. */
export function canCancelAppointment(item, now = nowInVn()) {
  if (!item || !item.start) return false;
  if (item.start.getTime() <= now.getTime()) return false;
  if (item.sessionId) {
    return item.status === 'SCHEDULED';
  }
  return item.status === 'PENDING' || item.status === 'SCHEDULED';
}

/** Đổi lịch: chưa tới giờ + session SCHEDULED (hoặc appointment PENDING). */
export function canRescheduleAppointment(item, now = nowInVn()) {
  if (!item || !item.start) return false;
  if (item.start.getTime() <= now.getTime()) return false;
  if (item.sessionId) {
    return item.status === 'SCHEDULED';
  }
  return item.status === 'PENDING' || item.status === 'CONFIRMED';
}

/** Enable «Đã dạy xong» when session has started (during or after). */
export function canMarkSessionDone(item, now = nowInVn()) {
  if (!item || item.status !== 'SCHEDULED' || !item.sessionId || !item.start) return false;
  return now.getTime() >= item.start.getTime();
}

/**
 * Normalize appointment or mapping-session into timetable item.
 */
export function toTimetableItem(raw, extras = {}) {
  const start = parseDate(raw.startTime);
  const end = parseDate(raw.endTime) || (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
  return {
    id: raw.id,
    appointmentId: raw.appointmentId || (raw.type && raw.startTime ? raw.id : null),
    sessionId: raw.sessionId || raw.mappingSessionId || (!raw.type ? raw.id : null),
    startTime: raw.startTime,
    endTime: raw.endTime,
    start,
    end,
    status: raw.status,
    sequence: raw.sequence,
    venueName: raw.venueName,
    venueAddress: raw.venueAddress,
    venueMapsUrl: raw.venueMapsUrl,
    note: raw.note,
    type: raw.type || 'OFFLINE',
    title: extras.title || raw.note || (raw.sequence != null ? `Buổi #${raw.sequence}` : 'Buổi offline'),
    counterpartName: extras.counterpartName || raw.counterpartName || raw.clientName || raw.ptName,
    canCancel: extras.canCancel ?? canCancelByStatus(raw.status),
    confirmDeadlineAt: raw.confirmDeadlineAt,
    raw,
  };
}

/**
 * Merge sessions + appointments; prefer session status when times match.
 */
export function mergeTimetableSources({ sessions = [], appointments = [], counterpartName } = {}) {
  const items = [];
  const usedAppt = new Set();

  sessions.forEach((s) => {
    const sStart = parseDate(s.startTime);
    const match = appointments.find((a) => {
      const aStart = parseDate(a.startTime);
      return sStart && aStart && Math.abs(aStart - sStart) < 60_000;
    });
    if (match) usedAppt.add(match.id);
    items.push(toTimetableItem({
      ...s,
      endTime: s.endTime || match?.endTime,
      venueName: s.venueName || match?.venueName,
      venueAddress: s.venueAddress || match?.venueAddress,
      venueMapsUrl: s.venueMapsUrl || match?.venueMapsUrl,
      note: match?.note || s.note,
      type: match?.type || 'OFFLINE',
      appointmentId: match?.id,
      sessionId: s.id,
      mappingSessionId: s.id,
      counterpartName: s.counterpartName || counterpartName,
      confirmDeadlineAt: s.confirmDeadlineAt,
    }, {
      counterpartName: s.counterpartName || counterpartName,
      canCancel: match
        ? canCancelMergedItem(s.status, match.status)
        : false,
    }));
  });

  appointments.forEach((a) => {
    if (usedAppt.has(a.id)) return;
    items.push(toTimetableItem(a, {
      counterpartName: a.counterpartName || counterpartName,
      canCancel: a.status === 'PENDING',
      title: a.note || 'Buổi offline',
    }));
  });

  return items.filter((i) => i.start && i.end);
}

export default function CoachingTimetable({
  items = [],
  emptyText = 'Chưa có buổi tập trong tuần này',
  onCancel,
  cancellingId,
  role = 'customer',
  roleLabel = 'Đối tác',
  onMarkDone,
  onConfirm,
  onDispute,
  onReschedule,
  actingId,
}) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(nowInVn()));
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(() => nowInVn());

  useEffect(() => {
    const tick = () => setNow(nowInVn());
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const id = setInterval(tick, 10_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);
    tick();
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekItems = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return items.filter((item) => item.start >= weekStart && item.start < end);
  }, [items, weekStart]);

  const markDoneReminders = useMemo(() => {
    if (role !== 'pt' || !onMarkDone) return [];
    return items
      .filter((item) => canMarkSessionDone(item, now))
      .sort((a, b) => a.start - b.start);
  }, [items, now, role, onMarkDone]);

  const itemsByDay = useMemo(() => {
    return days.map((day) => weekItems.filter((item) => sameDay(item.start, day)));
  }, [days, weekItems]);

  const gridHeight = HOURS.length * PX_PER_HOUR;

  const positionFor = (item) => {
    const startMin = item.start.getHours() * 60 + item.start.getMinutes();
    const endMin = item.end.getHours() * 60 + item.end.getMinutes();
    const top = ((startMin - HOUR_START * 60) / 60) * PX_PER_HOUR;
    const height = Math.max(((endMin - startMin) / 60) * PX_PER_HOUR, 28);
    return { top, height };
  };

  const today = now;
  const meta = selected ? statusMeta(selected.status) : null;
  const selectedCanMarkDone = selected ? canMarkSessionDone(selected, now) : false;
  const selectedCanCancel = selected ? canCancelAppointment(selected, now) : false;
  const selectedCanReschedule = selected ? canRescheduleAppointment(selected, now) : false;

  return (
    <div className="space-y-4">
      {role === 'pt' && markDoneReminders.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Bell className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-emerald-900">Nhắc xác nhận buổi đã dạy</p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Các buổi đã tới giờ dạy — bấm nhanh bên dưới hoặc mở popup trên lịch.
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {markDoneReminders.map((item) => (
              <li
                key={item.sessionId || item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {item.counterpartName || 'Học viên'}
                    {item.sequence != null ? ` · Buổi #${item.sequence}` : ''}
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    {item.start.toLocaleString('vi-VN')} – {formatTime(item.end)}
                    {item.venueName ? ` · ${item.venueName}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  disabled={actingId === item.sessionId}
                  onClick={() => onMarkDone(item.sessionId, item)}
                >
                  {actingId === item.sessionId ? 'Đang gửi...' : 'Đã dạy xong'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={weekStart.getTime() <= getWeekStart(nowInVn()).getTime() - 8 * 7 * 24 * 3600 * 1000}
          onClick={() => setWeekStart(addWeeks(weekStart, -1))}
          className="rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">{formatWeekRange(weekStart)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Thời khóa biểu offline</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          className="rounded-xl"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-slate-50">
            <div className="p-2" />
            {days.map((day, idx) => {
              const isToday = sameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={`px-1 py-2.5 text-center border-l border-slate-100 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                    {DAY_LABELS[idx]}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>
                    {day.getDate()}/{day.getMonth() + 1}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] relative" style={{ height: gridHeight }}>
            <div className="relative border-r border-slate-100">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-slate-50 px-1"
                  style={{ top: (hour - HOUR_START) * PX_PER_HOUR }}
                >
                  <span className="text-[10px] font-semibold text-slate-400 -translate-y-2 block">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map((day, dayIdx) => (
              <div
                key={day.toISOString()}
                className={`relative border-l border-slate-100 ${sameDay(day, today) ? 'bg-blue-50/30' : ''}`}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-slate-50"
                    style={{ top: (hour - HOUR_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
                  />
                ))}
                {itemsByDay[dayIdx].map((item) => {
                  const { top, height } = positionFor(item);
                  const color = BLOCK_COLORS[item.status] || 'bg-slate-500 hover:bg-slate-600';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className={`absolute left-1 right-1 z-10 rounded-lg px-1.5 py-1 text-left text-white shadow-sm transition-colors overflow-hidden ${color}`}
                      style={{ top: Math.max(top, 0), height }}
                      title={item.title}
                    >
                      <p className="text-[10px] font-black leading-tight truncate">
                        {formatTime(item.start)}–{formatTime(item.end)}
                      </p>
                      <p className="text-[11px] font-semibold leading-tight truncate mt-0.5">
                        {item.title}
                      </p>
                      {item.counterpartName && height > 40 && (
                        <p className="text-[10px] opacity-90 truncate">{item.counterpartName}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {weekItems.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-2">{emptyText}</p>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Chi tiết buổi coaching offline"
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${meta.cls}`}>
                {meta.text}
              </span>
              {selected.sequence != null && (
                <span className="text-xs font-bold text-slate-500">Buổi #{selected.sequence}</span>
              )}
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {selected.type || 'OFFLINE'}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selected.start.toLocaleDateString('vi-VN', {
                      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {formatTime(selected.start)} – {formatTime(selected.end)}
                  </p>
                </div>
              </div>

              {selected.counterpartName && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{roleLabel}</p>
                    <p className="text-sm font-semibold text-slate-800">{selected.counterpartName}</p>
                  </div>
                </div>
              )}

              {(selected.venueName || selected.venueAddress) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selected.venueName || 'Địa điểm'}</p>
                    {selected.venueAddress && (
                      <p className="text-xs text-slate-600 mt-0.5">{selected.venueAddress}</p>
                    )}
                    {selected.venueMapsUrl && (
                      <a
                        href={selected.venueMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Mở bản đồ →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {selected.note && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700">{selected.note}</p>
                </div>
              )}

              {selected.status === 'AWAITING_CONFIRM' && selected.confirmDeadlineAt && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  Tự động xác nhận trước: {new Date(selected.confirmDeadlineAt).toLocaleString('vi-VN')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {role === 'pt' && selected.status === 'SCHEDULED' && selected.sessionId && onMarkDone && (
                <div className="space-y-1.5">
                  <Button
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                    disabled={!selectedCanMarkDone || actingId === selected.sessionId}
                    onClick={() => {
                      if (!selectedCanMarkDone) return;
                      const sid = selected.sessionId;
                      setSelected(null);
                      onMarkDone(sid, selected);
                    }}
                  >
                    {actingId === selected.sessionId ? 'Đang gửi...' : 'Đã dạy xong'}
                  </Button>
                  {!selectedCanMarkDone && (
                    <p className="text-xs text-center text-slate-500 font-medium">
                      Chỉ bấm được từ {formatTime(selected.start)}{' '}
                      ({selected.start.toLocaleString('vi-VN')}). Giờ máy hiện tại:{' '}
                      {now.toLocaleString('vi-VN')}.
                    </p>
                  )}
                </div>
              )}

              {role === 'customer' && selected.status === 'AWAITING_CONFIRM' && selected.sessionId && (
                <>
                  {onConfirm && (
                    <Button
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      disabled={actingId === selected.sessionId}
                      onClick={() => {
                        const sid = selected.sessionId;
                        setSelected(null);
                        onConfirm(sid, selected);
                      }}
                    >
                      {actingId === selected.sessionId ? 'Đang xác nhận...' : 'Đồng ý / Xác nhận buổi'}
                    </Button>
                  )}
                  {onDispute && (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50 font-bold"
                      disabled={actingId === selected.sessionId}
                      onClick={() => {
                        const sid = selected.sessionId;
                        setSelected(null);
                        onDispute(sid, selected);
                      }}
                    >
                      Không đồng ý
                    </Button>
                  )}
                </>
              )}

              {selectedCanReschedule && onReschedule && (selected.appointmentId || selected.id) && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 font-bold"
                  onClick={() => {
                    const snapshot = selected;
                    setSelected(null);
                    onReschedule(snapshot);
                  }}
                >
                  Đổi lịch
                </Button>
              )}

              {selectedCanCancel && onCancel && (selected.appointmentId || selected.id) && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
                  disabled={cancellingId === (selected.appointmentId || selected.id)}
                  onClick={() => {
                    const id = selected.appointmentId || selected.id;
                    const snapshot = selected;
                    setSelected(null);
                    onCancel(id, snapshot);
                  }}
                >
                  {cancellingId === (selected.appointmentId || selected.id)
                    ? 'Đang hủy...'
                    : role === 'pt'
                      ? 'Hủy buổi & hoàn tiền HV'
                      : 'Hủy buổi'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
