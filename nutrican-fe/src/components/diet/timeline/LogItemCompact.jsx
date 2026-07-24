import { useState } from 'react';
import { ChevronDown, ChevronUp, Camera } from 'lucide-react';
import LogCard from '../LogCard';
import { getLogFoodTitle, getFullImageUrl, MEAL_PERIOD_LABELS, formatMacroDisplay } from '../../../pages/customer/components/dietUtils';
import { stripDisplayPrefix } from './timelineVisuals';

function formatLogTime(log) {
    const d = new Date(log.createdAt || log.logDate);
    if (Number.isNaN(d.getTime())) return null;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LogItemCompact({
    log,
    expanded: controlledExpanded,
    onToggle,
    readOnly = false,
    hasActivePt = false,
    isPast = false,
    onReviewLog,
    logHandlers = {},
}) {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const expanded = controlledExpanded ?? internalExpanded;
    const toggle = onToggle ?? (() => setInternalExpanded((v) => !v));

    const title = stripDisplayPrefix(getLogFoodTitle(log));
    const kcal = formatMacroDisplay(log.macrosJson?.calories);
    const timeLabel = formatLogTime(log);
    const thumb = getFullImageUrl(log.imageUrl);
    const pendingReview = log.reviewStatus === 'PENDING';
    const ptAdjusted = log.reviewStatus === 'APPROVED' && log.ptAction === 'ADJUST';
    const legacyRejected = log.reviewStatus === 'REJECTED';

    return (
        <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden">
            <button
                type="button"
                onClick={toggle}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-50/80 transition-colors"
                aria-expanded={expanded}
            >
                {thumb ? (
                    <img src={thumb} alt="" className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                        <Camera className="h-3.5 w-3.5 opacity-50" />
                    </span>
                )}
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800 truncate">{title}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                        {kcal} kcal
                        {timeLabel && <span className="text-slate-400"> · {timeLabel}</span>}
                        {log.makeupForPeriod && MEAL_PERIOD_LABELS[log.makeupForPeriod] && (
                            <span className="text-amber-700"> · Bù {MEAL_PERIOD_LABELS[log.makeupForPeriod]}</span>
                        )}
                        {pendingReview && (
                            <span className="text-amber-700 font-semibold"> · Ước tính, chờ PT</span>
                        )}
                        {ptAdjusted && (
                            <span className="text-blue-700 font-semibold"> · PT đã chỉnh</span>
                        )}
                        {legacyRejected && (
                            <span className="text-red-600 font-semibold"> · PT từ chối (cũ)</span>
                        )}
                    </span>
                </span>
                {expanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                )}
            </button>
            {expanded && (
                <div className="border-t border-slate-100 p-2">
                    <LogCard
                        log={log}
                        readOnly={readOnly}
                        hasActivePt={hasActivePt}
                        isPast={isPast}
                        {...logHandlers}
                    />
                </div>
            )}
            {readOnly && pendingReview && onReviewLog && (
                <div className="px-2.5 pb-2">
                    <button
                        type="button"
                        onClick={() => onReviewLog(log)}
                        className="text-xs font-bold text-indigo-700 hover:underline"
                    >
                        Duyệt nhật ký →
                    </button>
                </div>
            )}
        </div>
    );
}
