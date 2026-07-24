function toSortKey(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return 0;
  const t = Date.parse(`${isoDate.slice(0, 10)}T00:00:00`);
  return Number.isFinite(t) ? t : 0;
}

function formatMetricDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '—';
  const raw = isoDate.slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '—';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

/** Accept BodyMetricDto (`recordDate`) or progress BodyMetricData (`date`). */
function normalizeMetric(m) {
  if (!m || m.isTarget) return m;
  return {
    ...m,
    recordDate: m.recordDate ?? m.date ?? null,
    muscleMass: m.muscleMass ?? null,
  };
}

export default function BodyCompositionChart({ metrics, targetWeight, targetDate }) {
  if (!metrics?.length) return <p className="text-sm text-slate-500">Chưa có dữ liệu trạng thái cơ thể.</p>;

  const normalized = metrics.map(normalizeMetric).filter((m) => m.recordDate || m.weight != null);
  // Newest-first then reverse → chronological L→R (same as legacy when API was already DESC)
  const history = [...normalized]
    .sort((a, b) => toSortKey(b.recordDate) - toSortKey(a.recordDate))
    .slice(0, 7)
    .reverse();

  const cols = [...history, { isTarget: true, weight: targetWeight, recordDate: targetDate || 'Mục tiêu' }];
  const colWidth = 100 / cols.length;

  const renderRow = (label, subLabel, unit, dataKey, color, isTargetEmpty = false) => {
    const dataPoints = cols.map(c => {
      if (c.isTarget && isTargetEmpty) return null;
      if (c.isTarget && !c[dataKey]) return null;
      const val = Number(c[dataKey]);
      if (isNaN(val) || val <= 0) return null;
      return val;
    }).filter(v => v !== null);

    const maxV = dataPoints.length ? Math.max(...dataPoints) : 1;
    const minV = dataPoints.length ? Math.min(...dataPoints) : 0;
    const range = Math.max(maxV - minV, 1);

    const points = cols.map((c, i) => {
      if (c.isTarget && isTargetEmpty) return null;
      if (c.isTarget && !c[dataKey]) return null;
      const val = Number(c[dataKey]);
      if (isNaN(val) || val <= 0) return null;

      const x = (i + 0.5) * (100 / cols.length);
      const y = 75 - ((val - minV) / range) * 50;
      return { x, y, val, isTarget: c.isTarget };
    });

    const pathString = points
      .filter(p => p !== null)
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return (
      <div className="flex border-b border-slate-800 relative h-20 items-center bg-white">

        <div className="w-[110px] sm:w-[140px] flex-shrink-0 border-r border-slate-800 p-2 h-full flex flex-col justify-center bg-slate-100 z-10">
          <div className="flex justify-between items-end">
            <span className="font-bold text-slate-900 text-sm sm:text-base">{label}</span>
            <span className="text-xs text-slate-600">({unit})</span>
          </div>
          {subLabel && <span className="text-[9px] sm:text-[10px] text-slate-500 leading-tight">{subLabel}</span>}
        </div>


        <div className="flex-1 flex relative h-full">

          {cols.map((_, i) => (
            <div key={i} className={`h-full border-r ${i === cols.length - 2 ? 'border-slate-800 border-solid' : 'border-slate-300 border-dashed'}`} style={{ width: `${colWidth}%` }} />
          ))}


          <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d={pathString} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            {points.map((p, i) => p && (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>


          <div className="absolute inset-0 flex h-full pointer-events-none">
             {points.map((p, i) => (
                <div key={i} className="h-full relative flex justify-center" style={{ width: `${colWidth}%` }}>
                  {p && (
                    <div className={`absolute text-center text-xs sm:text-sm font-bold ${p.isTarget ? 'text-blue-600' : 'text-slate-800'}`} style={{ top: `calc(${p.y}% - 20px)` }}>
                      {p.val}
                    </div>
                  )}
                </div>
             ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="border-t-2 border-l-2 border-r-2 border-b-2 border-slate-800 overflow-hidden w-full max-w-4xl font-sans">
      <div className="bg-slate-100 border-b border-slate-800 p-2">
        <h4 className="font-black text-slate-900 text-lg uppercase tracking-wider">Body Composition History</h4>
      </div>

      {renderRow('Weight', '', 'kg', 'weight', '#000000', false)}
      {renderRow('SMM', 'Skeletal Muscle Mass', 'kg', 'muscleMass', '#000000', true)}
      {renderRow('PBF', 'Percent Body Fat', '%', 'bodyFatPercent', '#000000', true)}


      <div className="flex bg-slate-200 h-12 items-center">
        <div className="w-[110px] sm:w-[140px] flex-shrink-0 border-r border-slate-800 p-2 h-full flex items-center bg-slate-300 text-xs font-bold text-slate-700">
          <span className="mr-2">☑ Recent</span> <span className="text-slate-500 font-normal">☐ Total</span>
        </div>
        <div className="flex-1 flex h-full">
          {cols.map((c, i) => (
            <div key={i} className={`h-full flex flex-col items-center justify-center border-r ${i === cols.length - 2 ? 'border-slate-800 border-solid' : 'border-slate-400 border-dashed'}`} style={{ width: `${colWidth}%` }}>
              <span className={`text-[9px] sm:text-[11px] font-bold text-center ${c.isTarget ? 'text-blue-700' : 'text-slate-700'}`}>
                {c.isTarget ? c.recordDate : formatMetricDate(c.recordDate)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
