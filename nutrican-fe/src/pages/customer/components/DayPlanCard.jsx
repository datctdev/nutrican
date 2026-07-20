// src/pages/customer/components/DayPlanCard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Plus, Trash2, Check, Pencil, X, Send, Ban } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { dietService } from '../../../services/dietService';
import { mealPlanService } from '../../../services/mealPlanService';
import FoodSearchInput from './FoodSearchInput';
import { toast } from 'sonner';
import {
    computePlannedTotals,
    scaleFoodMacros,
    MEAL_PERIODS,
    MEAL_PERIOD_LABELS,
    periodToMealType,
    getCurrentMealPeriod,
    isMealPeriodOpen,
} from './dietUtils';

/** Display plan items by 5 UI periods. */
const PERIOD_ORDER = MEAL_PERIODS;

function resolvePlanItemPeriod(item) {
    if (item?.mealPeriod && MEAL_PERIODS.includes(item.mealPeriod)) return item.mealPeriod;
    if (item?.mealType === 'BREAKFAST') return 'MORNING';
    if (item?.mealType === 'LUNCH') return 'NOON';
    if (item?.mealType === 'DINNER') return 'EVENING';
    if (item?.mealType === 'SNACK') return 'AFTERNOON';
    return 'AFTERNOON';
}
export default function DayPlanCard({
    selectedDate,
    dietFilterOn = true,
    targetCalories,
    summary,
    hasActivePt = false,
    isFuture = false,
    onLogged,
    onPlannedTotalsChange,
}) {
    const [dayPlan, setDayPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addMealPeriod, setAddMealPeriod] = useState(() => getCurrentMealPeriod());
    const [showAdd, setShowAdd] = useState(false);
    const [pendingFood, setPendingFood] = useState(null);
    const [pendingQty, setPendingQty] = useState('');
    const [pendingId, setPendingId] = useState(null);
    const [editId, setEditId] = useState(null);
    const [editQty, setEditQty] = useState('');
    const [submission, setSubmission] = useState(null);
    const qtyDebounceRef = useRef(null);

    const refresh = useCallback(async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            const [planRes, subRes] = await Promise.all([
                dietService.getDayPlan(selectedDate),
                hasActivePt
                    ? dietService.getSelfPlanSubmission(selectedDate).catch(() => null)
                    : Promise.resolve(null),
            ]);
            setDayPlan(planRes.data?.data || null);
            // BE trả List — ưu tiên PENDING, không thì bản mới nhất theo ngày
            const raw = subRes?.data?.data;
            const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
            const chosen = list.find((s) => s.status === 'PENDING')
                || [...list].sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))[0]
                || null;
            setSubmission(chosen);
        } catch (err) {
            console.error('day-plan fetch failed', err);
            setDayPlan(null);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, hasActivePt]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const pendingLocked = submission?.status === 'PENDING';

    const draftMacros = useMemo(() => {
        if (!pendingFood) return null;
        const qty = Number(pendingQty) || Number(pendingFood.servingSizeG) || 100;
        return scaleFoodMacros(pendingFood, qty);
    }, [pendingFood, pendingQty]);

    const editDraft = useMemo(() => {
        if (!editId || !dayPlan?.items) return null;
        const item = dayPlan.items.find((i) => String(i.id) === String(editId));
        if (!item || item.source !== 'SELF') return null;
        const qty = Number(editQty);
        if (!qty || qty <= 0) return null;
        const baseQty = Number(item.quantityG) || 100;
        const ratio = qty / baseQty;
        return {
            mealType: item.mealType,
            calories: (Number(item.calories) || 0) * ratio,
            protein: (Number(item.protein) || 0) * ratio,
            carb: (Number(item.carb) || 0) * ratio,
            fat: (Number(item.fat) || 0) * ratio,
        };
    }, [editId, editQty, dayPlan]);

    useEffect(() => {
        if (!onPlannedTotalsChange) return;
        const clear = () => {
            if (qtyDebounceRef.current) clearTimeout(qtyDebounceRef.current);
        };
        clear();
        qtyDebounceRef.current = setTimeout(() => {
            const totals = computePlannedTotals(dayPlan?.items || [], {
                draftItem: draftMacros
                    ? { ...draftMacros, mealType: periodToMealType(addMealPeriod) }
                    : editDraft,
                excludeItemId: editId,
            });
            onPlannedTotalsChange(totals);
        }, 300);
        return clear;
    }, [dayPlan, draftMacros, editDraft, editId, addMealPeriod, onPlannedTotalsChange]);

    const visibleItems = useMemo(() => {
        const items = dayPlan?.items || [];
        const activeSelfMeals = new Set(
            items
                .filter((i) => i.source === 'SELF' && !i.applied && !i.eaten)
                .map((i) => i.mealType),
        );
        return items.filter((i) => {
            if (i.source === 'SELF' && i.applied) return false;
            if (i.source === 'PT' && activeSelfMeals.has(i.mealType) && i.sourceType !== 'SELF_OVERRIDE') {
                return false; // mute PT when SELF drafting same meal
            }
            return true;
        });
    }, [dayPlan]);

    const handleSelectFood = (food) => {
        setPendingFood(food);
        setPendingQty(String(Math.round(Number(food.servingSizeG) || 100)));
    };

    const handleConfirmAdd = async () => {
        if (!pendingFood) return;
        const qty = Number(pendingQty);
        if (!qty || qty <= 0) {
            toast.error('Số gam không hợp lệ');
            return;
        }
        try {
            await dietService.createSelfPlanItem({
                planDate: selectedDate,
                mealType: periodToMealType(addMealPeriod),
                mealPeriod: addMealPeriod,
                foodItemId: pendingFood.id,
                quantityG: qty,
            });
            toast.success('Đã thêm vào plan');
            setPendingFood(null);
            setShowAdd(false);
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thêm được món');
        }
    };

    const handleDelete = async (item) => {
        if (item.source !== 'SELF' || item.eaten || item.lockedByReview) return;
        setPendingId(item.id);
        try {
            await dietService.deleteSelfPlanItem(item.id);
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không xóa được');
        } finally {
            setPendingId(null);
        }
    };

    const handleSaveQty = async (item) => {
        const qty = Number(editQty);
        if (!qty || qty <= 0) {
            toast.error('Số gam không hợp lệ');
            return;
        }
        setPendingId(item.id);
        try {
            await dietService.updateSelfPlanItem(item.id, { quantityG: qty });
            setEditId(null);
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không cập nhật được');
        } finally {
            setPendingId(null);
        }
    };

    const handleMark = async (item) => {
        if (item.eaten || item.skipReason) return;
        if (!item.mealPeriod) {
            toast.error('Món plan thiếu khung giờ; sửa/thêm lại món');
            return;
        }
        if (!isMealPeriodOpen(selectedDate, item.mealPeriod)) {
            toast.error('Chỉ đánh dấu đã ăn trong khung giờ của buổi đó');
            return;
        }
        if (item.source === 'SELF' && hasActivePt) {
            toast.error('Gửi PT duyệt trước; ghi nhật ký sau khi được duyệt');
            return;
        }
        setPendingId(item.id);
        try {
            if (item.source === 'SELF') {
                await dietService.markSelfPlanEaten(item.id);
                toast.success('Đã ghi vào nhật ký');
                onLogged?.();
            } else if (item.sourceType === 'SELF_OVERRIDE') {
                await mealPlanService.markEaten(item.id, true);
                toast.success('Đã ghi vào nhật ký');
                onLogged?.();
            } else {
                await mealPlanService.markEaten(item.id, true);
                toast.success('Đã đánh dấu (tuân thủ — chưa ghi nhật ký)');
            }
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || err.userMessage || 'Không thực hiện được');
        } finally {
            setPendingId(null);
        }
    };

    const handleSubmit = async () => {
        try {
            await dietService.submitSelfPlan(selectedDate);
            toast.success('Đã gửi PT duyệt');
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không gửi được');
        }
    };

    const handleCancel = async () => {
        if (!submission?.id) return;
        try {
            await dietService.cancelSelfPlanSubmission(submission.id);
            toast.success('Đã hủy gửi duyệt');
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không hủy được');
        }
    };

    if (loading && !dayPlan) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
                <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
        );
    }

    const totalKcal = Math.round(Number(dayPlan?.totalCalories) || 0);
    const target = Math.round(Number(targetCalories ?? summary?.targetCalories) || 0);
    const hasSelfDraft = (dayPlan?.items || []).some(
        (i) => i.source === 'SELF' && !i.applied && !i.eaten,
    );

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-base font-extrabold text-slate-800">Plan ăn ngày</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {totalKcal} kcal dự kiến
                        {target > 0 ? ` · mục tiêu ${target} kcal` : ''}
                        {dayPlan?.hasPtPlan ? ' · có thực đơn từ PT' : ''}
                    </p>
                    {hasActivePt && (
                        <p className="text-[11px] text-slate-400 mt-1">
                            Ngày đặc biệt… Chỉ bữa đã thêm thay thực đơn PT. Ghi nhật ký sau khi PT duyệt.
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {hasActivePt && hasSelfDraft && !pendingLocked && (
                        <Button type="button" size="sm" onClick={handleSubmit} className="rounded-xl">
                            <Send className="w-3.5 h-3.5 mr-1" /> Gửi PT duyệt
                        </Button>
                    )}
                    {pendingLocked && (
                        <Button type="button" size="sm" variant="outline" onClick={handleCancel} className="rounded-xl">
                            <Ban className="w-3.5 h-3.5 mr-1" /> Hủy gửi
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingLocked}
                        onClick={() => setShowAdd((v) => !v)}
                        className="rounded-xl border-primary/25 text-primary"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Thêm món
                    </Button>
                </div>
            </div>

            {submission?.status && (
                <div className={`text-xs font-semibold px-3 py-2 rounded-xl border ${
                    submission.status === 'PENDING' ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : submission.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-800'
                            : submission.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
                >
                    Trạng thái: {submission.status}
                    {submission.ptNote && <span className="block mt-1 font-medium">PT: {submission.ptNote}</span>}
                </div>
            )}

            {showAdd && !pendingLocked && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                    <select
                        value={addMealPeriod}
                        onChange={(e) => setAddMealPeriod(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                    >
                        {MEAL_PERIODS.map((period) => (
                            <option key={period} value={period}>{MEAL_PERIOD_LABELS[period]}</option>
                        ))}
                    </select>
                    {!pendingFood ? (
                        <FoodSearchInput dietFilter={dietFilterOn} onSelect={handleSelectFood} />
                    ) : (
                        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-3">
                            <span className="text-sm font-semibold flex-1 truncate">{pendingFood.nameVi}</span>
                            <input
                                type="number"
                                min="1"
                                value={pendingQty}
                                onChange={(e) => setPendingQty(e.target.value)}
                                className="w-20 px-2 py-1.5 rounded-lg border text-sm text-right"
                            />
                            <span className="text-xs text-slate-400">g</span>
                            {draftMacros && (
                                <span className="text-xs text-slate-500">{Math.round(draftMacros.calories)} kcal</span>
                            )}
                            <Button type="button" size="sm" onClick={handleConfirmAdd} className="rounded-lg h-8">
                                Thêm
                            </Button>
                            <button type="button" onClick={() => setPendingFood(null)} className="p-1.5 text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {(!visibleItems.length) && !showAdd && (
                <p className="text-sm text-slate-500 text-center py-6">
                    Chưa có món trong plan. Bấm &ldquo;Thêm món&rdquo; để tự lên kế hoạch.
                </p>
            )}

            {PERIOD_ORDER.map((period) => {
                const items = visibleItems.filter((i) => resolvePlanItemPeriod(i) === period);
                if (!items.length) return null;
                return (
                    <div key={period} className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            {MEAL_PERIOD_LABELS[period]}
                        </h4>
                        <ul className="space-y-2">
                            {items.map((item) => {
                                const skipped = Boolean(item.skipReason);
                                const busy = pendingId === item.id;
                                const isSelf = item.source === 'SELF';
                                const isOverride = item.sourceType === 'SELF_OVERRIDE';
                                const editing = editId === item.id;
                                const canEditSelf = isSelf && !item.eaten && !item.lockedByReview && !pendingLocked;
                                const periodOpen = Boolean(item.mealPeriod)
                                    && isMealPeriodOpen(selectedDate, item.mealPeriod);
                                const showSelfEat = isSelf && !hasActivePt && !item.eaten && !isFuture && periodOpen;
                                const showOverrideEat = !isSelf && isOverride && !item.eaten && !skipped && !isFuture && periodOpen;
                                const showPtMark = !isSelf && !isOverride && !item.eaten && !skipped && !isFuture && periodOpen;

                                return (
                                    <li
                                        key={`${item.source}-${item.id}`}
                                        className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 ${
                                            item.eaten ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-200'
                                        } ${skipped ? 'opacity-50' : ''}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-semibold text-slate-800 truncate ${item.eaten ? 'line-through' : ''}`}>
                                                {item.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                                {!isSelf && (
                                                    <span className="inline-flex items-center gap-0.5 text-slate-400" title={isOverride ? 'Override từ plan tự soạn' : 'Đánh dấu tuân thủ — chưa ghi nhật ký'}>
                                                        <Lock className="w-3 h-3" /> {isOverride ? 'Từ PT (override)' : 'Từ PT'}
                                                    </span>
                                                )}
                                                {item.quantityG != null && <span>{Math.round(Number(item.quantityG))}g</span>}
                                                {item.calories != null && <span>· {Math.round(Number(item.calories))} kcal</span>}
                                                {skipped && <span>· đã bỏ qua</span>}
                                                {item.eaten && (isSelf || isOverride) && <span className="text-emerald-600">· đã ghi nhật ký</span>}
                                                {item.eaten && !isSelf && !isOverride && <span className="text-slate-500">· đã đánh dấu</span>}
                                                {item.lockedByReview && <span className="text-amber-600">· chờ duyệt</span>}
                                            </p>
                                        </div>

                                        {canEditSelf && editing && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editQty}
                                                    onChange={(e) => setEditQty(e.target.value)}
                                                    className="w-16 px-2 py-1 rounded-lg border text-sm text-right"
                                                />
                                                <button type="button" disabled={busy} onClick={() => handleSaveQty(item)} className="p-1.5 text-emerald-600">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => setEditId(null)} className="p-1.5 text-slate-400">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {canEditSelf && !editing && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        setEditId(item.id);
                                                        setEditQty(String(Math.round(Number(item.quantityG) || 100)));
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-primary"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-slate-400 hover:text-danger"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}

                                        {(showSelfEat || showOverrideEat) && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={busy}
                                                onClick={() => handleMark(item)}
                                                className="rounded-lg h-8 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                                            >
                                                Đã ăn ✓
                                            </Button>
                                        )}
                                        {showPtMark && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={busy}
                                                onClick={() => handleMark(item)}
                                                title="Đánh dấu tuân thủ — chưa ghi nhật ký"
                                                className="rounded-lg h-8 text-xs font-bold bg-slate-700 text-white hover:bg-slate-600"
                                            >
                                                Đã đánh dấu
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}
