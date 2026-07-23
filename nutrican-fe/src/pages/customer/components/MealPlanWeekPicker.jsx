import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Loader2 } from 'lucide-react';
import { preferMealPlanWeekStartIso } from '../../../utils/coachingWeeks';
import { nowInVn } from './dietUtils';

function parseLocalDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Monday fallback when no coaching / currentWeekStart prop. Uses VN demo clock. */
function getMondayWeekStart() {
  const date = nowInVn();
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysSinceMonday);
  return toLocalDateKey(date);
}

function formatWeekRange(weekStart, includeYear = false) {
  const start = parseLocalDate(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const shortFormat = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });
  const endFormat = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
  return `${shortFormat.format(start)} - ${endFormat.format(end)}`;
}

function getWeekMeta(weekStart, currentWeekStartKey) {
  const current = parseLocalDate(currentWeekStartKey || getMondayWeekStart());
  const target = parseLocalDate(weekStart);
  const differenceInWeeks = Math.round((target - current) / (7 * 24 * 60 * 60 * 1000));

  if (differenceInWeeks === 0) {
    return { label: 'Tuần này', badgeClass: 'bg-emerald-100 text-emerald-700' };
  }
  if (differenceInWeeks === 1) {
    return { label: 'Tuần sau', badgeClass: 'bg-blue-100 text-blue-700' };
  }
  if (differenceInWeeks === -1) {
    return { label: 'Tuần trước', badgeClass: 'bg-slate-100 text-slate-600' };
  }
  return { label: 'Tuần thực đơn', badgeClass: 'bg-slate-100 text-slate-600' };
}

/**
 * @param {object} props
 * @param {string} [props.currentWeekStart] - ISO date of "this week" (coaching or Monday). Prefer over coachingStartedAt.
 * @param {string|Date} [props.coachingStartedAt] - When set (and no currentWeekStart), badge uses coaching week basis.
 */
export default function MealPlanWeekPicker({
  weeks,
  value,
  loading,
  onChange,
  currentWeekStart,
  coachingStartedAt,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedWeek = weeks.find((week) => week.weekStart === value) || weeks[0];
  const basisWeekStart =
    currentWeekStart
    || (coachingStartedAt ? preferMealPlanWeekStartIso(coachingStartedAt) : null)
    || getMondayWeekStart();
  const selectedMeta = selectedWeek ? getWeekMeta(selectedWeek.weekStart, basisWeekStart) : null;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!selectedWeek) return null;

  return (
    <div ref={containerRef} className="relative w-full sm:w-[245px]">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center gap-3 rounded-xl border bg-white px-3 text-left transition-all ${
          open
            ? 'border-emerald-400 ring-4 ring-emerald-50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
        } disabled:cursor-wait disabled:opacity-70`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-extrabold text-slate-800">{selectedMeta.label}</span>
          <span className="block truncate text-[10px] font-semibold text-slate-500">
            {formatWeekRange(selectedWeek.weekStart, true)}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Chọn tuần thực đơn"
          className="absolute right-0 top-full z-30 mt-2 w-full min-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.28)]"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Chọn thời gian</p>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {weeks.map((week) => {
              const meta = getWeekMeta(week.weekStart, basisWeekStart);
              const selected = week.weekStart === selectedWeek.weekStart;
              return (
                <button
                  key={week.planId}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setOpen(false);
                    if (!selected) onChange(week.weekStart);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`rounded-md px-2 py-1 text-[10px] font-extrabold ${
                    selected ? 'bg-white/15 text-white' : meta.badgeClass
                  }`}>
                    {meta.label}
                  </span>
                  <span className={`min-w-0 flex-1 text-xs font-bold ${selected ? 'text-slate-200' : 'text-slate-600'}`}>
                    {formatWeekRange(week.weekStart, true)}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
