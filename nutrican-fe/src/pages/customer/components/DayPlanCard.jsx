// src/pages/customer/components/DayPlanCard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Send, Ban, CalendarDays, Lock, CheckCircle2 } from 'lucide-react';
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
    getSubmissionStatusLabel,
    isPlanChoiceRejected,
    formatSubmissionScope,
} from './planLabels';
import LateTickReasonModal from './LateTickReasonModal';
import MealPeriodBlock from '../../../components/diet/timeline/MealPeriodBlock';

/** Display plan items by 5 UI periods. */
const PERIOD_ORDER = MEAL_PERIODS;

function dayPlanFromTimeline(timeline) {
    if (!timeline) return null;
    const items = (timeline.periods || []).flatMap((p) => p.plannedItems || []);
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarb = 0;
    let totalFat = 0;
    items.forEach((i) => {
        if (i.skipReason || i.choiceRejected) return;
        totalCalories += Number(i.calories) || 0;
        totalProtein += Number(i.protein) || 0;
        totalCarb += Number(i.carb) || 0;
        totalFat += Number(i.fat) || 0;
    });
    return {
        date: timeline.date,
        hasPtPlan: timeline.hasPtPlan,
        items,
        totalCalories,
        totalProtein,
        totalCarb,
        totalFat,
    };
}

