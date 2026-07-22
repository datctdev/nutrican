import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Flame, Target, TrendingUp } from 'lucide-react';

const STATUS_LABEL = {
  UNDER: 'Dưới mục tiêu',
  ON_TARGET: 'Đúng mục tiêu',
  OVER: 'Vượt mục tiêu',
};

export default function ChatContextCard({ context, onViewDiet }) {
  if (!context) return null;

  const statusLabel = STATUS_LABEL[context.intakeStatus] || context.intakeStatus || '—';

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Ngữ cảnh hôm nay
          </h4>
          {context.date && (
            <span className="text-[10px] font-semibold text-slate-400">
              {new Date(context.date).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-2.5">
            <p className="text-orange-700/70 font-bold uppercase text-[10px] flex items-center gap-1">
              <Flame className="w-3 h-3" /> Calo
            </p>
            <p className="text-lg font-black text-orange-900">{context.calories ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5">
            <p className="text-blue-700/70 font-bold uppercase text-[10px] flex items-center gap-1">
              <Target className="w-3 h-3" /> Mục tiêu
            </p>
            <p className="text-lg font-black text-blue-900">{context.calorieTarget ?? '—'}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          P {context.protein ?? 0}g · C {context.carbs ?? 0}g · F {context.fat ?? 0}g
        </p>
        <p className="text-xs font-semibold text-slate-500">{statusLabel}</p>

        {onViewDiet && (
          <Button variant="outline" size="sm" onClick={onViewDiet} className="w-full rounded-xl text-xs">
            Xem nhật ký hôm nay
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
