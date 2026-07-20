// src/pages/customer/components/NutritionProgress.jsx
import { Activity } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { calculateProgress, computeIntakeStatus } from './dietUtils';

const MacroRing = ({ label, actual, planned, target, colorClass, plannedColorClass }) => {
    const actualN = Number(actual) || 0;
    const plannedN = Number(planned) || 0;
    const targetN = Number(target) || 1;
    const projected = actualN + plannedN;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const actualPct = Math.min(100, (actualN / targetN) * 100);
    const plannedPct = Math.min(100 - actualPct, (plannedN / targetN) * 100);
    const actualOffset = circumference - (actualPct / 100) * circumference;
    const plannedOffset = circumference - ((actualPct + plannedPct) / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="relative w-20 h-20 mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} className="stroke-slate-200" strokeWidth="8" fill="transparent" />
                    {plannedN > 0 && (
                        <circle
                            cx="50" cy="50" r={radius} fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={plannedOffset}
                            className={`transition-all duration-700 ease-out ${plannedColorClass || 'stroke-slate-300'}`}
                            strokeWidth="8"
                            strokeLinecap="round"
                            style={{ opacity: 0.45 }}
                        />
                    )}
                    <circle
                        cx="50" cy="50" r={radius} fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={actualOffset}
                        className={`transition-all duration-700 ease-out ${colorClass}`}
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-sm font-bold text-slate-800">{Math.round(projected)}</span>
                    {plannedN > 0 && (
                        <span className="text-[9px] text-slate-400 font-semibold">{Math.round(actualN)} thật</span>
                    )}
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
}) {
    const actualCal = Number(summary?.totalCalories) || 0;
    const plannedCal = Number(plannedTotals?.calories) || 0;
    const projectedCal = actualCal + plannedCal;
    const targetCal = Number(summary?.targetCalories) || 2000;

    const actualPro = Number(summary?.totalProtein) || 0;
    const actualCarb = Number(summary?.totalCarbs) || 0;
    const actualFat = Number(summary?.totalFat) || 0;
    const plannedPro = Number(plannedTotals?.protein) || 0;
    const plannedCarb = Number(plannedTotals?.carb ?? plannedTotals?.carbs) || 0;
    const plannedFat = Number(plannedTotals?.fat) || 0;

    const hasPlan = plannedTotals != null && (plannedCal > 0 || plannedPro > 0 || plannedCarb > 0 || plannedFat > 0);

    const draftStatus = hasPlan
        ? computeIntakeStatus(projectedCal, targetCal)
        : {
            intakeStatus: summary?.intakeStatus || 'OK',
            controlLoopMessage: summary?.controlLoopMessage || null,
        };

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
        AT_RISK: 'Cần chú ý (AT_RISK)',
    };

    const showNudge = isToday && !isFuture;
    const calActualPct = Math.min(100, calculateProgress(actualCal, targetCal));
    const calPlannedPct = Math.min(100 - calActualPct, calculateProgress(plannedCal, targetCal));

    return (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-400 w-full" />
            <CardContent className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" /> Mục tiêu hàng ngày
                </h3>

                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2.5">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Tổng Calo tiêu thụ</span>
                        <div className="text-right">
                            <span className="text-3xl font-black text-slate-800">{Math.round(projectedCal)}</span>
                            <span className="text-sm font-semibold text-slate-400"> / {targetCal} kcal</span>
                            {hasPlan && (
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    {Math.round(actualCal)} đã ghi · +{Math.round(plannedCal)} plan
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-blue-500 transition-all duration-700"
                            style={{ width: `${calActualPct}%` }}
                        />
                        {hasPlan && (
                            <div
                                className="h-full bg-blue-300/70 transition-all duration-700"
                                style={{ width: `${calPlannedPct}%` }}
                            />
                        )}
                    </div>
                </div>

                {showNudge && (
                    <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${statusStyles[intakeStatus] || statusStyles.OK}`}>
                        <p className="font-bold">{statusLabels[intakeStatus] || intakeStatus}</p>
                        {(draftStatus.controlLoopMessage || summary?.controlLoopMessage) && (
                            <p className="text-xs mt-1 opacity-90">
                                {draftStatus.controlLoopMessage || summary?.controlLoopMessage}
                            </p>
                        )}
                        {hasPlan && (
                            <p className="text-[10px] mt-1 opacity-75 font-medium">Bao gồm plan nháp (chưa ghi nhật ký)</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <MacroRing
                        label="Đạm (Protein)"
                        actual={actualPro}
                        planned={plannedPro}
                        target={summary?.targetProtein || 120}
                        colorClass="stroke-blue-500"
                        plannedColorClass="stroke-blue-300"
                    />
                    <MacroRing
                        label="Tinh bột (Carbs)"
                        actual={actualCarb}
                        planned={plannedCarb}
                        target={summary?.targetCarbs || 200}
                        colorClass="stroke-amber-500"
                        plannedColorClass="stroke-amber-300"
                    />
                    <MacroRing
                        label="Chất béo (Fat)"
                        actual={actualFat}
                        planned={plannedFat}
                        target={summary?.targetFat || 65}
                        colorClass="stroke-red-500"
                        plannedColorClass="stroke-red-300"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