function getPeriodBlock(timeline, period) {
    return (timeline?.periods || []).find((p) => p.mealPeriod === period) || null;
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
    timeline = null,
    timelineLoading = false,
    onRefreshTimeline,
    logHandlers = {},
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
    /** Coached only: local suggestion cart before save & send to PT. */
    const [batchQueue, setBatchQueue] = useState([]);
    const [batchBusy, setBatchBusy] = useState(false);
    const qtyDebounceRef = useRef(null);
    const onRefreshTimelineRef = useRef(onRefreshTimeline);
    onRefreshTimelineRef.current = onRefreshTimeline;
    const isPast = isPastIso(selectedDate);
    const isToday = isTodayIso(selectedDate);
    const vnNow = nowInVn();

    const refresh = useCallback(async () => {
        if (!selectedDate) return;
        if (onRefreshTimelineRef.current) {
            await onRefreshTimelineRef.current();
            return;
        }
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
                || [...list].sort((a, b) => {
                    const rank = (s) => (s.status === 'APPROVED' || s.status === 'REJECTED' ? 2
                        : s.status === 'CANCELLED' ? 1 : 0);
                    const byRank = rank(b) - rank(a);
                    if (byRank !== 0) return byRank;
                    return String(b.decidedAt || b.submittedAt || '')
                        .localeCompare(String(a.decidedAt || a.submittedAt || ''));
                })[0]
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
        if (timeline) {
            setDayPlan(dayPlanFromTimeline(timeline));
            setSubmission(timeline.selfPlanSubmission || null);
            setLoading(false);
            return;
        }
        if (!timelineLoading) {
            setLoading(false);
        }
    }, [timeline, timelineLoading]);

    useEffect(() => {
        if (timeline || onRefreshTimelineRef.current) return;
        refresh();
    }, [refresh, timeline, selectedDate]);

    const hasPendingSubmission = useMemo(
        () => (dayPlan?.items || []).some((i) => i.source === 'SELF' && i.lockedByReview),
        [dayPlan],
    );

    const pendingSubmissionIds = useMemo(() => {
        const ids = new Set(
            (dayPlan?.items || [])
                .filter((i) => i.source === 'SELF' && i.lockedByReview && i.submissionId)
                .map((i) => i.submissionId),
        );
        return [...ids];
    }, [dayPlan]);

    const getPeriodSubmissionId = useCallback((period) => {
        const locked = (dayPlan?.items || []).find(
            (i) => i.source === 'SELF' && i.lockedByReview && resolvePlanItemPeriod(i) === period,
        );
        return locked?.submissionId || null;
    }, [dayPlan]);
    /** Coaching UI: active PT mapping, or published PT menu for the day (API flicker fallback). */
    const hasPtPlan = Boolean(timeline?.hasPtPlan ?? dayPlan?.hasPtPlan);
    const coachedMode = Boolean(hasActivePt) || hasPtPlan;

    const allActualLogs = useMemo(
        () => (timeline?.periods || []).flatMap((p) => p.actualLogs || []),
        [timeline],
    );

    const settledCheck = useCallback(
        (period) => isMealPeriodSettled(period, dayPlan?.items || [], allActualLogs),
        [dayPlan, allActualLogs],
    );

    const firstOpenPeriod = useCallback(() => (
        MEAL_PERIODS.find((p) => !settledCheck(p)) || getCurrentMealPeriod()
    ), [settledCheck]);

    useEffect(() => {
        setBatchQueue([]);
        setShowAdd(false);
        setPendingFood(null);
    }, [selectedDate]);

    useEffect(() => {
        if (!hasActivePt && !hasPtPlan) {
            setBatchQueue([]);
        }
    }, [hasActivePt, hasPtPlan]);

    useEffect(() => {
        if (!showAdd || !settledCheck(addMealPeriod)) return;
        const next = firstOpenPeriod();
        if (next !== addMealPeriod) setAddMealPeriod(next);
    }, [showAdd, addMealPeriod, settledCheck, firstOpenPeriod]);

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
                coachedMode,
            });
            onPlannedTotalsChange(totals);
        }, 300);
        return clear;
    }, [dayPlan, draftMacros, editDraft, editId, addMealPeriod, onPlannedTotalsChange, selectedDate, coachedMode]);

    const planProgress = useMemo(
        () => computePlanProgressBreakdown(dayPlan?.items || [], { dateIso: selectedDate, coachedMode }),
        [dayPlan, selectedDate, coachedMode],
    );

    const visibleItems = useMemo(() => {
        const items = dayPlan?.items || [];
        return items.filter((i) => !(i.source === 'SELF' && i.applied));
    }, [dayPlan]);

    const openAddPanel = () => {
        setShowAdd((v) => {
            const next = !v;
            if (next) {
                setAddMealPeriod(firstOpenPeriod());
            }
            return next;
        });
    };

    const handleSelectFood = (food) => {
        setPendingFood(food);
        setPendingQty(String(Math.round(Number(food.servingSizeG) || 100)));
    };

    /** Solo: persist immediately. Coached: queue locally then send to PT. */
    const handleAddToBatch = async () => {
        if (!pendingFood) return;
        const qty = Number(pendingQty);
        if (!qty || qty <= 0) {
            toast.error('Số gam không hợp lệ');
            return;
        }
        if (settledCheck(addMealPeriod)) {
            toast.error('Buổi này đã chốt — chọn buổi khác');
            setAddMealPeriod(firstOpenPeriod());
            return;
        }

        if (!hasActivePt) {
            setBatchBusy(true);
            try {
                await dietService.createSelfPlanItem({
                    planDate: selectedDate,
                    mealType: periodToMealType(addMealPeriod),
                    mealPeriod: addMealPeriod,
                    foodItemId: pendingFood.id,
                    quantityG: qty,
                });
                setPendingFood(null);
                setPendingQty('');
                toast.success(`Đã thêm vào kế hoạch · ${MEAL_PERIOD_LABELS[addMealPeriod]}`);
                await refresh();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Không thêm được món');
            } finally {
                setBatchBusy(false);
            }
            return;
        }

        const macros = scaleFoodMacros(pendingFood, qty);
        setBatchQueue((prev) => [
            ...prev,
            {
                key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                mealPeriod: addMealPeriod,
                foodItemId: pendingFood.id,
                itemName: pendingFood.nameVi,
                quantityG: qty,
                calories: macros.calories,
                protein: macros.protein,
                carb: macros.carb,
                fat: macros.fat,
            },
        ]);
        setPendingFood(null);
        setPendingQty('');
        toast.success(`Đã thêm vào giỏ · ${MEAL_PERIOD_LABELS[addMealPeriod]}`);
    };

    const removeFromBatch = (key) => {
        setBatchQueue((prev) => prev.filter((x) => x.key !== key));
    };

    const persistBatchQueue = async () => {
        if (!batchQueue.length) return [];
        const created = [];
        for (const row of batchQueue) {
            const res = await dietService.createSelfPlanItem({
                planDate: selectedDate,
                mealType: periodToMealType(row.mealPeriod),
                mealPeriod: row.mealPeriod,
                foodItemId: row.foodItemId,
                quantityG: row.quantityG,
            });
            created.push(res.data?.data);
        }
        setBatchQueue([]);
        return created;
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
        if (item.lockedByReview) {
            toast.error('Món đang chờ PT duyệt — không thể xác nhận đã ăn');
            return;
        }
        if (item.source === 'SELF' && coachedMode) {
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
                toast.success('Đã ghi vào nhật ký');
                onLogged?.();
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
        if (!hasActivePt) return;
        const serverDrafts = (dayPlan?.items || []).filter(
            (i) => i.source === 'SELF' && !i.applied && !i.eaten && !i.lockedByReview
                && !isPlanChoiceRejected(i)
                && !settledCheck(resolvePlanItemPeriod(i)),
        );
        const totalCount = serverDrafts.length + batchQueue.length;
        if (totalCount === 0) {
            toast.info('Chưa có món đề xuất để gửi');
            return;
        }
        const periodSet = new Set([
            ...serverDrafts.map((i) => resolvePlanItemPeriod(i)).filter(Boolean),
            ...batchQueue.map((r) => r.mealPeriod),
        ]);
        setBatchBusy(true);
        try {
            if (batchQueue.length) {
                await persistBatchQueue();
            }
            await dietService.submitSelfPlan(selectedDate);
            if (periodSet.size === 1) {
                const p = [...periodSet][0];
                toast.success(`Đã gửi ${totalCount} món buổi ${MEAL_PERIOD_LABELS[p] || p} cho PT`);
            } else {
                toast.success(`Đã gửi hàng loạt ${totalCount} món · ${periodSet.size} buổi cho PT duyệt`);
            }
            setShowAdd(false);
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không gửi được');
            await refresh();
        } finally {
            setBatchBusy(false);
        }
    };

    const handleSaveBatchOnly = async () => {
        if (!batchQueue.length) {
            toast.info('Giỏ trống — thêm món trước');
            return;
        }
        setBatchBusy(true);
        try {
            const n = batchQueue.length;
            await persistBatchQueue();
            toast.success(`Đã lưu ${n} món vào plan — bấm Gửi PT khi sẵn sàng`);
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không lưu được giỏ');
        } finally {
            setBatchBusy(false);
        }
    };

    const handleCancel = async (submissionId) => {
        const id = submissionId || submission?.id;
        if (!id) return;
        try {
            await dietService.cancelSelfPlanSubmission(id);
            toast.success('Đã hủy gửi duyệt');
            await refresh();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không hủy được');
        }
    };

    if ((loading || timelineLoading) && !dayPlan) {
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
    const serverDrafts = planItems.filter(
        (i) => i.source === 'SELF' && !i.applied && !i.eaten && !i.lockedByReview
            && !isPlanChoiceRejected(i)
            && !settledCheck(resolvePlanItemPeriod(i)),
    );
    const hasSelfDraft = serverDrafts.length > 0 || batchQueue.length > 0;
    const draftPeriodCount = new Set([
        ...serverDrafts.map((i) => resolvePlanItemPeriod(i)).filter(Boolean),
        ...batchQueue.map((r) => r.mealPeriod),
    ]).size;
    const draftItemCount = serverDrafts.length + batchQueue.length;
    const batchByPeriod = MEAL_PERIODS
        .map((period) => ({
            period,
            rows: batchQueue.filter((r) => r.mealPeriod === period),
        }))
        .filter((g) => g.rows.length > 0);
    const canAddAnyPeriod = MEAL_PERIODS.some((period) => !settledCheck(period));

    const submissionScopeItems = (() => {
        if (!submission) return [];
        if (submission.items?.length) return submission.items;
        return planItems.filter(
            (i) => i.source === 'SELF' && i.submissionId && i.submissionId === submission.id,
        );
    })();
    const submissionScopeText = formatSubmissionScope(submissionScopeItems, MEAL_PERIOD_LABELS);
    const rejectedByPeriod = {};
    for (const item of planItems) {
        // Chỉ món PT từ chối (choiceRejected), không lẫn SUPERSEDED khi duyệt món khác
        if (item.source !== 'SELF' || !item.choiceRejected) continue;
        const period = resolvePlanItemPeriod(item);
        if (!period) continue;
        if (!rejectedByPeriod[period]) rejectedByPeriod[period] = [];
        const name = String(item.name || '').trim();
        if (name && !rejectedByPeriod[period].includes(name)) rejectedByPeriod[period].push(name);
    }

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
                    {hasActivePt ? (
                        <p className="text-[11px] text-slate-500 mt-1 pl-11 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-0.5"><Lock className="h-3 w-3 text-blue-600" /> Kế hoạch</span>
                            <span className="inline-flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Thực tế</span>
                            <span className="text-slate-400">· gộp theo buổi</span>
                        </p>
                    ) : (
                        <p className="text-[11px] text-slate-500 mt-1 pl-11 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3 text-blue-600" /> Plan tự lập</span>
                            <span className="inline-flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Nhật ký</span>
                            <span className="text-slate-400">· tự thêm · tick đã ăn</span>
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {hasActivePt && hasSelfDraft && !isPast && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSubmit}
                            disabled={batchBusy}
                            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm"
                        >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Gửi PT hàng loạt
                            {draftItemCount > 0 ? ` (${draftItemCount} món` : ''}
                            {draftPeriodCount > 1 ? ` · ${draftPeriodCount} buổi)` : draftItemCount > 0 ? ')' : ''}
                        </Button>
                    )}
                    {hasActivePt && hasPendingSubmission && pendingSubmissionIds.length === 1 && (
                        <Button type="button" size="sm" variant="outline" onClick={() => handleCancel(pendingSubmissionIds[0])} className="rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50">
                            <Ban className="w-3.5 h-3.5 mr-1" /> Hủy gửi
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPast || !canAddAnyPeriod}
                        onClick={openAddPanel}
                        className="rounded-xl border-teal-300 bg-white/80 text-teal-700 hover:bg-teal-50 shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-1" /> {hasActivePt ? 'Đề xuất món' : 'Thêm món'}
                    </Button>
                </div>
            </div>

            {isPast && (
                <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
                    Ngày đã qua — chỉ xem kế hoạch. Bạn vẫn có thể <strong>bù nhật ký</strong> bằng card <strong>Ghi nhật ký</strong> phía trên (AI hoặc nhập tay): chọn buổi còn thiếu và thêm món mới.
                </div>
            )}
            {isFuture && (
                <div className="rounded-2xl border border-blue-300/80 bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
                    Đây là ngày tương lai. Bạn có thể chuẩn bị trước kế hoạch trong tối đa 14 ngày nhưng chưa thể tick đã ăn.
                </div>
            )}
            {isToday && vnNow.getHours() < 4 && (
                <div className="rounded-2xl border border-violet-300/80 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-3 text-sm font-semibold text-violet-900 shadow-sm">
                    Đang trong khung <strong>buổi khuya của ngày hôm qua</strong> (22:00–03:59).
                    Mở lịch chọn <strong>ngày hôm qua</strong> để bấm «Đã ăn» cho buổi khuya.
                </div>
            )}

            {hasActivePt && hasSelfDraft && !isPast && (
                <div className="rounded-2xl border border-indigo-300/80 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-sm font-semibold text-indigo-900 shadow-sm">
                    Giỏ đề xuất: <strong>{draftItemCount} món</strong>
                    {draftPeriodCount > 0 ? ` · ${draftPeriodCount} buổi` : ''}
                    {' — '}thêm tiếp hoặc bấm <strong>Gửi PT hàng loạt</strong>.
                </div>
            )}

            {submission?.status && hasActivePt && (
                <div className={`flex flex-col gap-1 text-xs font-bold px-3 py-2 rounded-xl border ${
                    submission.status === 'PENDING' ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : submission.status === 'REJECTED' ? 'bg-red-50 border-red-300 text-red-900'
                            : submission.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
                >
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="shrink-0">{getSubmissionStatusLabel(submission.status)}</span>
                        {submissionScopeText && (
                            <span className="font-semibold opacity-95">
                                · {submissionScopeText}
                            </span>
                        )}
                    </div>
                    {submission.ptNote && (
                        <p className="font-medium opacity-90 leading-snug" title={submission.ptNote}>
                            Ghi chú PT: {submission.ptNote}
                        </p>
                    )}
                </div>
            )}

            {showAdd && !isPast && canAddAnyPeriod && (
                <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-4 space-y-3 shadow-inner">
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={addMealPeriod}
                            onChange={(e) => setAddMealPeriod(e.target.value)}
                            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-teal-200 text-sm font-semibold bg-white"
                        >
                            {MEAL_PERIODS.map((period) => {
                                const disabled = settledCheck(period);
                                const hasPending = hasActivePt && (dayPlan?.items || []).some(
                                    (i) => i.source === 'SELF' && i.lockedByReview && resolvePlanItemPeriod(i) === period,
                                );
                const inCart = hasActivePt
                    ? batchQueue.filter((r) => r.mealPeriod === period).length
                    : 0;
                return (
                    <option key={period} value={period} disabled={disabled}>
                        {MEAL_PERIOD_LABELS[period]}
                        {disabled ? ' (đã chốt)' : ''}
                        {!disabled && hasPending ? ' (đang chờ PT)' : ''}
                        {!disabled && inCart ? ` · giỏ ${inCart}` : ''}
                    </option>
                );
                            })}
                        </select>
                        <p className="text-[11px] text-slate-500 flex-1 min-w-[12rem]">
                            {hasActivePt
                                ? 'Đổi buổi bất cứ lúc nào — gom sáng/trưa/chiều/tối vào một giỏ rồi gửi PT một lần.'
                                : 'Chọn buổi rồi thêm món — món được lưu thẳng vào kế hoạch của bạn.'}
                        </p>
                    </div>

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
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAddToBatch}
                                disabled={batchBusy}
                                className="rounded-lg h-8 bg-teal-600 hover:bg-teal-700"
                            >
                                {hasActivePt ? 'Thêm vào giỏ' : 'Thêm vào plan'}
                            </Button>
                            <button type="button" onClick={() => setPendingFood(null)} className="p-1.5 text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {hasActivePt && (batchByPeriod.length > 0 || serverDrafts.length > 0) && (
                        <div className="rounded-xl border border-violet-200 bg-white/90 p-3 space-y-2">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-violet-700">
                                Giỏ đề xuất chưa gửi
                            </p>
                            {batchByPeriod.map(({ period, rows }) => (
                                <div key={`q-${period}`} className="space-y-1">
                                    <p className="text-xs font-bold text-slate-700">
                                        {MEAL_PERIOD_LABELS[period]} · {rows.length} món (chưa lưu)
                                    </p>
                                    <ul className="space-y-1">
                                        {rows.map((row) => (
                                            <li key={row.key} className="flex items-center gap-2 text-sm text-slate-700 bg-violet-50/80 rounded-lg px-2 py-1.5">
                                                <span className="flex-1 truncate font-medium">{row.itemName}</span>
                                                <span className="text-xs text-slate-500">{row.quantityG}g</span>
                                                <span className="text-xs font-semibold text-emerald-700">{Math.round(row.calories)} kcal</span>
                                                <button type="button" onClick={() => removeFromBatch(row.key)} className="p-0.5 text-slate-400 hover:text-rose-500">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            {serverDrafts.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-violet-100">
                                    <p className="text-xs font-bold text-slate-700">
                                        Đã lưu plan · {serverDrafts.length} món chờ gửi
                                    </p>
                                    <ul className="space-y-1">
                                        {serverDrafts.map((item) => (
                                            <li key={item.id} className="flex items-center gap-2 text-sm text-slate-600 px-2 py-1">
                                                <span className="text-[10px] font-bold text-slate-400 w-16 shrink-0">
                                                    {MEAL_PERIOD_LABELS[resolvePlanItemPeriod(item)] || '—'}
                                                </span>
                                                <span className="flex-1 truncate">{item.name || item.itemName}</span>
                                                <span className="text-xs">{Math.round(Number(item.quantityG) || 0)}g</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-1">
                                {batchQueue.length > 0 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={batchBusy}
                                        onClick={handleSaveBatchOnly}
                                        className="rounded-lg border-teal-300 text-teal-800"
                                    >
                                        Lưu giỏ vào plan
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={batchBusy || draftItemCount === 0}
                                    onClick={handleSubmit}
                                    className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
                                >
                                    <Send className="w-3.5 h-3.5 mr-1" />
                                    Gửi PT hàng loạt ({draftItemCount} món
                                    {draftPeriodCount > 1 ? ` · ${draftPeriodCount} buổi` : ''})
                                </Button>
                            </div>
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
                const periodBlock = getPeriodBlock(timeline, period);
                const actualLogs = periodBlock?.actualLogs || [];
                if (!items.length && !actualLogs.length) return null;
                const periodSettled = settledCheck(period);
                const isCurrentPeriod = isMealPeriodOpen(selectedDate, period, vnNow);
                const isPastPeriod = isToday && isMealPeriodPast(selectedDate, period, vnNow);
                const isFuturePeriod = isToday && isFutureMealPeriod(period, vnNow);
                const periodHasPendingSelfReview = planItems.some(
                    (i) => i.source === 'SELF' && i.lockedByReview && resolvePlanItemPeriod(i) === period,
                );
                const periodSubmissionId = getPeriodSubmissionId(period);

                const periodRejectedNames = rejectedByPeriod[period] || [];
                const periodRejectNote = periodRejectedNames.length > 0
                    ? (submission?.status === 'REJECTED' ? (submission.ptNote || null) : null)
                    : null;

                return (
                    <MealPeriodBlock
                        key={period}
                        period={period}
                        label={MEAL_PERIOD_LABELS[period]}
                        plannedItems={items}
                        actualLogs={actualLogs}
                        reconciliation={periodBlock?.reconciliation}
                        coachedMode={coachedMode}
                        hasActivePt={hasActivePt}
                        readOnly={false}
                        isCurrentPeriod={isCurrentPeriod}
                        isPastPeriod={isPastPeriod}
                        isFuturePeriod={isFuturePeriod}
                        selectedDate={selectedDate}
                        isFuture={isFuture}
                        isPast={isPast}
                        vnNow={vnNow}
                        pendingLocked={periodHasPendingSelfReview}
                        periodSettled={periodSettled}
                        periodHasPendingSelfReview={periodHasPendingSelfReview}
                        periodSubmissionId={periodSubmissionId}
                        onCancelPeriodSubmission={periodSubmissionId ? () => handleCancel(periodSubmissionId) : undefined}
                        periodRejectedNames={periodRejectedNames}
                        periodRejectNote={periodRejectNote}
                        pendingId={pendingId}
                        editId={editId}
                        editQty={editQty}
                        onEditQtyChange={setEditQty}
                        onStartEdit={(item) => {
                            setEditId(item.id);
                            setEditQty(String(Math.round(Number(item.quantityG) || 100)));
                        }}
                        onCancelEdit={() => setEditId(null)}
                        onSaveQty={handleSaveQty}
                        onDelete={handleDelete}
                        onMark={handleMark}
                        logHandlers={logHandlers}
                    />
                );
            })}

            <LateTickReasonModal
                open={!!lateTickTarget}
                loading={pendingId === lateTickTarget?.id}
                forPt={coachedMode}
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
