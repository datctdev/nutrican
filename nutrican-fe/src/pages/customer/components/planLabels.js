export function stripMealPeriodSuffix(value) {
    if (!value) return '';
    return String(value).replace(/\s*\((MORNING|NOON|AFTERNOON|EVENING|LATE)\)\s*$/i, '').trim();
}

export function getPlanSourceLabel(item) {
    if (!item) return '';
    if (item.source === 'SELF') {
        if (item.lockedByReview) return 'Đề xuất chờ PT duyệt';
        return 'Món tự lên kế hoạch';
    }
    if (item.sourceType === 'SELF_OVERRIDE') return 'Món thay thế (PT đã duyệt)';
    return 'Thực đơn PT';
}

export function getSubmissionStatusLabel(status) {
    switch (status) {
        case 'PENDING': return 'Đang chờ PT duyệt';
        case 'APPROVED': return 'PT đã duyệt';
        case 'REJECTED': return 'PT từ chối';
        case 'CANCELLED': return 'Đã hủy yêu cầu';
        default: return status || 'Chưa rõ';
    }
}

export function getReconcileStatusLabel(status) {
    if (status === 'ALREADY_LOGGED') {
        return 'Buổi đã có nhật ký khác - không cần tick lại';
    }
    return null;
}

export function getSettledPeriodLabel() {
    return 'Buổi đã chốt — không cần duyệt';
}

/** Gạch ngang = phương án không được chọn (không phải "đã bỏ ăn"). */
export function isPlanChoiceRejected(item) {
    if (!item) return false;
    if (item.skipReason === 'SUPERSEDED') return true;
    if (item.choiceRejected) return true;
    return false;
}

export function getChoiceRejectedLabel(item) {
    if (!isPlanChoiceRejected(item)) return null;
    if (item.skipReason === 'SUPERSEDED') return 'Không được chọn — PT duyệt món khác';
    if (item.choiceRejected && item.submissionId) return 'Không được chọn — PT giữ thực đơn gốc';
    if (item.choiceRejected) return 'Không được chọn — đã tuân thủ thực đơn PT';
    return 'Không được chọn';
}

export const MEAL_PERIOD_THEMES = {
    MORNING: {
        section: 'from-amber-50/90 to-orange-50/60 border-amber-200',
        badge: 'bg-amber-100 text-amber-800 ring-amber-200',
        stripe: 'border-l-amber-400',
    },
    NOON: {
        section: 'from-sky-50/90 to-cyan-50/60 border-sky-200',
        badge: 'bg-sky-100 text-sky-800 ring-sky-200',
        stripe: 'border-l-sky-400',
    },
    AFTERNOON: {
        section: 'from-violet-50/90 to-purple-50/60 border-violet-200',
        badge: 'bg-violet-100 text-violet-800 ring-violet-200',
        stripe: 'border-l-violet-400',
    },
    EVENING: {
        section: 'from-indigo-50/90 to-blue-50/60 border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
        stripe: 'border-l-indigo-400',
    },
    LATE: {
        section: 'from-slate-100/90 to-indigo-50/60 border-slate-300',
        badge: 'bg-slate-200 text-slate-800 ring-slate-300',
        stripe: 'border-l-slate-500',
    },
};

export function getSourceBadgeClass(item) {
    if (!item) return 'bg-slate-100 text-slate-700';
    if (item.source === 'SELF') {
        if (item.lockedByReview) return 'bg-amber-100 text-amber-800';
        return 'bg-teal-100 text-teal-800';
    }
    if (item.sourceType === 'SELF_OVERRIDE') return 'bg-emerald-100 text-emerald-800';
    return 'bg-blue-100 text-blue-800';
}
