// src/pages/customer/components/DayPlanCard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Plus, Trash2, Check, Pencil, X, Send, Ban, CalendarDays, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { dietService } from '../../../services/dietService';
import { mealPlanService } from '../../../services/mealPlanService';
import FoodSearchInput from './FoodSearchInput';
import { toast } from 'sonner';
import {
    computePlannedTotals,
    computePlanProgressBreakdown,
    scaleFoodMacros,
    MEAL_PERIODS,
    MEAL_PERIOD_LABELS,
    periodToMealType,
    getCurrentMealPeriod,
    isMealPeriodOpen,
    canLateTickMealPeriod,
    isMealPeriodPast,
    isFutureMealPeriod,
    isMealPeriodSettled,
    nowInVn,
    resolvePlanItemPeriod,
    isPastIso,
    isTodayIso,
} from './dietUtils';
import {
    getPlanSourceLabel,
    getSubmissionStatusLabel,
    getReconcileStatusLabel,
    getChoiceRejectedLabel,
    isPlanChoiceRejected,
    stripMealPeriodSuffix,
    MEAL_PERIOD_THEMES,
    getSourceBadgeClass,
} from './planLabels';
import LateTickReasonModal from './LateTickReasonModal';

/** Display plan items by 5 UI periods. */
const PERIOD_ORDER = MEAL_PERIODS;
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
    const [lateTickTarget, setLateTickTarget] = useState(null);
    const qtyDebounceRef = useRef(null);
    const isPast = isPastIso(selectedDate);
    const isToday = isTodayIso(selectedDate);
    const vnNow = nowInVn();
    const currentPeriod = getCurrentMealPeriod(vnNow);

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
            const totals = computePlanProgressBreakdown(dayPlan?.items || [], {
                draftItem: draftMacros
                    ? { ...draftMacros, mealType: periodToMealType(addMealPeriod), mealPeriod: addMealPeriod }
                    : editDraft,
                excludeItemId: editId,
                dateIso: selectedDate,
                coachedMode: hasActivePt,
            });
            onPlannedTotalsChange(totals);
        }, 300);
        return clear;
    }, [dayPlan, draftMacros, editDraft, editId, addMealPeriod, onPlannedTotalsChange, selectedDate]);

    const planProgress = useMemo(
        () => computePlanProgressBreakdown(dayPlan?.items || [], { dateIso: selectedDate, coachedMode: hasActivePt }),
        [dayPlan, selectedDate, hasActivePt],
    );

    const visibleItems = useMemo(() => {
        const items = dayPlan?.items || [];
        return items.filter((i) => !(i.source === 'SELF' && i.applied));
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
        if (isPast || item.source !== 'SELF' || item.eaten || item.lockedByReview) return;
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
        if (isPast) return;
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

    const submitMark = async (item, lateTickReason = null) => {
        if (!item.mealPeriod) {
            toast.error('Món plan thiếu khung giờ; sửa/thêm lại món');
            return;
        }
        if (isFuture) {
            toast.error('Ngày tương lai chưa thể đánh dấu');
            return;
        }
        if (isPast) {
            toast.error('Ngày đã qua - chỉ xem kế hoạch');
            return;
        }
        const periodOpen = isMealPeriodOpen(selectedDate, item.mealPeriod, vnNow);
        const canLateTick = canLateTickMealPeriod(selectedDate, item.mealPeriod, vnNow);
        if (!periodOpen && !canLateTick) {
            toast.error('Chưa đến khung giờ của buổi này');
            return;
        }
        if (!periodOpen && !lateTickReason) {
            setLateTickTarget(item);
            return;
        }
        if (item.source === 'SELF' && hasActivePt) {
            toast.error('Gửi PT duyệt trước; ghi nhật ký sau khi được duyệt');
            return;
        }
        setPendingId(item.id);
        try {
            if (item.source === 'SELF') {
                await dietService.markSelfPlanEaten(item.id, lateTickReason || undefined);
                toast.success('Đã ghi vào nhật ký');
                onLogged?.();
            } else if (item.sourceType === 'SELF_OVERRIDE') {
                await mealPlanService.markEaten(item.id, true, lateTickReason || undefined);
                toast.success('Đã ghi vào nhật ký');
                onLogged?.();
            } else {
                await mealPlanService.markEaten(item.id, true, lateTickReason || undefined);
                toast.success('Đã ăn ✓ (theo plan PT)');
            }
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || err.userMessage || 'Không thực hiện được');
        } finally {
            setPendingId(null);
        }
    };

    const handleMark = async (item) => {
        if (item.eaten || item.skipReason || isPlanChoiceRejected(item)) return;
        await submitMark(item);
    };

    const handleSubmit = async () => {
        const planItems = dayPlan?.items || [];
        const reviewable = planItems.filter(
            (i) => i.source === 'SELF' && !i.applied && !i.eaten && !i.lockedByReview
                && !isMealPeriodSettled(resolvePlanItemPeriod(i), planItems),
        );
        const periods = [...new Set(reviewable.map((i) => resolvePlanItemPeriod(i)).filter(Boolean))];
        try {
            await dietService.submitSelfPlan(selectedDate);
            if (periods.length === 1) {
                toast.success(`Đã gửi ${reviewable.length} đề xuất buổi ${MEAL_PERIOD_LABELS[periods[0]] || periods[0]}`);
            } else {
                toast.success(`Đã gửi ${reviewable.length} đề xuất cho PT duyệt`);
            }
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
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-md animate-pulse">
                <div className="h-5 w-40 bg-emerald-100 rounded mb-4" />
                <div className="h-16 bg-emerald-50 rounded-xl" />
            </div>
        );
    }

    const totalKcal = Math.round(Number(dayPlan?.totalCalories) || 0);
    const target = Math.round(Number(targetCalories ?? summary?.targetCalories) || 0);
    const consumedKcal = Math.round((Number(summary?.totalCalories) || 0) + (Number(planProgress.compliance?.calories) || 0));
    const pendingPlanKcal = Math.round(Number(planProgress.pending?.calories) || 0);
    const kcalProgress = target > 0 ? Math.min(100, Math.round((consumedKcal / target) * 100)) : 0;
    const planItems = dayPlan?.items || [];
    const hasSelfDraft = planItems.some(
        (i) => i.source === 'SELF' && !i.applied && !i.eaten && !i.lockedByReview
            && !isMealPeriodSettled(resolvePlanItemPeriod(i), planItems),
    );
    const unsentEveningDraft = planItems.some(
        (i) => i.source === 'SELF' && !i.applied && !i.eaten && !i.lockedByReview
            && resolvePlanItemPeriod(i) === 'EVENING'
            && !isMealPeriodSettled('EVENING', planItems),
    );

    return (
        <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/30 to-sky-50/40 p-5 shadow-md space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                            <CalendarDays className="h-4 w-4" />
                        </span>
                        <h3 className="text-lg font-extrabold text-slate-800">Plan ăn ngày</h3>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 pl-11">
                        <span className="font-bold text-emerald-700">{consumedKcal} kcal</span> đã nạp
                        {pendingPlanKcal > 0 && (
                            <>
                                {' · '}
                                <span className="font-semibold text-slate-500">+{pendingPlanKcal} kcal plan chưa ăn</span>
                            </>
                        )}
                        {target > 0 ? (
                            <>
                                {' · '}
                                <span className="font-semibold">mục tiêu {target} kcal</span>
                            </>
                        ) : ''}
                        {dayPlan?.hasPtPlan ? ' · có thực đơn từ PT' : ''}
                    </p>
                    {target > 0 && (
                        <div className="pl-11 pt-1 max-w-xs">
                            <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-sky-500 transition-all duration-500"
                                    style={{ width: `${kcalProgress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{kcalProgress}% mục tiêu calo</p>
                        </div>
                    )}
                    {hasActivePt && (
                        <p className="text-[11px] text-slate-500 mt-1 pl-11">
                            Thực đơn PT luôn hiển thị ở trên. Món bạn đề xuất sẽ nằm bên dưới để PT duyệt.
                        </p>
                    )}
                    {!hasActivePt && (
                        <p className="text-[11px] text-slate-500 mt-1 pl-11">
                            Tick món tự lên kế hoạch sẽ ghi ngay vào nhật ký. Nếu còn món PT cũ, tick đó chỉ là đánh dấu tuân thủ.
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {hasActivePt && hasSelfDraft && !pendingLocked && !isPast && (
                        <Button type="button" size="sm" onClick={handleSubmit} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm">
                            <Send className="w-3.5 h-3.5 mr-1" /> Gửi PT duyệt
                        </Button>
                    )}
                    {pendingLocked && (
                        <Button type="button" size="sm" variant="outline" onClick={handleCancel} className="rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50">
                            <Ban className="w-3.5 h-3.5 mr-1" /> Hủy gửi
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingLocked || isPast}
                        onClick={() => setShowAdd((v) => !v)}
                        className="rounded-xl border-teal-300 bg-white/80 text-teal-700 hover:bg-teal-50 shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-1" /> {hasActivePt ? 'Đề xuất món' : 'Thêm món'}
                    </Button>
                </div>
            </div>

            {isPast && (
                <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
                    Ngày đã qua — chỉ xem kế hoạch. Bạn vẫn có thể bù nhật ký ở phần bên dưới.
                </div>
            )}
            {isFuture && (
                <div className="rounded-2xl border border-blue-300/80 bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
                    Đây là ngày tương lai. Bạn có thể chuẩn bị trước kế hoạch trong tối đa 14 ngày nhưng chưa thể tick đã ăn.
                </div>
            )}

            {hasActivePt && unsentEveningDraft && !pendingLocked && !isPast && (
                <div className="rounded-2xl border border-indigo-300/80 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-sm font-semibold text-indigo-900 shadow-sm">
                    Buổi tối chưa gửi PT — bấm Gửi PT duyệt để PT xem đề xuất của bạn.
                </div>
            )}

            {submission?.status && (
                <div className={`text-xs font-bold px-4 py-2.5 rounded-2xl border shadow-sm ${
                    submission.status === 'PENDING' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 text-amber-900'
                        : submission.status === 'REJECTED' ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-900'
                            : submission.status === 'APPROVED' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
                >
                    Trạng thái: {getSubmissionStatusLabel(submission.status)}
                    {submission.ptNote && <span className="block mt-1 font-medium opacity-90">PT: {submission.ptNote}</span>}
                </div>
            )}

            {showAdd && !pendingLocked && !isPast && (
                <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-4 space-y-3 shadow-inner">
                    <select
                        value={addMealPeriod}
                        onChange={(e) => setAddMealPeriod(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 rounded-xl border border-teal-200 text-sm font-semibold bg-white"
                    >
                        {MEAL_PERIODS.map((period) => (
                            <option key={period} value={period}>{MEAL_PERIOD_LABELS[period]}</option>
                        ))}
                    </select>
                    {!pendingFood ? (
                        <FoodSearchInput dietFilter={dietFilterOn} onSelect={handleSelectFood} />
                    ) : (
                        <div className="flex flex-wrap items-center gap-2 bg-white border border-teal-200 rounded-xl p-3 shadow-sm">
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
                                <span className="text-xs font-semibold text-emerald-700">{Math.round(draftMacros.calories)} kcal</span>
                            )}
                            <Button type="button" size="sm" onClick={handleConfirmAdd} className="rounded-lg h-8 bg-teal-600 hover:bg-teal-700">
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
                const periodSettled = isMealPeriodSettled(period, planItems);
                const theme = MEAL_PERIOD_THEMES[period] || MEAL_PERIOD_THEMES.AFTERNOON;
                const isCurrentPeriod = isToday && period === currentPeriod;
                const isPastPeriod = isToday && isMealPeriodPast(selectedDate, period, vnNow);
                const isFuturePeriod = isToday && isFutureMealPeriod(period, vnNow);
                return (
                    <div
                        key={period}
                        className={`rounded-2xl border bg-gradient-to-br p-3 space-y-2 shadow-sm ${theme.section} ${isCurrentPeriod ? 'ring-2 ring-offset-1 ring-violet-400/60' : ''}`}
                    >
                        <div className="flex items-center justify-between gap-2 px-1">
                            <h4 className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ring-1 ${theme.badge}`}>
                                {MEAL_PERIOD_LABELS[period]}
                            </h4>
                            {isCurrentPeriod && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                    <Clock className="h-3 w-3" /> Đang diễn ra
                                </span>
                            )}
                            {isFuturePeriod && (
                                <span className="text-[10px] font-semibold text-slate-500">Sắp tới</span>
                            )}
                            {isPastPeriod && (
                                <span className="text-[10px] font-semibold text-amber-700">Đã qua</span>
                            )}
                        </div>
                        <ul className="space-y-2">
                            {items.map((item) => {
                                const skipped = Boolean(item.skipReason) && item.skipReason !== 'SUPERSEDED';
                                const busy = pendingId === item.id;
                                const isSelf = item.source === 'SELF';
                                const isOverride = item.sourceType === 'SELF_OVERRIDE';
                                const editing = editId === item.id;
                                const canEditSelf = !isPast && isSelf && !item.eaten && !item.lockedByReview && !pendingLocked
                                    && !periodSettled && !isPlanChoiceRejected(item);
                                const notChosen = isPlanChoiceRejected(item);
                                const periodOpen = Boolean(item.mealPeriod)
                                    && isMealPeriodOpen(selectedDate, item.mealPeriod, vnNow);
                                const canLateTick = canLateTickMealPeriod(selectedDate, item.mealPeriod, vnNow);
                                const showSelfEat = isSelf && !hasActivePt && !item.eaten && !isFuture && !isPast && (periodOpen || canLateTick);
                                const showOverrideEat = !isSelf && isOverride && !item.eaten && !skipped && !isFuture && !isPast && (periodOpen || canLateTick);
                                const showPtMark = !isSelf && !isOverride && !item.eaten && !skipped && !notChosen
                                    && !isFuture && !isPast && (periodOpen || canLateTick);
                                const showFutureWait = isToday && !item.eaten && !skipped && !isFuture && !isPast
                                    && item.mealPeriod && isFutureMealPeriod(item.mealPeriod, vnNow);

                                return (
                                    <li
                                        key={`${item.source}-${item.id}`}
                                        className={`flex flex-wrap items-center gap-2 rounded-xl border-l-4 px-3 py-2.5 shadow-sm transition-all ${
                                            theme.stripe
                                        } ${
                                            item.eaten && !notChosen
                                                ? 'bg-emerald-50/80 border-emerald-200'
                                                : notChosen
                                                    ? 'bg-slate-50/90 border-slate-200 opacity-80'
                                                    : 'bg-white/90 border-slate-200 hover:shadow-md'
                                        } ${skipped && skipped !== 'SUPERSEDED' ? 'opacity-50' : ''}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-bold truncate ${
                                                notChosen
                                                    ? 'line-through text-slate-400'
                                                    : item.eaten
                                                        ? 'text-slate-800'
                                                        : 'text-slate-800'
                                            }`}>
                                                {stripMealPeriodSuffix(item.name)}
                                            </p>
                                            <p className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5 mt-1">
                                                <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${getSourceBadgeClass(item)}`}>
                                                    {!isSelf && <Lock className="w-3 h-3" />} {getPlanSourceLabel(item)}
                                                </span>
                                                {item.quantityG != null && <span className="font-medium">{Math.round(Number(item.quantityG))}g</span>}
                                                {item.calories != null && <span className="font-semibold text-emerald-700">{Math.round(Number(item.calories))} kcal</span>}
                                                {skipped && item.skipReason !== 'SUPERSEDED' && (
                                                    <span className="text-slate-500">· đã bỏ qua</span>
                                                )}
                                                {notChosen && (
                                                    <span className="inline-flex items-center rounded-md bg-slate-200 px-1.5 py-0.5 font-bold text-slate-600">
                                                        {getChoiceRejectedLabel(item)}
                                                    </span>
                                                )}
                                                {item.eaten && (isSelf || isOverride) && (
                                                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                                                        ✓ đã ghi nhật ký
                                                    </span>
                                                )}
                                                {item.eaten && !isSelf && !isOverride && !notChosen && (
                                                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                                                        ✓ đã ăn
                                                    </span>
                                                )}
                                                {item.lockedByReview && !notChosen && (
                                                    <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">· chờ duyệt</span>
                                                )}
                                                {item.lateTickReason && (
                                                    <span className="inline-flex items-center rounded-md bg-orange-100 px-1.5 py-0.5 font-medium text-orange-800">
                                                        tick trễ: {item.lateTickReason}
                                                    </span>
                                                )}
                                                {getReconcileStatusLabel(item.reconcileStatus) && (
                                                    <span className="inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800">
                                                        {getReconcileStatusLabel(item.reconcileStatus)}
                                                    </span>
                                                )}
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
                                                    className="p-1.5 text-slate-400 hover:text-teal-600"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500"
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
                                                className={`rounded-lg h-8 text-xs font-bold shadow-sm ${
                                                    periodOpen
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
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
                                                onClick={() => handleMark(item)}
                                                title="Ghi nhận đã ăn theo plan PT"
                                                className={`rounded-lg h-8 text-xs font-bold shadow-sm ${
                                                    periodOpen
                                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                                                }`}
                                            >
                                                {periodOpen ? 'Đã ăn ✓' : 'Tick trễ'}
                                            </Button>
                                        )}
                                        {showFutureWait && (
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">
                                                <Clock className="h-3 w-3" /> Chưa đến giờ
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}

            <LateTickReasonModal
                open={!!lateTickTarget}
                loading={pendingId === lateTickTarget?.id}
                title="Ghi lý do tick trễ"
                description="Buổi này đã qua trong hôm nay. Lý do sẽ hiển thị để PT hiểu bối cảnh nếu cần theo dõi thêm."
                onClose={() => setLateTickTarget(null)}
                onSubmit={async (reason) => {
                    const targetItem = lateTickTarget;
                    setLateTickTarget(null);
                    if (targetItem) {
                        await submitMark(targetItem, reason);
                    }
                }}
            />
        </div>
    );
}
