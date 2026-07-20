// src/components/diet/DayTimelineView.jsx
import { Lock, CheckCircle2 } from 'lucide-react';
import { MEAL_PERIODS, MEAL_PERIOD_LABELS } from '../../pages/customer/components/dietUtils';
import MealPeriodBlock from './timeline/MealPeriodBlock';

export default function DayTimelineView({
    timeline,
    mode = 'customer',
    readOnly = mode === 'pt',
    onReviewLog,
    logHandlers = {},
    selectedDate = null,
    isFuture = false,
    isPast = false,
    vnNow = null,
    coachedMode = null,
    hasActivePt = false,
}) {
    const periods = timeline?.periods || [];
    const byPeriod = Object.fromEntries(MEAL_PERIODS.map((p) => [p, null]));
    periods.forEach((block) => {
        if (block?.mealPeriod) byPeriod[block.mealPeriod] = block;
    });

    const effectiveCoached = coachedMode ?? Boolean(timeline?.hasPtPlan);
    const effectiveHasPt = hasActivePt || mode === 'pt';

    const hasAny = periods.some((p) => (p.plannedItems?.length || 0) + (p.actualLogs?.length || 0) > 0);
    if (!hasAny) {
        return (
            <p className="text-sm text-slate-500 text-center py-6">
                {mode === 'pt' ? 'Học viên chưa có kế hoạch hoặc nhật ký trong ngày này.' : 'Chưa có dữ liệu cho ngày này.'}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-[10px] text-slate-500 flex flex-wrap items-center gap-3 pb-1">
                <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3 text-blue-600" /> Kế hoạch</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Thực tế</span>
            </p>
            {MEAL_PERIODS.map((period) => {
                const block = byPeriod[period];
                const planned = block?.plannedItems || [];
                const actual = block?.actualLogs || [];
                if (!planned.length && !actual.length) return null;

                const isCurrent = block?.windowStatus === 'current';
                const isPastPeriod = block?.windowStatus === 'past';
                const isFuturePeriod = block?.windowStatus === 'future';

                return (
                    <MealPeriodBlock
                        key={period}
                        period={period}
                        label={block?.labelVi || MEAL_PERIOD_LABELS[period]}
                        plannedItems={planned}
                        actualLogs={actual}
                        reconciliation={block?.reconciliation}
                        coachedMode={effectiveCoached}
                        hasActivePt={effectiveHasPt}
                        readOnly={readOnly}
                        isCurrentPeriod={isCurrent}
                        isPastPeriod={isPastPeriod}
                        isFuturePeriod={isFuturePeriod}
                        selectedDate={selectedDate || timeline?.date}
                        isFuture={isFuture}
                        isPast={isPast}
                        vnNow={vnNow}
                        onReviewLog={onReviewLog}
                        logHandlers={logHandlers}
                    />
                );
            })}
        </div>
    );
}
