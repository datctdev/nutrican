import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatLocalDate, parseLocalDate, todayLocalIso } from './dietUtils';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function daysInMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatLocalDate(new Date(year, monthIndex, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}


export default function DietDateCalendar({
  open,
  onClose,
  selectedDate,
  onSelectDate,
  viewingMonth,
  onViewingMonthChange,
  dottedDates,
  dotsLoading = false,
}) {
  const [quickPick, setQuickPick] = useState(false);
  const today = todayLocalIso();
  const [yStr, mStr] = (viewingMonth || today.slice(0, 7)).split('-');
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;

  const dotted = useMemo(() => {
    if (dottedDates instanceof Set) return dottedDates;
    return new Set(dottedDates || []);
  }, [dottedDates]);

  const cells = useMemo(() => daysInMonthGrid(year, monthIndex), [year, monthIndex]);

  useEffect(() => {
    if (!open) {
      setQuickPick(false);
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const shiftMonth = (delta) => {
    const d = new Date(year, monthIndex + delta, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onViewingMonthChange?.(ym);
  };

  const years = [];
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= thisYear - 10; y--) years.push(y);
  for (let y = thisYear + 1; y <= thisYear + 1; y++) {
    if (!years.includes(y)) years.push(y);
  }
  years.sort((a, b) => b - a);

  const panel = (
    <div
      className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
      role="dialog"
      aria-label="Chọn ngày nhật ký"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setQuickPick((v) => !v)}
          className="text-sm font-bold text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-50"
        >
          {MONTHS_VI[monthIndex]}, {year}
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Tháng sau"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 md:hidden"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {quickPick && (
        <div className="px-3 py-3 border-b border-slate-100 grid grid-cols-2 gap-3 bg-slate-50">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tháng</label>
            <select
              value={monthIndex}
              onChange={(e) => {
                const m = Number(e.target.value) + 1;
                onViewingMonthChange?.(`${year}-${String(m).padStart(2, '0')}`);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
            >
              {MONTHS_VI.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Năm</label>
            <select
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value);
                onViewingMonthChange?.(`${y}-${String(monthIndex + 1).padStart(2, '0')}`);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="px-3 pt-2 pb-3">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] font-bold text-slate-400 py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 relative">
          {dotsLoading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center text-xs text-slate-400">
              Đang tải…
            </div>
          )}
          {cells.map((iso, idx) => {
            if (!iso) return <div key={`e-${idx}`} className="aspect-square" />;
            const maxPlan = (() => {
              const d = parseLocalDate(today);
              d.setDate(d.getDate() + 14);
              return formatLocalDate(d);
            })();
            const blocked = iso > maxPlan;
            const isFutureDay = iso > today;
            const isSelected = iso === selectedDate;
            const isToday = iso === today;
            const hasDot = dotted.has(iso);
            return (
              <button
                key={iso}
                type="button"
                disabled={blocked}
                onClick={() => {
                  if (blocked) return;
                  onSelectDate?.(iso);
                  onClose?.();
                }}
                className={`aspect-square rounded-xl text-sm font-semibold flex flex-col items-center justify-center relative transition-colors
                  ${blocked ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-blue-50 text-slate-700'}
                  ${isFutureDay && !isSelected && !blocked ? 'text-slate-500' : ''}
                  ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-600 shadow-md' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-blue-400 ring-inset text-blue-700' : ''}
                `}
              >
                {parseLocalDate(iso).getDate()}
                {hasDot && (
                  <span
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>

      <div
        className="fixed inset-0 z-[60] flex items-end justify-center md:hidden bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div className="w-full p-3 pb-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
          {panel}
        </div>
      </div>

      <div
        className="hidden md:flex fixed inset-0 z-[60] items-center justify-center bg-slate-900/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        {panel}
      </div>
    </>
  );
}
