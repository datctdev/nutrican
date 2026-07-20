import { CheckCircle2 } from 'lucide-react';
import LogItemCompact from './LogItemCompact';
import { LANE_ACTUAL_CLASS } from './timelineVisuals';

export default function ActualLane({
    logs = [],
    readOnly = false,
    hasActivePt = false,
    isPast = false,
    onReviewLog,
    logHandlers = {},
}) {
    return (
        <div className={`p-2.5 space-y-1.5 min-h-[4rem] ${LANE_ACTUAL_CLASS}`} aria-label="Thực tế đã ghi">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Thực tế
                {logs.length > 0 && (
                    <span className="font-semibold normal-case text-slate-400 ml-auto">
                        {logs.length} món
                    </span>
                )}
            </p>
            {logs.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2">Chưa ghi nhật ký</p>
            ) : (
                <div className="space-y-1.5">
                    {logs.map((log) => (
                        <LogItemCompact
                            key={log.id}
                            log={log}
                            readOnly={readOnly}
                            hasActivePt={hasActivePt}
                            isPast={isPast}
                            onReviewLog={onReviewLog}
                            logHandlers={logHandlers}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
