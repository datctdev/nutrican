

export const CATEGORY_GROUPS = [
    { key: null, label: 'Tất cả' },
    { key: 'PROTEIN', label: 'Đạm' },
    { key: 'CARB', label: 'Tinh bột' },
    { key: 'FAT', label: 'Chất béo' },
    { key: 'VEG', label: 'Rau củ' },
    { key: 'FRUIT', label: 'Trái cây' },
    { key: 'OTHER', label: 'Khác' },
];

const PALETTE = {
    PROTEIN: {
        solid: 'bg-sky-600 text-white border-sky-600',
        outline: 'bg-white text-sky-700 border-sky-300',
        pill: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    CARB: {
        solid: 'bg-amber-500 text-white border-amber-500',
        outline: 'bg-white text-amber-700 border-amber-300',
        pill: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    FAT: {
        solid: 'bg-rose-500 text-white border-rose-500',
        outline: 'bg-white text-rose-700 border-rose-300',
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    VEG: {
        solid: 'bg-emerald-600 text-white border-emerald-600',
        outline: 'bg-white text-emerald-700 border-emerald-300',
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    FRUIT: {
        solid: 'bg-fuchsia-600 text-white border-fuchsia-600',
        outline: 'bg-white text-fuchsia-700 border-fuchsia-300',
        pill: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    },
    OTHER: {
        solid: 'bg-slate-600 text-white border-slate-600',
        outline: 'bg-white text-slate-600 border-slate-300',
        pill: 'bg-slate-100 text-slate-600 border-slate-200',
    },
};

const ALL = {
    solid: 'bg-primary text-white border-primary',
    outline: 'bg-white text-slate-600 border-slate-300',
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function getCategoryColors(groupKey) {
    if (!groupKey) return ALL;
    return PALETTE[groupKey] || PALETTE.OTHER;
}

export function getCategoryLabel(groupKey, fallbackLabel) {
    if (!groupKey) return 'Tất cả';
    const found = CATEGORY_GROUPS.find((g) => g.key === groupKey);
    return fallbackLabel || found?.label || groupKey;
}
