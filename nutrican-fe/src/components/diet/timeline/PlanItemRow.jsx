import { useState } from 'react';
import {
    Lock, Trash2, Check, Pencil, X, Clock, CheckCircle2, AlertCircle,
    ChevronDown, ChevronUp, Utensils,
} from 'lucide-react';
import { Button } from '../../ui/button';
import {
    isMealPeriodOpen,
    canLateTickMealPeriod,
    isFutureMealPeriod,
    isTodayIso,
    formatMacroDisplay,
} from '../../../pages/customer/components/dietUtils';
import {
    getReconcileStatusLabel,
    getChoiceRejectedLabel,
    isPlanChoiceRejected,
} from '../../../pages/customer/components/planLabels';
import { stripDisplayPrefix, getPlanBadgeShort } from './timelineVisuals';

function PlanMacroDetails({ item }) {
    const hasMacros = item.calories != null || item.protein != null || item.carb != null || item.fat != null;
    if (!hasMacros && item.quantityG == null) {
        return <p className="text-[11px] text-slate-400 italic">Chưa có dữ liệu dinh dưỡng</p>;
    }
    return (
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            {item.calories != null && (
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {formatMacroDisplay(item.calories)} kcal
                </span>
            )}
            {item.quantityG != null && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {formatMacroDisplay(item.quantityG, 0)}g
                </span>
            )}
            {item.protein != null && (
                <span className="text-blue-600">{formatMacroDisplay(item.protein)}g Pro</span>
            )}
            {(item.carb != null) && (
                <span className="text-amber-600">{formatMacroDisplay(item.carb)}g Carb</span>
            )}
            {item.fat != null && (
                <span className="text-rose-600">{formatMacroDisplay(item.fat)}g Fat</span>
            )}
        </div>
    );
}


