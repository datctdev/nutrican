import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { profileExtensionsService } from '../../../services/profileExtensionsService';
import BodyCompositionChart from '../../../components/charts/BodyCompositionChart';

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
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className={`p-${compact ? '4' : '6'} space-y-6 overflow-x-auto`}>
        {regressionAlert?.active && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {regressionAlert.message}
          </div>
        )}
        
        {goals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div><span className="text-slate-500 block text-xs uppercase font-bold mb-1">Mục tiêu</span> <span className="font-semibold text-slate-800">{goals.nutritionGoal || '—'}</span></div>
            <div><span className="text-slate-500 block text-xs uppercase font-bold mb-1">Cân mục tiêu</span> <span className="font-semibold text-blue-600">{goals.targetWeight ? `${goals.targetWeight} kg` : '—'}</span></div>
            <div><span className="text-slate-500 block text-xs uppercase font-bold mb-1">Cân bắt đầu</span> <span className="font-semibold text-slate-800">{goals.baselineWeight ? `${goals.baselineWeight} kg` : '—'}</span></div>
            <div><span className="text-slate-500 block text-xs uppercase font-bold mb-1">Dự kiến đạt</span> <span className="font-semibold text-slate-800">{projectedCompletion || goals.targetDate || '—'}</span></div>
          </div>
        )}
        
        <div className="min-w-[600px]">
          <BodyCompositionChart metrics={metrics} targetWeight={goals?.targetWeight} targetDate={goals?.targetDate} />
        </div>

        {milestones?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {milestones.slice(0, 6).map((m) => (
              <span key={m.id} className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ⭐ {m.title}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
