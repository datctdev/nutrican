import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export const ACTIVITY_LEVEL_OPTIONS = [
  {
    value: 'SEDENTARY',
    label: 'Ít vận động — ≤ 1 buổi/tuần, < 15′/buổi',
    shortLabel: 'Ít vận động',
    factor: '1.2',
    desc: 'Văn phòng, ngồi nhiều; không tập hoặc buổi < 15 phút. Tải tập ước lượng (không chỉ nghề ngồi).',
    sessionsHint: '≤ 1 buổi',
    minutesHint: '< 15′',
    dot: 'bg-slate-400',
  },
  {
    value: 'LIGHT',
    label: 'Vận động nhẹ — 1–3 buổi × 20–30′',
    shortLabel: 'Vận động nhẹ',
    factor: '1.375',
    desc: 'Đi bộ thư giãn, yoga nhẹ, dọn nhà — khoảng 1–3 buổi × 20–30 phút.',
    sessionsHint: '1–3 buổi',
    minutesHint: '20–30′',
    dot: 'bg-sky-400',
  },
  {
    value: 'MODERATE',
    label: 'Vận động vừa — 3–5 buổi × 30–45′',
    shortLabel: 'Vận động vừa',
    factor: '1.55',
    desc: 'Gym, cardio, bơi, bóng phong trào — khoảng 3–5 buổi × 30–45 phút.',
    sessionsHint: '3–5 buổi',
    minutesHint: '30–45′',
    dot: 'bg-emerald-500',
  },
  {
    value: 'ACTIVE',
    label: 'Vận động nhiều — 6–7 buổi × 45–60′',
    shortLabel: 'Vận động nhiều',
    factor: '1.725',
    desc: 'Cường độ cao hầu như mỗi ngày — khoảng 6–7 buổi × 45–60 phút.',
    sessionsHint: '6–7 buổi',
    minutesHint: '45–60′',
    dot: 'bg-amber-500',
  },
  {
    value: 'VERY_ACTIVE',
    label: 'Vận động rất nặng — ≥ 8 buổi hoặc > 60′/buổi',
    shortLabel: 'Vận động rất nặng',
    factor: '1.9',
    desc: 'VĐV / lao động nặng / tập ~2 lần/ngày, hoặc mỗi buổi > 60 phút.',
    sessionsHint: '≥ 8 buổi',
    minutesHint: '> 60′',
    dot: 'bg-rose-500',
  },
];

export const DEFAULT_ACTIVITY_LEVEL = 'MODERATE';

export const MINUTE_PRESETS = [20, 30, 45, 60, 90];

function levelFromSessions(sessions) {
  if (sessions <= 1) return 1;
  if (sessions <= 3) return 2;
  if (sessions <= 5) return 3;
  if (sessions <= 7) return 4;
  return 5;
}

function levelFromMinutes(minutes) {
  if (minutes < 15) return 1;
  if (minutes <= 30) return 2;
  if (minutes <= 45) return 3;
  if (minutes <= 60) return 4;
  return 5;
}

/** Mirror BE ActivityLoadMapper — returns enum value or null if incomplete/invalid. */
export function deriveActivityLevel(sessionsPerWeek, minutesPerSession) {
  if (sessionsPerWeek === '' || sessionsPerWeek == null || minutesPerSession === '' || minutesPerSession == null) {
    return null;
  }
  const sessions = Number(sessionsPerWeek);
  const minutes = Number(minutesPerSession);
  if (!Number.isFinite(sessions) || !Number.isFinite(minutes)) return null;
  if (sessions < 0 || sessions > 14 || minutes < 0 || minutes > 300) return null;
  if (sessions === 0) {
    return minutes === 0 ? 'SEDENTARY' : null;
  }
  const idx = Math.max(levelFromSessions(sessions), levelFromMinutes(minutes)) - 1;
  return ACTIVITY_LEVEL_OPTIONS[idx]?.value ?? null;
}

export function activityLevelMeta(value) {
  return ACTIVITY_LEVEL_OPTIONS.find((o) => o.value === value) || null;
}

