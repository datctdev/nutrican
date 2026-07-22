import { stripMealPeriodSuffix } from '../../../pages/customer/components/planLabels';


export function stripDisplayPrefix(value) {
    if (!value) return '';
    return stripMealPeriodSuffix(String(value))
        .replace(/^PT Demo\s*[—–-]\s*/i, '')
        .replace(/^Demo hôm nay\s*[·•]\s*\w+\s*[—–-]\s*/i, '')
        .trim();
}

export function getPlanBadgeShort(item, coachedMode = false) {
    if (!item) return { label: '', title: '', showLock: false, className: 'bg-slate-100 text-slate-700' };
    if (item.source === 'SELF') {
        if (item.choiceRejected) {
            return {
                label: 'Từ chối',
                title: 'PT từ chối đề xuất — giữ thực đơn PT gốc',
                showLock: false,
                className: 'bg-rose-100 text-rose-800',
            };
        }
        if (item.lockedByReview) {
            return {
                label: 'Đề xuất',
                title: 'Đề xuất chờ PT duyệt',
                showLock: false,
                className: 'bg-amber-100 text-amber-800',
            };
        }
        return {
            label: coachedMode ? 'Tự chọn' : 'Tự plan',
            title: coachedMode ? 'Món tự lên kế hoạch (chưa gửi / chưa duyệt)' : 'Món tự lên kế hoạch',
            showLock: false,
            className: 'bg-teal-100 text-teal-800',
        };
    }
    if (item.sourceType === 'SELF_OVERRIDE') {
        return {
            label: 'Thay thế',
            title: 'Món thay thế (PT đã duyệt)',
            showLock: false,
            className: 'bg-emerald-100 text-emerald-800',
        };
    }
    return {
        label: 'PT',
        title: 'Thực đơn PT',
        showLock: coachedMode,
        className: 'bg-blue-100 text-blue-800',
    };
}


export function getReconciliationVisual(reconciliation, coachedMode = false) {
    if (!coachedMode || !reconciliation?.hintVi) return null;
    if (reconciliation.bothLogAndPlan) {
        return { tone: 'ok', title: reconciliation.hintVi };
    }
    if (reconciliation.offPlanIntake) {
        return { tone: 'warn', title: reconciliation.hintVi };
    }
    if (reconciliation.planComplianceOnly) {
        return { tone: 'info', title: reconciliation.hintVi };
    }
    return null;
}

export const LANE_PLAN_CLASS = 'border-l-4 border-l-blue-500 bg-blue-50/30 rounded-xl';
export const LANE_ACTUAL_CLASS = 'border-l-4 border-l-emerald-500 bg-emerald-50/30 rounded-xl';

export const RECON_CHIP_CLASS = {
    ok: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    warn: 'bg-orange-100 text-orange-700 ring-orange-200',
    info: 'bg-blue-100 text-blue-700 ring-blue-200',
};
