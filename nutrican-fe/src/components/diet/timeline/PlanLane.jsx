import { Lock, ClipboardList } from 'lucide-react';
import PlanItemRow, { RejectedPlanItems } from './PlanItemRow';
import { LANE_PLAN_CLASS } from './timelineVisuals';
import { isPlanChoiceRejected } from '../../../pages/customer/components/planLabels';

export default function PlanLane({
    items = [],
    rejectedItems = [],
    readOnly = false,
    coachedMode = false,
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
}) {
    const activeItems = items.filter((i) => !isPlanChoiceRejected(i));
    const collapsedRejected = rejectedItems.length
        ? rejectedItems
        : items.filter((i) => isPlanChoiceRejected(i));

    const empty = activeItems.length === 0 && collapsedRejected.length === 0;
    const PlanIcon = coachedMode ? Lock : ClipboardList;

    return (
        <div className={`p-2.5 space-y-1.5 min-h-[4rem] ${LANE_PLAN_CLASS}`} aria-label="Kế hoạch">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                <PlanIcon className="h-3 w-3" /> Kế hoạch
            </p>
            {empty ? (
                <p className="text-[11px] text-slate-400 italic py-2">Chưa có kế hoạch</p>
            ) : (
                <>
                    <ul className="space-y-1.5">
                        {activeItems.map((item) => {
                            const isSelf = item.source === 'SELF';
                            const canEditSelf = !readOnly && !isPast && isSelf && !item.eaten
                                && !item.lockedByReview && !isPlanChoiceRejected(item)
                                && !periodHasPendingSelfReview && !periodSettled;
                            return (
                                <PlanItemRow
                                    key={`${item.source}-${item.id}`}
                                    item={item}
                                    selectedDate={selectedDate}
                                    coachedMode={coachedMode}
                                    isFuture={isFuture}
                                    isPast={isPast}
                                    vnNow={vnNow}
                                    pendingLocked={pendingLocked}
                                    periodSettled={periodSettled}
                                    periodHasPendingSelfReview={periodHasPendingSelfReview}
                                    busy={pendingId === item.id}
                                    editing={editId === item.id}
                                    editQty={editQty}
                                    onEditQtyChange={onEditQtyChange}
                                    onStartEdit={onStartEdit}
                                    onCancelEdit={onCancelEdit}
                                    onSaveQty={onSaveQty}
                                    onDelete={onDelete}
                                    onMark={onMark}
                                    canEditSelf={canEditSelf}
                                />
                            );
                        })}
                    </ul>
                    <RejectedPlanItems items={collapsedRejected} />
                </>
            )}
        </div>
    );
}