/** Portal + fixed — escapes Card `overflow-hidden` so all 5 levels stay visible. */
export function ActivityLevelInfoTooltip() {
  const tipId = useId();
  const btnRef = useRef(null);
  const tipRef = useRef(null);
  const closeTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, bottom: 'auto', left: 0, width: 352, maxHeight: 320 });

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const updatePosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const tipWidth = Math.min(352, window.innerWidth - 24);
    const gap = 8;
    const tipEl = tipRef.current;
    const tipHeight = tipEl?.offsetHeight || Math.min(360, window.innerHeight * 0.55);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const placeAbove = spaceBelow < tipHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    left = Math.max(12, Math.min(left, window.innerWidth - tipWidth - 12));

    if (placeAbove) {
      setCoords({
        top: 'auto',
        bottom: window.innerHeight - rect.top + gap,
        left,
        width: tipWidth,
        maxHeight: Math.max(160, spaceAbove - 8),
      });
    } else {
      setCoords({
        top: rect.bottom + gap,
        bottom: 'auto',
        left,
        width: tipWidth,
        maxHeight: Math.max(160, spaceBelow - 8),
      });
    }
  }, []);

  const show = () => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    // Remeasure after portal paint so height is accurate.
    const raf = requestAnimationFrame(() => updatePosition());
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e) => {
      const t = e.target;
      if (btnRef.current?.contains(t) || tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, updatePosition]);

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Giải thích mức độ vận động"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onBlur={scheduleClose}
        onClick={(e) => {
          e.preventDefault();
          if (open) setOpen(false);
          else show();
        }}
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-100 text-blue-600 ring-1 ring-blue-200 hover:bg-blue-600 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
      {open
        && createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="rounded-2xl border border-blue-100 bg-white text-left shadow-xl shadow-blue-100/50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 py-2.5">
              <p className="text-[11px] font-bold text-white leading-snug">
                Mức = tải tập ước lượng (buổi × phút)
              </p>
              <p className="text-[10px] text-blue-100 mt-0.5">
                TDEE = BMR × hệ số R · lấy mức cao hơn giữa buổi/tuần và phút/buổi
              </p>
            </div>
            <ul
              className="p-3 space-y-2.5 overflow-y-auto"
              style={{ maxHeight: coords.maxHeight ? Math.min(320, coords.maxHeight) : 320 }}
            >
              {ACTIVITY_LEVEL_OPTIONS.map((item) => (
                <li key={item.value} className="flex items-start gap-2 text-[11px] leading-snug">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
                  <span>
                    <span className="font-bold text-slate-800">{item.shortLabel}</span>
                    <span className="ml-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-1.5 py-px">
                      R = {item.factor}
                    </span>
                    <span className="block text-slate-500 mt-0.5">
                      {item.sessionsHint} · {item.minutesHint}
                    </span>
                    <span className="block text-slate-500 mt-0.5">{item.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Shared buổi/tuần + phút/buổi inputs with live level preview. */
export function ActivityLoadInputs({
  sessionsPerWeek,
  minutesPerSession,
  onSessionsChange,
  onMinutesChange,
  disabled = false,
  showPresets = true,
}) {
  const derived = deriveActivityLevel(sessionsPerWeek, minutesPerSession);
  const meta = activityLevelMeta(derived);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Buổi / tuần</span>
          <input
            type="number"
            min={0}
            max={14}
            disabled={disabled}
            value={sessionsPerWeek ?? ''}
            onChange={(e) => onSessionsChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={`w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="0–14"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Phút / buổi</span>
          <input
            type="number"
            min={0}
            max={300}
            disabled={disabled}
            value={minutesPerSession ?? ''}
            onChange={(e) => onMinutesChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={`w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="0–300"
          />
        </label>
      </div>
      {showPresets && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMinutesChange(m)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-colors ${
                Number(minutesPerSession) === m
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'
              }`}
            >
              {m}′
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta?.dot || 'bg-slate-300'}`} />
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-slate-800 truncate">
            {meta ? `${meta.shortLabel} · R = ${meta.factor}` : 'Nhập buổi và phút để xem mức'}
          </p>
          {Number(sessionsPerWeek) === 0 && Number(minutesPerSession) > 0 && (
            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">0 buổi thì phút/buổi phải = 0</p>
          )}
        </div>
      </div>
    </div>
  );
}
