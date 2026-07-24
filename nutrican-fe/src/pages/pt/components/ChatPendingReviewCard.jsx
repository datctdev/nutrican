import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { ClipboardCheck, Loader2 } from 'lucide-react';

const PERIOD_VI = {
  MORNING: 'Sáng',
  NOON: 'Trưa',
  AFTERNOON: 'Chiều',
  EVENING: 'Tối',
  LATE: 'Khuya',
};

function mealLabel(log) {
  return log.foodDescription || log.matchedFoodName || log.foodName || log.recognizedFoodName || 'Bữa ăn';
}

function kcalOf(log) {
  const c = log.calories ?? log.macrosJson?.calories ?? log.macrosJson?.kcal;
  if (c == null || Number.isNaN(Number(c))) return null;
  return Math.round(Number(c));
}

export default function ChatPendingReviewCard({
  logs = [],
  loading,
  reviewingLogId,
  onApprove,
  onAdjust,
  onOpenFull,
}) {
  return (
    <Card className="border-slate-200/80 shadow-md shadow-amber-100/50 rounded-2xl overflow-hidden bg-gradient-to-b from-white to-amber-50/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </span>
            Duyệt bữa ăn
          </h4>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2.5 py-0.5 rounded-full">
            {logs.length} chờ
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">Không có bữa nào chờ duyệt.</p>
        ) : (
          <>
          <p className="text-[10px] font-medium text-slate-500">
            Chỉ số sai? Chọn “Chỉnh lại” để nhập calo/macro đúng — bữa ăn vẫn được tính cho học viên.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log) => {
              const kcal = kcalOf(log);
              const period = PERIOD_VI[log.mealPeriod] || log.mealPeriod;
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-amber-100/80 bg-white p-2.5 space-y-2 shadow-sm"
                >
                  <p className="text-xs font-bold text-slate-800 line-clamp-2">{mealLabel(log)}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {kcal != null ? `${kcal.toLocaleString('vi-VN')} kcal` : '— kcal'}
                    {period ? ` · ${period}` : ''}
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      disabled={reviewingLogId === log.id}
                      onClick={() => onApprove?.(log.id)}
                      className="h-8 flex-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {reviewingLogId === log.id ? 'Đang lưu…' : 'Duyệt đúng'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewingLogId === log.id}
                      onClick={() => onAdjust?.(log.id)}
                      className="h-8 flex-1 text-[11px] font-bold rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Chỉnh lại
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}

        {onOpenFull && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFull}
            className="w-full rounded-xl text-xs font-bold border-slate-200"
          >
            Mở đầy đủ
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
