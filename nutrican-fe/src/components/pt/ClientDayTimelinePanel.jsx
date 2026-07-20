// src/components/pt/ClientDayTimelinePanel.jsx
import DayTimelineView from '../diet/DayTimelineView';

export default function ClientDayTimelinePanel({
    timeline,
    loading,
    clientId,
    clientName,
    onReviewLog,
}) {
    if (loading) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 animate-pulse">
                <div className="h-5 w-48 bg-slate-100 rounded mb-4" />
                <div className="h-24 bg-slate-50 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-800">Thực tế học viên theo buổi</h3>
            <DayTimelineView
                timeline={timeline}
                mode="pt"
                readOnly
                coachedMode
                hasActivePt
                onReviewLog={(log) => onReviewLog?.({ log, clientId, clientName })}
            />
        </div>
    );
}
