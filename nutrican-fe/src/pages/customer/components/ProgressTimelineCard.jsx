import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { profileExtensionsService } from '../../../services/profileExtensionsService';

function WeightLineChart({ metrics }) {
  if (!metrics?.length) return <p className="text-sm text-slate-500">Chưa có dữ liệu cân nặng.</p>;
  const points = metrics.slice(-14);
  const maxW = Math.max(...points.map((m) => Number(m.weight) || 0), 1);
  const minW = Math.min(...points.map((m) => Number(m.weight) || maxW));
  const range = Math.max(maxW - minW, 1);
  const w = 360;
  const h = 120;
  const pad = 12;
  const path = points.map((m, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (((Number(m.weight) || 0) - minW) / range) * (h - pad * 2);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-lg h-32">
      <path d={path} fill="none" stroke="#0d9488" strokeWidth="2.5" />
    </svg>
  );
}

export default function ProgressTimelineCard({ goals, milestones, regressionAlert, projectedCompletion, bodyMetrics, compact }) {
  const [fetchedMetrics, setFetchedMetrics] = useState([]);

  useEffect(() => {
    if (bodyMetrics?.length) return;
    profileExtensionsService.getBodyMetrics({ page: 0, size: 14 })
      .then((res) => setFetchedMetrics(res.data?.data?.content || res.data?.data || []))
      .catch(() => setFetchedMetrics([]));
  }, [bodyMetrics]);

  const metrics = bodyMetrics?.length ? bodyMetrics : fetchedMetrics;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className={`p-${compact ? '4' : '6'} space-y-4`}>
        <h3 className="font-bold text-slate-900">Tiến độ mục tiêu</h3>
        {regressionAlert?.active && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {regressionAlert.message}
          </div>
        )}
        {goals ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Mục tiêu:</span> {goals.nutritionGoal || '—'}</div>
            <div><span className="text-slate-500">Cân mục tiêu:</span> {goals.targetWeight ? `${goals.targetWeight} kg` : '—'}</div>
            <div><span className="text-slate-500">Baseline:</span> {goals.baselineWeight ? `${goals.baselineWeight} kg` : '—'}</div>
            <div><span className="text-slate-500">Dự kiến đạt:</span> {projectedCompletion || goals.targetDate || '—'}</div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Chưa khai báo mục tiêu.</p>
        )}
        <WeightLineChart metrics={metrics} />
        {milestones?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {milestones.slice(0, 6).map((m) => (
              <span key={m.id} className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {m.title}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
