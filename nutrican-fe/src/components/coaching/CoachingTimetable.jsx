import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, User, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import Modal from '../common/Modal';
import { addWeeks, formatWeekRange, getWeekStart } from '../../utils/offlineHireSlots';

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
    canCancel: extras.canCancel ?? ['PENDING', 'CONFIRMED', 'SCHEDULED'].includes(raw.status),
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
      counterpartName: s.counterpartName || counterpartName,
    }, {
      counterpartName: s.counterpartName || counterpartName,
      canCancel: match ? ['PENDING', 'CONFIRMED'].includes(match.status) : false,
    }));
  });

  appointments.forEach((a) => {
    if (usedAppt.has(a.id)) return;
    items.push(toTimetableItem(a, {
      counterpartName: a.counterpartName || counterpartName,
      canCancel: ['PENDING', 'CONFIRMED'].includes(a.status),
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
  roleLabel = 'Đối tác',
}) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selected, setSelected] = useState(null);

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

  const today = new Date();
  const meta = selected ? statusMeta(selected.status) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={weekStart.getTime() <= getWeekStart(new Date()).getTime() - 8 * 7 * 24 * 3600 * 1000}
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
            </div>

            {selected.canCancel && onCancel && (selected.appointmentId || selected.id) && (
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
                {cancellingId === (selected.appointmentId || selected.id) ? 'Đang hủy...' : 'Hủy buổi này'}
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
