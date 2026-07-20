import { Clock } from 'lucide-react';
import { MEAL_PERIOD_LABELS, formatMacroDisplay } from '../../../pages/customer/components/dietUtils';
import PeriodStatusChip from './PeriodStatusChip';
import PlanLane from './PlanLane';
import ActualLane from './ActualLane';

export default function MealPeriodBlock({
    period,
    label,
    plannedItems = [],
    actualLogs = [],
    reconciliation = null,
    coachedMode = false,
    hasActivePt = false,
    readOnly = false,
    windowStatus = null,
    isCurrentPeriod = false,
    isPastPeriod = false,
    isFuturePeriod = false,
    selectedDate,
    isFuture = false,
    isPast = false,
    vnNow,
    pendingLocked = false,
    periodSettled = false,
    periodHasPendingSelfReview = false,
    pendingId = null,
    editId = null,
    editQty = '',
    onEditQtyChange,
    onStartEdit,
    onCancelEdit,
    onSaveQty,
    onDelete,
    onMark,
    onReviewLog,
    logHandlers = {},
}) {
    const periodLabel = label || MEAL_PERIOD_LABELS[period] || period;
    const actualKcal = actualLogs.reduce(
        (s, l) => s + (Number(l.macrosJson?.calories) || 0),
        0,
    );

    if (!plannedItems.length && !actualLogs.length) return null;

    return (
        <section
            className={`rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-sm ${
                isCurrentPeriod ? 'ring-2 ring-violet-400/50 ring-offset-1' : ''
            }`}
            data-meal-period={period}
        >
            <header className="flex flex-wrap items-center gap-2 px-0.5">
                <h4 className="text-sm font-extrabold text-slate-800">{periodLabel}</h4>
                <PeriodStatusChip reconciliation={reconciliation} coachedMode={coachedMode} />
                {isCurrentPeriod && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Clock className="h-3 w-3" /> Đang diễn ra
                    </span>
                )}
                {isFuturePeriod && (
                    <span className="text-[10px] font-semibold text-slate-500">Sắp tới</span>
                )}
                {isPastPeriod && (
                    <span className="text-[10px] font-semibold text-amber-700">Đã qua</span>
                )}
                {actualLogs.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500 ml-auto">
                        {formatMacroDisplay(actualKcal)} kcal thực tế
                    </span>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <PlanLane
                    items={plannedItems}
                    readOnly={readOnly}
                    coachedMode={coachedMode}
                    selectedDate={selectedDate}
                    isFuture={isFuture}
                    isPast={isPast}
                    vnNow={vnNow}
                    pendingLocked={pendingLocked}
                    periodSettled={periodSettled}
                    periodHasPendingSelfReview={periodHasPendingSelfReview}
                    pendingId={pendingId}
                    editId={editId}
                    editQty={editQty}
                    onEditQtyChange={onEditQtyChange}
                    onStartEdit={onStartEdit}
                    onCancelEdit={onCancelEdit}
                    onSaveQty={onSaveQty}
                    onDelete={onDelete}
                    onMark={onMark}
                />
                <ActualLane
                    logs={actualLogs}
                    readOnly={readOnly}
                    hasActivePt={hasActivePt}
                    isPast={isPast}
                    onReviewLog={onReviewLog}
                    logHandlers={logHandlers}
                />
            </div>
        </section>
    );
}
