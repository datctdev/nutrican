import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { getReconciliationVisual, RECON_CHIP_CLASS } from './timelineVisuals';

const ICONS = {
    ok: CheckCircle2,
    warn: AlertCircle,
    info: Info,
};

export default function PeriodStatusChip({ reconciliation, coachedMode = false }) {
    const visual = getReconciliationVisual(reconciliation, coachedMode);
    if (!visual) return null;
    const Icon = ICONS[visual.tone] || Info;
    return (
        <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ring-1 shrink-0 ${RECON_CHIP_CLASS[visual.tone]}`}
            title={visual.title}
            aria-label={visual.title}
        >
            <Icon className="h-3.5 w-3.5" />
        </span>
    );
}