export default function PlanItemRow({
    item,
    selectedDate,
    coachedMode = false,
    isFuture = false,
    isPast = false,
    vnNow,
    pendingLocked = false,
    periodSettled = false,
    periodHasPendingSelfReview = false,
    busy = false,
    editing = false,
    editQty = '',
    onEditQtyChange,
    onStartEdit,
    onCancelEdit,
    onSaveQty,
    onDelete,
    onMark,
    canEditSelf = false,
}) {
    const [expanded, setExpanded] = useState(false);
    const skipped = Boolean(item.skipReason) && item.skipReason !== 'SUPERSEDED';
    const isSelf = item.source === 'SELF';
    const isOverride = item.sourceType === 'SELF_OVERRIDE';
    const notChosen = isPlanChoiceRejected(item);
    const periodOpen = Boolean(item.mealPeriod)
        && isMealPeriodOpen(selectedDate, item.mealPeriod, vnNow);
    const canLateTick = canLateTickMealPeriod(selectedDate, item.mealPeriod, vnNow);
    const pendingReview = Boolean(item.lockedByReview);
    const isToday = isTodayIso(selectedDate);

    const showSelfEat = isSelf && !coachedMode && !pendingReview && !item.eaten
        && !isFuture && !isPast && (periodOpen || canLateTick);
    const showOverrideEat = !isSelf && isOverride && !pendingReview && !item.eaten && !skipped
        && !isFuture && !isPast && (periodOpen || canLateTick);
    const showPtMark = !isSelf && !isOverride && !item.eaten && !skipped && !notChosen
        && !isFuture && !isPast && (periodOpen || canLateTick)
        && !periodHasPendingSelfReview;
    const showFutureWait = isToday && !item.eaten && !skipped && !isFuture && !isPast
        && item.mealPeriod && isFutureMealPeriod(item.mealPeriod, vnNow);

    const badge = getPlanBadgeShort(item, coachedMode);
    const displayName = stripDisplayPrefix(item.name);
    const reconcileLabel = getReconcileStatusLabel(item.reconcileStatus);

    return (
        <li
            className={`rounded-lg border border-slate-200/80 bg-white overflow-hidden ${
                item.eaten && !notChosen ? 'ring-1 ring-emerald-200' : ''
            } ${notChosen ? 'opacity-70' : ''} ${skipped ? 'opacity-50' : ''}`}
        >
            <div className="flex items-stretch gap-1">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="min-w-0 flex-1 flex items-center gap-2 px-2.5 py-2 text-left hover:bg-blue-50/50 transition-colors"
                    aria-expanded={expanded}
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                        {badge.showLock ? <Lock className="h-3.5 w-3.5" /> : <Utensils className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-bold truncate ${notChosen ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {displayName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1">
                            <span
                                className={`inline-flex items-center rounded px-1 py-0.5 font-bold ${badge.className}`}
                                title={badge.title}
                            >
                                {badge.label}
                            </span>
                            {item.calories != null && (
                                <span>{formatMacroDisplay(item.calories)} kcal</span>
                            )}
                            {item.eaten && !notChosen && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 inline" aria-label="Đã ăn" />
                            )}
                            {pendingReview && !notChosen && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-800">
                                    <Clock className="h-3 w-3" aria-hidden />
                                    chờ duyệt
                                </span>
                            )}
                            {item.lateTickReason && (
                                <AlertCircle className="h-3 w-3 text-orange-600 inline" aria-label="Tick trễ" />
                            )}
                        </span>
                    </span>
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                </button>

                <div className="flex items-center gap-0.5 pr-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {(showSelfEat || showOverrideEat) && (
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => onMark?.(item)}
                            className={`rounded-lg h-7 text-[11px] font-bold ${
                                periodOpen
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                            }`}
                        >
                            {periodOpen ? 'Đã ăn ✓' : 'Tick trễ'}
                        </Button>
                    )}
                    {showPtMark && (
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => onMark?.(item)}
                            title="Ghi nhận đã ăn theo plan PT"
                            className={`rounded-lg h-7 text-[11px] font-bold ${
                                periodOpen
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                            }`}
                        >
                            {periodOpen ? 'Đã ăn ✓' : 'Tick trễ'}
                        </Button>
                    )}
                    {showFutureWait && (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                        </span>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-slate-100 px-2.5 py-2.5 space-y-2 bg-slate-50/50">
                    <PlanMacroDetails item={item} />

                    {(item.eaten || pendingReview || item.lateTickReason || reconcileLabel || skipped) && (
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                            {item.eaten && !notChosen && (
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                                    ✓ {isSelf || isOverride ? 'đã ghi nhật ký' : 'đã ăn theo plan'}
                                </span>
                            )}
                            {pendingReview && !notChosen && (
                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                                    Chờ PT duyệt
                                </span>
                            )}
                            {item.lateTickReason && (
                                <span className="rounded-md bg-orange-100 px-1.5 py-0.5 font-medium text-orange-800">
                                    Tick trễ: {item.lateTickReason}
                                </span>
                            )}
                            {reconcileLabel && (
                                <span className="rounded-md bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800">
                                    {reconcileLabel}
                                </span>
                            )}
                            {skipped && item.skipReason !== 'SUPERSEDED' && (
                                <span className="text-slate-500">· đã bỏ qua</span>
                            )}
                        </div>
                    )}

                    {canEditSelf && editing && (
                        <div className="flex items-center gap-1">
                            <label className="text-[11px] text-slate-500 font-medium">Khối lượng (g)</label>
                            <input
                                type="number"
                                min="1"
                                value={editQty}
                                onChange={(e) => onEditQtyChange?.(e.target.value)}
                                className="w-16 px-2 py-1 rounded-lg border text-sm text-right"
                            />
                            <button type="button" disabled={busy} onClick={() => onSaveQty?.(item)} className="p-1 text-emerald-600">
                                <Check className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={onCancelEdit} className="p-1 text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {canEditSelf && !editing && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onStartEdit?.(item)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Sửa khối lượng
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onDelete?.(item)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                            </button>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}


export function RejectedPlanItems({ items }) {
    const [open, setOpen] = useState(false);
    if (!items?.length) return null;
    return (
        <div className="mt-1">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700"
            >
                {open ? '▾' : '▸'} {items.length} món không được chọn
            </button>
            {open && (
                <ul className="mt-1 space-y-1">
                    {items.map((item) => (
                        <li
                            key={`rej-${item.source}-${item.id}`}
                            className="text-[11px] text-slate-400 line-through px-2"
                            title={getChoiceRejectedLabel(item) || ''}
                        >
                            {stripDisplayPrefix(item.name)}
                            {item.calories != null && ` · ${formatMacroDisplay(item.calories)} kcal`}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
