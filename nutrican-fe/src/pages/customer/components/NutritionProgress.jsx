import { Activity } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { calculateProgress, computeIntakeStatus, formatMacroDisplay } from './dietUtils';

const MacroRing = ({
    label,
    consumed,
    pending,
    target,
    colorClass,
    pendingColorClass,
}) => {
    const consumedN = Number(consumed) || 0;
    const pendingN = Number(pending) || 0;
    const targetN = Number(target) || 1;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const consumedPct = Math.min(100, (consumedN / targetN) * 100);
    const pendingPct = Math.min(100 - consumedPct, (pendingN / targetN) * 100);
    const consumedOffset = circumference - (consumedPct / 100) * circumference;
    const pendingOffset = circumference - ((consumedPct + pendingPct) / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white/70 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="relative w-20 h-20 mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} className="stroke-slate-200" strokeWidth="8" fill="transparent" />
                    {pendingN > 0 && (
                        <circle
                            cx="50" cy="50" r={radius} fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={pendingOffset}
                            className={`transition-all duration-700 ease-out ${pendingColorClass || 'stroke-slate-300'}`}
                            strokeWidth="8"
                            strokeLinecap="round"
                            style={{ opacity: 0.45 }}
                        />
                    )}
                    {consumedN > 0 && (
                        <circle
                            cx="50" cy="50" r={radius} fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={consumedOffset}
                            className={`transition-all duration-700 ease-out ${colorClass}`}
                            strokeWidth="8"
                            strokeLinecap="round"
                        />
                    )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-sm font-black text-slate-800">{formatMacroDisplay(consumedN)}</span>
                </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Mục tiêu {target || 0}g</span>
        </div>
    );
};

export default function NutritionProgress({
    summary,
    plannedTotals = null,
    isToday = true,
    isFuture = false,
    coachedMode = false,
}) {
    const logCal = Number(summary?.totalCalories) || 0;
    const logPro = Number(summary?.totalProtein) || 0;
    const logCarb = Number(summary?.totalCarbs) || 0;
    const logFat = Number(summary?.totalFat) || 0;

    const pendingCal = Number(plannedTotals?.pending?.calories ?? plannedTotals?.calories) || 0;
    const pendingPro = Number(plannedTotals?.pending?.protein ?? plannedTotals?.protein) || 0;
    const pendingCarb = Number(plannedTotals?.pending?.carb ?? plannedTotals?.carbs ?? plannedTotals?.carb) || 0;
    const pendingFat = Number(plannedTotals?.pending?.fat ?? plannedTotals?.fat) || 0;

    const complianceCal = Number(plannedTotals?.compliance?.calories) || 0;
    const compliancePro = Number(plannedTotals?.compliance?.protein) || 0;
    const complianceCarb = Number(plannedTotals?.compliance?.carb) || 0;
    const complianceFat = Number(plannedTotals?.compliance?.fat) || 0;

    const consumedCal = logCal + complianceCal;
    const consumedPro = logPro + compliancePro;
    const consumedCarb = logCarb + complianceCarb;
    const consumedFat = logFat + complianceFat;

    const targetCal = Number(summary?.targetCalories) || 2000;
    const hasPlanPending = plannedTotals != null && pendingCal > 0;

    const draftStatus = computeIntakeStatus(consumedCal, targetCal);
    const intakeStatus = draftStatus.intakeStatus;

    const statusStyles = {
        OK: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        OVER_MACRO: 'bg-red-50 border-red-200 text-red-800',
        UNDER_INTAKE: 'bg-amber-50 border-amber-200 text-amber-800',
        AT_RISK: 'bg-red-100 border-red-300 text-red-900',
    };
    const statusLabels = {
        OK: 'Trong mục tiêu',
        OVER_MACRO: 'Vượt macro',
        UNDER_INTAKE: 'Ăn thiếu',
        AT_RISK: 'Cần chú ý',
    };

    const showNudge = isToday && !isFuture;
    const calConsumedPct = Math.min(100, calculateProgress(consumedCal, targetCal));
    const calPendingPct = Math.min(100 - calConsumedPct, calculateProgress(pendingCal, targetCal));

    return (
        <Card className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 border-slate-200 shadow-md overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-400 w-full" />
            <CardContent className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" /> Mục tiêu hàng ngày
                </h3>

                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2.5">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Đã nạp hôm nay</span>
                        <div className="text-right">
                            <span className="text-3xl font-black text-slate-800">{formatMacroDisplay(consumedCal)}</span>
                            <span className="text-sm font-semibold text-slate-400"> / {targetCal} kcal</span>
                            {hasPlanPending && (
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    +{Math.round(pendingCal)} kcal từ plan chưa ăn
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="h-4 bg-slate-200/80 rounded-full overflow-hidden flex shadow-inner">
                        {consumedCal > 0 && (
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
                                style={{ width: `${calConsumedPct}%` }}
                                title={`${Math.round(consumedCal)} kcal đã nạp`}
                            />
                        )}
                        {hasPlanPending && (
                            <div
                                className="h-full bg-slate-300/90 transition-all duration-700 border-l border-white/40"
                                style={{ width: `${calPendingPct}%` }}
                                title={`${Math.round(pendingCal)} kcal plan chưa ăn`}
                            />
                        )}
                    </div>
                    {coachedMode && (
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                            Thực đơn PT chỉ tính sau khi bạn tick đã ăn. Đề xuất chờ duyệt không cộng vào đây.
                        </p>
                    )}
                </div>

                {showNudge && (
                    <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${statusStyles[intakeStatus] || statusStyles.OK}`}>
                        <p className="font-bold">{statusLabels[intakeStatus] || intakeStatus}</p>
                        {draftStatus.controlLoopMessage && (
                            <p className="text-xs mt-1 opacity-90">{draftStatus.controlLoopMessage}</p>
                        )}
                        {!draftStatus.controlLoopMessage && !coachedMode && summary?.controlLoopMessage && (
                            <p className="text-xs mt-1 opacity-90">{summary.controlLoopMessage}</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <MacroRing
                        label="Đạm (Protein)"
                        consumed={consumedPro}
                        pending={pendingPro}
                        target={summary?.targetProtein || 120}
                        colorClass="stroke-blue-500"
                        pendingColorClass="stroke-blue-200"
                    />
                    <MacroRing
                        label="Tinh bột (Carbs)"
                        consumed={consumedCarb}
                        pending={pendingCarb}
                        target={summary?.targetCarbs || 200}
                        colorClass="stroke-amber-500"
                        pendingColorClass="stroke-amber-200"
                    />
                    <MacroRing
                        label="Chất béo (Fat)"
                        consumed={consumedFat}
                        pending={pendingFat}
                        target={summary?.targetFat || 65}
                        colorClass="stroke-red-500"
                        pendingColorClass="stroke-red-200"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
