import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import {
  computePackageTotal,
  formatWeekRange,
  generateWeeklySlots,
  getWeekStart,
  addWeeks,
  sessionMinutesFromRateUnit,
  DAY_LABELS,
} from '../../utils/offlineHireSlots';

/**
 * Weekly free/busy slot picker (hire Extra + PT add/reschedule).
 * Additive props: selectionMode, showPackageTotal, now — defaults preserve Extra buy UX.
 */
export default function PtWeeklyCalendarPicker({
  availability = [],
  occupiedSlots = [],
  rateUnit = 'SESSION_60',
  perSessionRate = 0,
  weeksAhead = 8,
  selectedSessions = [],
  onSelectedSessionsChange,
  selectionMode = 'multi',
  showPackageTotal = true,
  now: nowProp = null,
}) {
  const clock = nowProp instanceof Date && !Number.isNaN(nowProp.getTime()) ? nowProp : new Date();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(clock));
  const minWeek = getWeekStart(clock);
  const maxWeek = addWeeks(minWeek, weeksAhead - 1);

  const weekSlots = useMemo(
    () => generateWeeklySlots(availability, rateUnit, weekStart, occupiedSlots, clock),
    [availability, rateUnit, weekStart, occupiedSlots, clock],
  );

  const slotsByDay = useMemo(() => {
    const grouped = {};
    for (let d = 1; d <= 7; d += 1) grouped[d] = [];
    weekSlots.forEach((slot) => {
      grouped[slot.dayOfWeek].push(slot);
    });
    return grouped;
  }, [weekSlots]);

  const selectedSet = useMemo(() => new Set(selectedSessions), [selectedSessions]);

  const toggleSlot = (iso) => {
    if (selectionMode === 'single') {
      if (selectedSet.has(iso)) {
        onSelectedSessionsChange([]);
      } else {
        onSelectedSessionsChange([iso]);
      }
      return;
    }
    if (selectedSet.has(iso)) {
      onSelectedSessionsChange(selectedSessions.filter((s) => s !== iso));
    } else {
      onSelectedSessionsChange([...selectedSessions, iso].sort());
    }
  };

  const canGoPrev = weekStart.getTime() > minWeek.getTime();
  const canGoNext = weekStart.getTime() < maxWeek.getTime();

  const total = computePackageTotal(selectedSessions.length, perSessionRate);
  const duration = sessionMinutesFromRateUnit(rateUnit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!canGoPrev} onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-bold text-slate-800">{formatWeekRange(weekStart)}</p>
        <Button type="button" variant="outline" size="sm" disabled={!canGoNext} onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div key={day} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">{DAY_LABELS[day]}</p>
            {slotsByDay[day].length === 0 ? (
              <p className="text-xs text-slate-400">Không có slot trống</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slotsByDay[day].map((slot) => {
                  const selected = selectedSet.has(slot.iso);
                  const timeLabel = slot.start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <button
                      key={slot.iso}
                      type="button"
                      onClick={() => toggleSlot(slot.iso)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      {timeLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {showPackageTotal && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Tổng gói</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {selectedSessions.length} buổi × {Number(perSessionRate).toLocaleString('vi-VN')}đ/buổi ({duration} phút)
          </p>
          <p className="mt-1 text-lg font-black text-emerald-700">{total.toLocaleString('vi-VN')}đ</p>
        </div>
      )}
      {selectionMode === 'single' && !showPackageTotal && (
        <p className="text-xs text-slate-500">
          Mỗi ô = {duration} phút trong khung nhận HV. Slot bận đã ẩn.
        </p>
      )}
    </div>
  );
}
