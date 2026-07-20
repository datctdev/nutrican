// src/pages/customer/components/MealSection.jsx
import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import LogCard from '../../../components/diet/LogCard';
import { MEAL_PERIODS, MEAL_PERIOD_LABELS, resolveLogMealPeriod } from './dietUtils';

const PERIOD_ORDER = MEAL_PERIODS;

export default function MealSection({
    logs,
    loading,
    emptyMessage = 'Chưa có bữa ăn nào được ghi nhận.',
    handleEditLog,
    handleDelete,
    onPreviewImage,
    setSosDietLogId,
    setSosMessage,
    setIsSosModalOpen,
    hasActivePt = false,
    isPast = false,
}) {
    const grouped = useMemo(() => {
        const map = Object.fromEntries(PERIOD_ORDER.map((k) => [k, []]));
        (logs || []).forEach((log) => {
            const key = resolveLogMealPeriod(log);
            (map[key] || map.AFTERNOON).push(log);
        });
        return map;
    }, [logs]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-3xl bg-slate-200" />)}
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 border-dashed">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {PERIOD_ORDER.map((period) => {
                const mealLogs = grouped[period];
                if (!mealLogs.length) return null;
                const totalKcal = mealLogs.reduce((s, log) => s + (Number(log.macrosJson?.calories) || 0), 0);
                return (
                    <section key={period} className="space-y-3">
                        <header className="flex items-baseline justify-between gap-2">
                            <h4 className="text-sm font-extrabold text-slate-800 tracking-wide">
                                {MEAL_PERIOD_LABELS[period]}
                                <span className="ml-2 text-xs font-semibold text-slate-400">
                                    · {mealLogs.length} món · {Math.round(totalKcal)} kcal
                                </span>
                            </h4>
                        </header>
                        <div className="space-y-3">
                            {mealLogs.map((log) => (
                                <LogCard
                                    key={log.id}
                                    log={log}
                                    handleEditLog={handleEditLog}
                                    handleDelete={handleDelete}
                                    onPreviewImage={onPreviewImage}
                                    setSosDietLogId={setSosDietLogId}
                                    setSosMessage={setSosMessage}
                                    setIsSosModalOpen={setIsSosModalOpen}
                                    hasActivePt={hasActivePt}
                                    isPast={isPast}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
