import { Info } from 'lucide-react';

/** Shared activity level options — keys match BE ActivityLevel enum. */
export const ACTIVITY_LEVEL_OPTIONS = [
  {
    value: 'SEDENTARY',
    label: 'Ít vận động — văn phòng, ≤ 1 buổi/tuần',
    shortLabel: 'Ít vận động',
    factor: '1.2',
    desc: 'Làm văn phòng, ít đi lại, chỉ tập nhẹ ≤ 1 buổi/tuần.',
    dot: 'bg-slate-400',
  },
  {
    value: 'LIGHT',
    label: 'Vận động nhẹ — 1–3 buổi/tuần',
    shortLabel: 'Vận động nhẹ',
    factor: '1.375',
    desc: 'Tập luyện thể thao nhẹ nhàng từ 1–3 buổi/tuần.',
    dot: 'bg-sky-400',
  },
  {
    value: 'MODERATE',
    label: 'Vận động vừa — 3–5 buổi/tuần',
    shortLabel: 'Vận động vừa',
    factor: '1.55',
    desc: 'Tập luyện hoặc chơi thể thao cường độ vừa từ 3–5 buổi/tuần.',
    dot: 'bg-emerald-500',
  },
  {
    value: 'ACTIVE',
    label: 'Vận động nhiều — 6–7 buổi/tuần',
    shortLabel: 'Vận động nhiều',
    factor: '1.725',
    desc: 'Tập luyện nặng hoặc chơi thể thao cường độ cao từ 6–7 buổi/tuần.',
    dot: 'bg-amber-500',
  },
  {
    value: 'VERY_ACTIVE',
    label: 'Vận động rất nặng — VĐV / tập 2 lần/ngày',
    shortLabel: 'Vận động rất nặng',
    factor: '1.9',
    desc: 'Vận động viên, lao động chân tay nặng, hoặc tập cường độ cao 2 lần/ngày.',
    dot: 'bg-rose-500',
  },
];

export const DEFAULT_ACTIVITY_LEVEL = 'MODERATE';

export function ActivityLevelInfoTooltip() {
  return (
    <div className="relative group/activity-help">
      <button
        type="button"
        aria-label="Giải thích mức độ vận động"
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-100 text-blue-600 ring-1 ring-blue-200 hover:bg-blue-600 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-0 bottom-full z-30 mb-2 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-blue-100 bg-white text-left shadow-xl shadow-blue-100/50 opacity-0 invisible translate-y-1 transition-all duration-200 group-hover/activity-help:opacity-100 group-hover/activity-help:visible group-hover/activity-help:translate-y-0 group-focus-within/activity-help:opacity-100 group-focus-within/activity-help:visible group-focus-within/activity-help:translate-y-0 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 py-2.5">
          <p className="text-[11px] font-bold text-white leading-snug">
            Chọn theo số buổi tập mỗi tuần
          </p>
          <p className="text-[10px] text-blue-100 mt-0.5">
            TDEE = BMR × hệ số vận động (R)
          </p>
        </div>
        <ul className="p-3 space-y-2.5">
          {ACTIVITY_LEVEL_OPTIONS.map((item) => (
            <li key={item.value} className="flex items-start gap-2 text-[11px] leading-snug">
              <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
              <span>
                <span className="font-bold text-slate-800">{item.shortLabel}</span>
                <span className="ml-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-1.5 py-px">
                  R = {item.factor}
                </span>
                <span className="block text-slate-500 mt-0.5">{item.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
