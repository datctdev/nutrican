import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { workspaceService } from '../../services/workspaceService';
import ProgressTimelineCard from '../customer/components/ProgressTimelineCard';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, Utensils } from 'lucide-react';

function AdherenceDonut({ percent }) {
  const p = Math.min(100, Math.max(0, Number(percent) || 0));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#10b981" strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <p className="text-2xl font-bold text-emerald-600 -mt-14 rotate-0">{p}%</p>
      <p className="text-xs text-slate-500 mt-8">Tuân thủ thực đơn</p>
    </div>
  );
}

function CalorieLineChart({ history }) {
  const points = history.slice(-7);
  if (points.length === 0) return null;
  const maxVal = Math.max(...points.map((d) => Math.max(Number(d.calories) || 0, Number(d.target) || 2000)), 1);
  const w = 320;
  const h = 120;
  const pad = 8;
  const toX = (i) => pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const toY = (v) => h - pad - (v / maxVal) * (h - pad * 2);
  const actualPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.calories) || 0)}`).join(' ');
  const targetPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.target) || 2000)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md h-32">
      <path d={targetPath} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
      <path d={actualPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
      {points.map((d, i) => (
        <circle key={d.date} cx={toX(i)} cy={toY(Number(d.calories) || 0)} r="3" fill="#8b5cf6" />
      ))}
    </svg>
  );
}

function PostMealLineChart({ aggregate }) {
  const points = aggregate.slice(-8);
  if (points.length === 0) return null;
  const maxVal = Math.max(...points.flatMap((d) => [Number(d.avgEnergy) || 0, Number(d.avgHunger) || 0]), 5);
  const w = 320;
  const h = 120;
  const pad = 8;
  const toX = (i) => pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const toY = (v) => h - pad - (v / maxVal) * (h - pad * 2);
  const energyPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.avgEnergy) || 0)}`).join(' ');
  const hungerPath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(Number(d.avgHunger) || 0)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md h-32">
      <path d={hungerPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
      <path d={energyPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
      {points.map((d, i) => (
        <circle key={d.weekStart} cx={toX(i)} cy={toY(Number(d.avgEnergy) || 0)} r="3" fill="#10b981" />
      ))}
    </svg>
  );
}

function WeeklySummaryForm({ clientId, adherence }) {
  const [text, setText] = useState('');
  const [nextNote, setNextNote] = useState('');
  const [saving, setSaving] = useState(false);
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const submit = async () => {
    setSaving(true);
    try {
      await workspaceService.createWeeklySummary({
        clientId,
        weekStartDate: weekStartStr,
        summaryText: text,
        adherenceRate: adherence != null ? Number(adherence) : undefined,
        nextPlanNote: nextNote,
      });
      toast.success('Đã gửi tổng kết tuần');
      setText('');
      setNextNote('');
    } catch {
      toast.error('Không gửi được tổng kết');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <p className="text-sm font-bold text-slate-600">Tổng kết tuần cho học viên</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Nhận xét tuần này..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <textarea value={nextNote} onChange={(e) => setNextNote(e.target.value)} rows={2} placeholder="Ghi chú thực đơn tuần tới..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <Button onClick={submit} disabled={saving || !text.trim()}>Gửi tổng kết</Button>
      </CardContent>
    </Card>
  );
}

export default function ClientProgressPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await workspaceService.getClientProgress(clientId);
        setData(res.data.data);
      } catch {
        toast.error('Không tải được tiến độ học viên');
      } finally {
        setLoading(false);
      }
    };
    if (clientId) load();
  }, [clientId]);

  const summary = data?.macroSummary;
  const weights = data?.bodyMetrics || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/pt/clients')} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Button>
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        {data?.clientName || 'Tiến độ học viên'}
      </h1>
      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-sm text-slate-500">Calories TB/ngày</p>
              <p className="text-2xl font-bold">{summary?.avgCalories ?? '—'}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-sm text-slate-500">Protein TB</p>
              <p className="text-2xl font-bold">{summary?.avgProtein ?? '—'}g</p>
            </CardContent></Card>
            <Card><CardContent className="p-5 flex justify-center">
              <AdherenceDonut percent={summary?.mealPlanAdherenceRate} />
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-sm text-slate-500 flex items-center gap-1"><Utensils className="w-3.5 h-3.5" /> Log adherence</p>
              <p className="text-2xl font-bold">{summary?.adherenceRate != null ? `${summary.adherenceRate}%` : '—'}</p>
            </CardContent></Card>
          </div>

          <ProgressTimelineCard
            goals={data?.goals}
            milestones={data?.milestones}
            regressionAlert={data?.regressionAlert}
            projectedCompletion={data?.projectedCompletion}
            bodyMetrics={weights}
          />

          {data?.calorieHistory?.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-bold text-slate-600 mb-3">Calories vs target (7 ngày)</p>
                <CalorieLineChart history={data.calorieHistory} />
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-500" /> Thực tế</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300 border-dashed" /> Mục tiêu</span>
                </div>
              </CardContent>
            </Card>
          )}

          {data?.postMealAggregate?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-bold text-slate-600">Phản hồi sau bữa ăn (TB/tuần)</p>
                <PostMealLineChart aggregate={data.postMealAggregate} />
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500" /> Năng lượng</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 border-dashed" /> No</span>
                </div>
                {data.postMealAggregate.map((w) => (
                  <div key={w.weekStart} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Tuần {w.weekStart}</span>
                    <span>Năng lượng: <strong>{w.avgEnergy}</strong> · No: <strong>{w.avgHunger}</strong> ({w.sampleCount} mẫu)</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data?.skipReasons?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-bold text-slate-600">Món bỏ qua trong thực đơn</p>
                {data.skipReasons.map((s) => (
                  <div key={s.itemId} className="text-sm p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <strong>{s.foodLabel}</strong> ({s.planDate}) — {s.skipReason}
                    {s.skipNote && <span className="text-slate-500"> · {s.skipNote}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data?.pendingSuggestions?.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-bold text-slate-600">Đề nghị thay món chờ duyệt</p>
                {data.pendingSuggestions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-violet-50 border border-violet-100">
                    <span>{s.suggestedFoodName} {s.suggestedGram ? `(${s.suggestedGram}g)` : ''}</span>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={async () => {
                        try {
                          await workspaceService.reviewMealPlanSuggestion(s.id, { action: 'APPROVE' });
                          toast.success('Đã duyệt');
                          const res = await workspaceService.getClientProgress(clientId);
                          setData(res.data.data);
                        } catch { toast.error('Lỗi duyệt'); }
                      }}>Duyệt</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          await workspaceService.reviewMealPlanSuggestion(s.id, { action: 'REJECT' });
                          toast.success('Đã từ chối');
                          const res = await workspaceService.getClientProgress(clientId);
                          setData(res.data.data);
                        } catch { toast.error('Lỗi'); }
                      }}>Từ chối</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <WeeklySummaryForm clientId={clientId} adherence={summary?.mealPlanAdherenceRate} />
        </>
      )}
    </div>
  );
}
