import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Flame, Target, TrendingUp } from 'lucide-react';

/** Map IntakeStatus enum → tiếng Việt dễ hiểu (không hiện code EN). */
const STATUS_LABEL = {
  OK: 'Đúng mục tiêu',
  ON_TARGET: 'Đúng mục tiêu',
  UNDER: 'Ăn thiếu calo',
  UNDER_INTAKE: 'Ăn thiếu calo',
  OVER: 'Vượt calo',
  OVER_MACRO: 'Vượt macro / calo',
  AT_RISK: 'Cần chú ý (ăn thiếu liên tục)',
};

const STATUS_TONE = {
  OK: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  ON_TARGET: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  UNDER: 'text-amber-800 bg-amber-50 border-amber-100',
  UNDER_INTAKE: 'text-amber-800 bg-amber-50 border-amber-100',
  OVER: 'text-rose-700 bg-rose-50 border-rose-100',
  OVER_MACRO: 'text-rose-700 bg-rose-50 border-rose-100',
  AT_RISK: 'text-red-800 bg-red-50 border-red-100',
};

function formatKcal(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Math.round(Number(v)).toLocaleString('vi-VN');
}

export default function ChatContextCard({ context, onViewDiet }) {
  if (!context) return null;

  const raw = context.intakeStatus;
  const statusLabel = STATUS_LABEL[raw] || 'Chưa có dữ liệu hôm nay';
  const tone = STATUS_TONE[raw] || 'text-slate-600 bg-slate-50 border-slate-100';

  return (
    <Card className="border-slate-200/80 shadow-md shadow-slate-200/40 rounded-2xl overflow-hidden bg-gradient-to-b from-white to-slate-50/80">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
            Ngữ cảnh hôm nay
          </h4>
          {context.date && (
            <span className="text-[10px] font-semibold text-slate-400">
              {new Date(context.date).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-orange-50/90 border border-orange-100 p-2.5 shadow-sm">
            <p className="text-orange-700/70 font-bold uppercase text-[10px] flex items-center gap-1">
              <Flame className="w-3 h-3" /> Đã ăn
            </p>
            <p className="text-lg font-black text-orange-900 tabular-nums">{formatKcal(context.calories)}</p>
            <p className="text-[10px] text-orange-700/60">kcal</p>
          </div>
          <div className="rounded-xl bg-blue-50/90 border border-blue-100 p-2.5 shadow-sm">
            <p className="text-blue-700/70 font-bold uppercase text-[10px] flex items-center gap-1">
              <Target className="w-3 h-3" /> Mục tiêu
            </p>
            <p className="text-lg font-black text-blue-900 tabular-nums">{formatKcal(context.calorieTarget)}</p>
            <p className="text-[10px] text-blue-700/60">kcal/ngày</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Đạm {Number(context.protein ?? 0).toFixed(0)}g · Carb {Number(context.carbs ?? 0).toFixed(0)}g · Béo {Number(context.fat ?? 0).toFixed(0)}g
        </p>
        <p className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border inline-flex ${tone}`}>
          {statusLabel}
        </p>

        {onViewDiet && (
          <Button variant="outline" size="sm" onClick={onViewDiet} className="w-full rounded-xl text-xs font-bold border-slate-200 hover:bg-white">
            Xem nhật ký hôm nay
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
