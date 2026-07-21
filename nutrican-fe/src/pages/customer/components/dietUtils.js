// src/pages/customer/components/dietUtils.js

export const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    return `${minioUrl}/${url}`;
};

/** Display macro numbers — max 2 decimals, no float artifacts (975.8700000000001 → 975.87). */
export function formatMacroDisplay(value, maxDecimals = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    const factor = 10 ** maxDecimals;
    const rounded = Math.round(n * factor) / factor;
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toFixed(maxDecimals);
}

export const FOOD_CODE_LABELS = {
    banh_chung: 'Bánh Chưng',
    banh_khot: 'Bánh Khọt',
    banh_mi: 'Bánh Mì',
    banh_trang_nuong: 'Bánh Tráng Nướng',
    banh_xeo: 'Bánh Xèo',
    bun_dau_mam_tom: 'Bún Đậu Mắm Tôm',
    ca_kho_to: 'Cá Kho Tộ',
    com_tam: 'Cơm Tấm (Cơm sườn)',
    goi_cuon: 'Gỏi Cuốn',
    pho: 'Phở',
};

export const REASON_LABELS = {
    WRONG_FOOD: 'Nhận diện sai món ăn',
    WRONG_PORTION: 'Sai định lượng/khẩu phần',
    WRONG_MACROS: 'Sai chỉ số Macros',
    UNCLEAR_IMAGE: 'Ảnh không rõ nét',
    RESTAURANT_TOO_COMPLEX: 'Món ăn quá phức tạp',
    DB_MATCH_INCORRECT: 'Cơ sở dữ liệu ghép sai',
    OTHER: 'Lý do khác',
};

export function getLogFoodTitle(log) {
    if (log.foodDescription?.trim()) return log.foodDescription.trim();
    if (log.matchedFoodName?.trim()) return log.matchedFoodName.trim();
    if (log.aiFoodCode && FOOD_CODE_LABELS[log.aiFoodCode]) return FOOD_CODE_LABELS[log.aiFoodCode];
    if (log.aiFoodCode) return log.aiFoodCode.replace(/_/g, ' ');
    return 'Chưa nhận diện tên món';
}

export function formatAiConfidence(score) {
    const label = formatPredictionConfidence(score);
    return label === '—' ? null : label;
}

/** 199-class Top-1 ~44% is normal — show qualitative labels, not raw %. */
export function formatPredictionConfidence(score) {
    if (score == null || Number.isNaN(Number(score))) return '—';
    const pct = Math.round(Number(score) <= 1 ? Number(score) * 100 : Number(score));
    if (pct >= 60) return 'Có thể đúng';
    if (pct >= 35) return 'Có thể là — xác nhận';
    return 'Chưa chắc — vui lòng xác nhận';
}

export const RESNET_FOOD_CODES = Object.keys(FOOD_CODE_LABELS);

export const RESNET_MACRO_ESTIMATES = {
    banh_chung: { calories: 408, protein: 15, carb: 75, fat: 6, servingG: 200 },
    banh_khot: { calories: 154, protein: 6, carb: 17, fat: 7, servingG: 150 },
    banh_mi: { calories: 240, protein: 8, carb: 51, fat: 1, servingG: 250 },
    banh_trang_nuong: { calories: 300, protein: 5, carb: 33, fat: 16, servingG: 200 },
    banh_xeo: { calories: 517, protein: 15, carb: 71, fat: 19, servingG: 180 },
    bun_dau_mam_tom: { calories: 760, protein: 58, carb: 49, fat: 45, servingG: 400 },
    ca_kho_to: { calories: 330, protein: 39, carb: 22, fat: 10, servingG: 350 },
    com_tam: { calories: 529, protein: 21, carb: 82, fat: 13, servingG: 350 },
    goi_cuon: { calories: 116, protein: 10, carb: 11, fat: 4, servingG: 120 },
    pho: { calories: 414, protein: 18, carb: 59, fat: 12, servingG: 500 },
};

export function resolveResnetFoodCode(dish) {
    if (!dish) return null;
    if (dish.foodCode && typeof dish.foodCode === 'string' && dish.foodCode.trim()) {
        return dish.foodCode.trim().toLowerCase().replace(/\s+/g, '_');
    }
    const snakeAlias = dish.aliases?.find((a) => typeof a === 'string' && /^[a-z0-9]+(?:_[a-z0-9]+)*$/i.test(a.trim()));
    if (snakeAlias) return snakeAlias.trim().toLowerCase();
    if (dish.nameEn) return dish.nameEn.trim().toLowerCase().replace(/\s+/g, '_');
    return null;
}

/**
 * Dominant macro tag from kcal contribution (pro×4, carb×4, fat×9).
 * Returns one label if max share ≥ 45%; null if total kcal is 0 / missing.
 */
export function getDominantMacroTag({ protein, carb, fat } = {}) {
    const p = Number(protein) || 0;
    const c = Number(carb) || 0;
    const f = Number(fat) || 0;
    const proKcal = p * 4;
    const carbKcal = c * 4;
    const fatKcal = f * 9;
    const total = proKcal + carbKcal + fatKcal;
    if (total <= 0) return null;
    const shares = [
        { label: 'Giàu đạm', kcal: proKcal },
        { label: 'Giàu tinh bột', kcal: carbKcal },
        { label: 'Giàu béo', kcal: fatKcal },
    ];
    shares.sort((a, b) => b.kcal - a.kcal);
    if (shares[0].kcal / total < 0.45) return null;
    return shares[0].label;
}

export function getManualDishOptions(resnetDishes) {
    if (resnetDishes?.length > 0) return resnetDishes;
    return [];
}

/** Up to 8 default hints from resnetDishes (alphabet), preferring names matching llavaFoodName. */
export function getDefaultDishHints(resnetDishes, llavaFoodName, limit = 8) {
    const dishes = getManualDishOptions(resnetDishes);
    if (!dishes.length) return [];
    const q = (llavaFoodName || '').trim().toLowerCase();
    const scored = dishes
        .map((d) => {
            const name = (d.nameVi || d.nameEn || '').toLowerCase();
            const code = resolveResnetFoodCode(d) || '';
            let score = 0;
            if (q && (name.includes(q) || code.includes(q.replace(/\s+/g, '_')))) score = 2;
            else if (q && q.split(/\s+/).some((w) => w.length > 1 && name.includes(w))) score = 1;
            return { d, score, name };
        })
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'vi'));
    return scored.slice(0, limit).map((x) => x.d);
}

export function getServingGForCode(foodCode, resnetDishes) {
    if (!foodCode) return 350;
    const dish = getManualDishOptions(resnetDishes).find((d) => resolveResnetFoodCode(d) === foodCode);
    return Math.round(
        Number(dish?.servingSizeG || dish?.servingG || RESNET_MACRO_ESTIMATES[foodCode]?.servingG || 350)
    );
}

export function getServingGForDish(dish) {
    if (!dish) return 350;
    return Math.round(Number(dish.servingSizeG || dish.servingG || 350));
}

export function scaleMacrosByGrams(dish, grams, servingG) {
    if (!dish) return null;
    const base = Number(servingG) || Number(dish.servingSizeG || dish.servingG) || 100;
    const g = Number(grams) || base;
    const ratio = g / base;
    return {
        calories: Math.round(Number(dish.calories || 0) * ratio),
        protein: Math.round(Number(dish.protein || 0) * ratio),
        carb: Math.round(Number(dish.carb || 0) * ratio),
        fat: Math.round(Number(dish.fat || 0) * ratio),
    };
}

export function getPreviewForSelection(selectedFoodCode, topPredictions, resnetDishes, adjustedGrams) {
    if (!selectedFoodCode) return null;
    const servingG = getServingGForCode(selectedFoodCode, resnetDishes);
    const grams = Math.round(Number(adjustedGrams) || servingG);
    const dish = getManualDishOptions(resnetDishes).find((d) => resolveResnetFoodCode(d) === selectedFoodCode);
    if (dish) {
        const scaled = scaleMacrosByGrams(dish, grams, servingG);
        return {
            foodCode: selectedFoodCode,
            foodName: dish.nameVi,
            servingG,
            ...scaled,
        };
    }
    const est = RESNET_MACRO_ESTIMATES[selectedFoodCode];
    if (est) {
        const scaled = scaleMacrosByGrams(est, grams, servingG);
        return {
            foodCode: selectedFoodCode,
            foodName: FOOD_CODE_LABELS[selectedFoodCode],
            servingG,
            ...scaled,
        };
    }
    const fromTop = topPredictions?.find((p) => p.foodCode === selectedFoodCode);
    return fromTop ? { ...fromTop, servingG } : null;
}

export function initialAdjustedGrams(analyzed, foodCode, resnetDishes) {
    const servingG = getServingGForCode(foodCode, resnetDishes);
    const fromAi = analyzed?.estimatedTotalGrams ?? analyzed?.portionSize;
    if (fromAi != null && Number(fromAi) > 0) {
        return Math.round(Number(fromAi));
    }
    const ratio = Number(analyzed?.portionRatio) || 1;
    return Math.round(servingG * ratio);
}

export const calculateProgress = (current, target) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
};

/** Local calendar YYYY-MM-DD (not UTC). */
export function formatLocalDate(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseLocalDate(iso) {
    if (!iso || typeof iso !== 'string') return new Date();
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysIso(iso, delta) {
    const d = parseLocalDate(iso);
    d.setDate(d.getDate() + delta);
    return formatLocalDate(d);
}

export function nowInVn() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
}

export function todayLocalIso() {
    return formatLocalDate(nowInVn());
}

export function isPastIso(iso) {
    return iso < todayLocalIso();
}

export function isFutureIso(iso) {
    return iso > todayLocalIso();
}

export function isTodayIso(iso) {
    return iso === todayLocalIso();
}

export function formatDisplayDate(iso) {
    const d = parseLocalDate(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function monthKeyFromIso(iso) {
    return iso.slice(0, 7);
}

/** Minutes since local midnight from Date or ISO (UTC → local). */
export function toLocalMinutes(isoOrDate = new Date()) {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return 0;
    return d.getHours() * 60 + d.getMinutes();
}

/** UI meal periods (5) — not API meal types. */
export const MEAL_PERIODS = ['MORNING', 'NOON', 'AFTERNOON', 'EVENING', 'LATE'];

export const MEAL_PERIOD_LABELS = {
    MORNING: 'Buổi sáng',
    NOON: 'Buổi trưa',
    AFTERNOON: 'Buổi chiều',
    EVENING: 'Buổi tối',
    LATE: 'Buổi khuya',
};

export const MEAL_TYPE_LABELS = {
    BREAKFAST: 'Buổi sáng',
    LUNCH: 'Buổi trưa',
    DINNER: 'Buổi tối',
    /** API chỉ có SNACK — gộp chiều/khuya trên UI plan/nhật ký */
    SNACK: 'Buổi chiều / khuya',
};

export function periodToMealType(period) {
    switch (period) {
        case 'MORNING': return 'BREAKFAST';
        case 'NOON': return 'LUNCH';
        case 'AFTERNOON': return 'SNACK';
        case 'EVENING': return 'DINNER';
        case 'LATE': return 'SNACK';
        default: return 'SNACK';
    }
}

/** Best-effort reverse of periodToMealType when mealPeriod is missing. */
export function mealTypeToPeriod(mealType, mealPeriod) {
    if (mealPeriod) return mealPeriod;
    switch (mealType) {
        case 'BREAKFAST': return 'MORNING';
        case 'LUNCH': return 'NOON';
        case 'DINNER': return 'EVENING';
        case 'SNACK': return 'AFTERNOON';
        default: return null;
    }
}

/** Buổi có self-plan PENDING chờ PT duyệt (theo ngày). */
export function getPendingSelfPeriodsForDate(submissions, planDate) {
    const periods = new Set();
    (submissions || [])
        .filter((s) => s.planDate === planDate && s.status === 'PENDING')
        .forEach((s) => {
            (s.items || []).forEach((item) => {
                const p = item.mealPeriod || mealTypeToPeriod(item.mealType);
                if (p) periods.add(p);
            });
        });
    return periods;
}

/**
 * Một món / buổi cho macro hiệu lực:
 * - override > PT gốc
 * - buổi có đề xuất PENDING: bỏ PT gốc (chưa thay thế)
 */
export function pickEffectivePlanItemsByPeriod(items, { pendingSelfPeriods = new Set() } = {}) {
    const byPeriod = new Map();
    (items || []).forEach((item) => {
        if (item.skipReason === 'SUPERSEDED' || item.choiceRejected) return;
        const period = resolvePlanItemPeriod(item) || mealTypeToPeriod(item.mealType, item.mealPeriod);
        const key = period || item.mealType || item.id;
        const isOverride = item.sourceType === 'SELF_OVERRIDE';
        const isSelf = item.source === 'SELF';
        if (period && pendingSelfPeriods.has(period) && !isOverride && !isSelf) {
            return;
        }
        const existing = byPeriod.get(key);
        if (!existing || isOverride) {
            byPeriod.set(key, item);
        }
    });
    return [...byPeriod.values()];
}

/**
 * MORNING 04:00–10:59, NOON 11:00–12:59, AFTERNOON 13:00–17:59,
 * EVENING 18:00–21:59, LATE 22:00–03:59 (wrap).
 */
export function mealPeriodFromMinutes(minutes) {
    const m = ((Number(minutes) % (24 * 60)) + (24 * 60)) % (24 * 60);
    if (m >= 4 * 60 && m < 11 * 60) return 'MORNING';
    if (m >= 11 * 60 && m < 13 * 60) return 'NOON';
    if (m >= 13 * 60 && m < 18 * 60) return 'AFTERNOON';
    if (m >= 18 * 60 && m < 22 * 60) return 'EVENING';
    return 'LATE';
}

export function getCurrentMealPeriod(date = nowInVn()) {
    return mealPeriodFromMinutes(toLocalMinutes(date));
}

/** Periods whose window has fully ended (AI lock on today). */
export function getLockedMealPeriods(date = nowInVn()) {
    const minutes = toLocalMinutes(date);
    const current = mealPeriodFromMinutes(minutes);
    const order = MEAL_PERIODS;
    const idx = order.indexOf(current);
    const locked = new Set();
    for (let i = 0; i < idx; i += 1) locked.add(order[i]);
    if (current !== 'LATE' && minutes >= 4 * 60) locked.add('LATE');
    return locked;
}

export function isFutureMealPeriod(period, date = new Date()) {
    const order = MEAL_PERIODS;
    const current = getCurrentMealPeriod(date);
    const locked = getLockedMealPeriods(date);
    if (locked.has(period)) return false;
    return order.indexOf(period) > order.indexOf(current);
}

export function suggestMealType(date = new Date()) {
    return periodToMealType(getCurrentMealPeriod(date));
}

export function getLockedMealTypes(date = new Date()) {
    const locked = new Set();
    getLockedMealPeriods(date).forEach((p) => locked.add(periodToMealType(p)));
    return locked;
}

/** SNACK → Buổi chiều / Buổi khuya theo giờ; không rõ giờ → Buổi chiều / khuya. */
export function formatMealTypeLabel(mealType, createdAt) {
    if (mealType === 'SNACK' && createdAt) {
        const period = mealPeriodFromMinutes(toLocalMinutes(createdAt));
        if (period === 'AFTERNOON') return 'Buổi chiều';
        if (period === 'LATE') return 'Buổi khuya';
    }
    return MEAL_TYPE_LABELS[mealType] || mealType || 'Bữa ăn';
}

/** Group diary into 5 period sections. Prefer persisted mealPeriod (SoT). */
export function resolveLogMealPeriod(log) {
    if (log?.mealPeriod && MEAL_PERIODS.includes(log.mealPeriod)) {
        return log.mealPeriod;
    }
    const mealType = log?.mealType;
    const ts = log?.createdAt || log?.logDate;
    if (mealType === 'BREAKFAST') return 'MORNING';
    if (mealType === 'LUNCH') return 'NOON';
    if (mealType === 'DINNER') return 'EVENING';
    if (mealType === 'SNACK' && ts) {
        const period = mealPeriodFromMinutes(toLocalMinutes(ts));
        if (period === 'AFTERNOON' || period === 'LATE') return period;
        return period === 'NOON' || period === 'MORNING' ? 'AFTERNOON' : 'LATE';
    }
    if (mealType === 'SNACK') return 'AFTERNOON';
    return 'AFTERNOON';
}

/** Plan item grouping — prefer persisted mealPeriod (SoT). */
export function resolvePlanItemPeriod(item) {
    if (item?.mealPeriod && MEAL_PERIODS.includes(item.mealPeriod)) return item.mealPeriod;
    if (item?.mealType === 'BREAKFAST') return 'MORNING';
    if (item?.mealType === 'LUNCH') return 'NOON';
    if (item?.mealType === 'DINNER') return 'EVENING';
    if (item?.mealType === 'SNACK') return 'AFTERNOON';
    return 'AFTERNOON';
}

/**
 * Mark-eaten gate. LATE spans midnight:
 * open for planDate=today when hour>=22, or planDate=yesterday when hour<4.
 */
export function isMealPeriodOpen(planDate, period, now = nowInVn()) {
    if (!planDate || !period) return false;
    const nowDate = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(nowDate.getTime())) return false;
    const today = formatLocalDate(nowDate);
    const plan = typeof planDate === 'string' ? planDate.slice(0, 10) : formatLocalDate(planDate);
    const hour = nowDate.getHours();

    if (period === 'LATE') {
        const y = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1);
        const yesterday = formatLocalDate(y);
        return (plan === today && hour >= 22) || (plan === yesterday && hour < 4);
    }
    return plan === today && getCurrentMealPeriod(nowDate) === period;
}

/** Buổi đã qua trong cùng ngày (ordinal), dùng cho tick trễ — không gồm buổi tương lai. */
export function isMealPeriodPast(planDate, period, now = nowInVn()) {
    if (!planDate || !period) return false;
    const plan = typeof planDate === 'string' ? planDate.slice(0, 10) : formatLocalDate(planDate);
    if (plan !== todayLocalIso()) return false;
    const nowDate = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(nowDate.getTime()) || nowDate.getHours() < 4) return false;
    const currentIdx = MEAL_PERIODS.indexOf(getCurrentMealPeriod(nowDate));
    const periodIdx = MEAL_PERIODS.indexOf(period);
    if (currentIdx < 0 || periodIdx < 0) return false;
    return periodIdx < currentIdx;
}

/** Tick trễ: hôm nay, buổi đã qua, không phải khung đang mở. */
export function canLateTickMealPeriod(planDate, period, now = nowInVn()) {
    if (!planDate || !period) return false;
    return isTodayIso(typeof planDate === 'string' ? planDate.slice(0, 10) : formatLocalDate(planDate))
        && !isMealPeriodOpen(planDate, period, now)
        && isMealPeriodPast(planDate, period, now);
}

/** Chờ PT duyệt nhật ký không được coi là buổi đã chốt. */
function isActualIntakeLog(log) {
    if (!log) return false;
    if (log.status && log.status !== 'LOGGED') return false;
    const rs = log.reviewStatus;
    return !rs || rs === 'NOT_REQUIRED' || rs === 'APPROVED';
}

/**
 * Buổi đã chốt khi: có diet log buổi đó, món PT/override eaten, toàn bộ PT skip, hoặc self eaten.
 * @param {string} mealPeriod
 * @param {Array} items day-plan items for the date
 * @param {Array} [logs] optional diet logs for the date
 */
export function isMealPeriodSettled(mealPeriod, items = [], logs = []) {
    if (!mealPeriod) return false;
    const inPeriod = (items || []).filter((i) => resolvePlanItemPeriod(i) === mealPeriod);
    if ((logs || []).some((l) => l.mealPeriod === mealPeriod && isActualIntakeLog(l))) {
        return true;
    }
    const ptItems = inPeriod.filter((i) => i.source === 'PT' || i.sourceType === 'SELF_OVERRIDE' || i.sourceType === 'PT_ORIGINAL');
    if (ptItems.some((i) => i.eaten)) return true;
    if (ptItems.length > 0 && ptItems.every((i) => i.skipReason)) return true;
    if (inPeriod.some((i) => i.source === 'SELF' && i.eaten)) return true;
    return false;
}

/** Periods already past today (for makeup select). Empty when hour < 4 (soft UX). */
export function getPastMealPeriodsForMakeup(date = nowInVn()) {
    const minutes = toLocalMinutes(date);
    if (minutes < 4 * 60) return [];
    const current = getCurrentMealPeriod(date);
    const idx = MEAL_PERIODS.indexOf(current);
    const past = [];
    for (let i = 0; i < idx; i += 1) past.push(MEAL_PERIODS[i]);
    if (current !== 'LATE') past.push('LATE');
    return past;
}

/** Mirror IntakeControlLoopServiceImpl (calo only). */
export function computeIntakeStatus(projectedCalories, targetCalories, date = new Date()) {
    const projected = Number(projectedCalories) || 0;
    const target = Number(targetCalories) || 0;
    if (target <= 0) return { intakeStatus: 'OK', controlLoopMessage: null };
    if (projected > target * 1.2) {
        return {
            intakeStatus: 'OVER_MACRO',
            controlLoopMessage: `Hôm nay bạn đã nạp ${Math.round(projected)} kcal, vượt ~20% mục tiêu ${Math.round(target)} kcal.`,
        };
    }
    const hour = (date instanceof Date ? date : new Date(date)).getHours();
    if (hour >= 18 && projected < target * 0.5) {
        return {
            intakeStatus: 'UNDER_INTAKE',
            controlLoopMessage: `Hôm nay mới ${Math.round(projected)} kcal — dưới 50% mục tiêu. Hãy bổ sung bữa ăn.`,
        };
    }
    return { intakeStatus: 'OK', controlLoopMessage: null };
}

export function scaleFoodMacros(food, quantityG) {
    const serving = Number(food?.servingSizeG) > 0 ? Number(food.servingSizeG) : 100;
    const qty = Number(quantityG) > 0 ? Number(quantityG) : serving;
    const ratio = qty / serving;
    return {
        calories: Math.round((Number(food?.calories) || 0) * ratio * 100) / 100,
        protein: Math.round((Number(food?.protein) || 0) * ratio * 100) / 100,
        carb: Math.round((Number(food?.carb ?? food?.carbs) || 0) * ratio * 100) / 100,
        fat: Math.round((Number(food?.fat) || 0) * ratio * 100) / 100,
        quantityG: qty,
    };
}

/**
 * Whether eaten plan item macros are already included in diet-log summary totals.
 */
export function isPlanItemInDietLogTotals(item) {
    if (!item?.eaten) return false;
    if (item.source === 'SELF') return true;
    if (item.sourceType === 'SELF_OVERRIDE') return true;
    return false;
}

function periodKey(i) {
    return resolvePlanItemPeriod(i) || i.mealType || '';
}

function isPtOriginalPlanItem(i) {
    return i?.source === 'PT' && i?.sourceType !== 'SELF_OVERRIDE';
}

function shouldIncludePlanItem(i, activeSelfByPeriod, pastDate, excludeItemId, opts = {}) {
    const { coachedMode = false, settledPeriods = new Set(), pendingReplacePeriods = new Set() } = opts;
    if (i.skipReason || i.applied || i.choiceRejected) return false;
    if (pastDate) return false;
    if (excludeItemId && String(i.id) === String(excludeItemId)) return false;
    if (i.lockedByReview) return false;

    const pk = periodKey(i);
    if (pk && pendingReplacePeriods.has(pk) && i.source === 'SELF' && i.sourceType !== 'SELF_OVERRIDE') {
        return false;
    }
    if (pk && settledPeriods.has(pk) && !i.eaten) return false;

    if (coachedMode && isPtOriginalPlanItem(i) && !i.eaten) return false;

    if (isPtOriginalPlanItem(i) && activeSelfByPeriod.has(pk)) return false;
    if (i.source === 'SELF' && i.sourceType !== 'SELF_OVERRIDE' && !activeSelfByPeriod.has(pk)) return false;
    return true;
}

function addMacros(totals, item) {
    totals.calories += Number(item.calories) || 0;
    totals.protein += Number(item.protein) || 0;
    totals.carb += Number(item.carb ?? item.carbs) || 0;
    totals.fat += Number(item.fat) || 0;
}

function roundMacros(totals) {
    return {
        calories: Math.round(totals.calories * 100) / 100,
        protein: Math.round(totals.protein * 100) / 100,
        carb: Math.round(totals.carb * 100) / 100,
        fat: Math.round(totals.fat * 100) / 100,
    };
}

function emptyMacros() {
    return { calories: 0, protein: 0, carb: 0, fat: 0 };
}

/**
 * Plan progress for nutrition bars:
 * - pending: uneaten plan counted toward projection (gray)
 * - compliance: eaten PT tuân thủ chưa có diet log (vivid)
 * - fullPlan: pending + compliance + eaten đã log (informational)
 *
 * Coached mode: PT gốc chưa tick không cộng; self chờ duyệt / buổi đã chốt không cộng.
 */
export function computePlanProgressBreakdown(items = [], {
    draftItem = null,
    excludeItemId = null,
    dateIso = null,
    coachedMode = false,
} = {}) {
    const list = Array.isArray(items) ? items : [];
    const pastDate = dateIso ? isPastIso(dateIso) : false;
    const settledPeriods = new Set(
        MEAL_PERIODS.filter((p) => isMealPeriodSettled(p, list)),
    );
    const pendingReplacePeriods = new Set();
    list.forEach((i) => {
        if (i.source === 'SELF' && i.lockedByReview) {
            const pk = periodKey(i);
            if (pk) pendingReplacePeriods.add(pk);
        }
    });
    const activeSelfByPeriod = new Set();
    list.forEach((i) => {
        if (i.source !== 'SELF' || i.sourceType === 'SELF_OVERRIDE') return;
        if (i.applied || i.eaten || i.skipReason || i.lockedByReview || i.choiceRejected) return;
        if (excludeItemId && String(i.id) === String(excludeItemId)) return;
        const pk = periodKey(i);
        if (pk && settledPeriods.has(pk)) return;
        if (pk && pendingReplacePeriods.has(pk)) return;
        activeSelfByPeriod.add(pk);
    });
    if (draftItem?.mealType) activeSelfByPeriod.add(draftItem.mealType);
    if (draftItem?.mealPeriod) activeSelfByPeriod.add(draftItem.mealPeriod);

    const includeOpts = { coachedMode, settledPeriods, pendingReplacePeriods };
    const pending = emptyMacros();
    const compliance = emptyMacros();
    const fullPlan = emptyMacros();

    list.forEach((i) => {
        if (!shouldIncludePlanItem(i, activeSelfByPeriod, pastDate, excludeItemId, includeOpts)) return;
        addMacros(fullPlan, i);
        if (i.eaten) {
            if (!isPlanItemInDietLogTotals(i)) {
                addMacros(compliance, i);
            }
        } else {
            addMacros(pending, i);
        }
    });

    if (draftItem) {
        addMacros(pending, draftItem);
        addMacros(fullPlan, draftItem);
    }

    return {
        pending: roundMacros(pending),
        compliance: roundMacros(compliance),
        fullPlan: roundMacros(fullPlan),
    };
}

/**
 * plannedTotals: mealType with active SELF → only SELF; else include PT.
 * Optional draftItem replaces excludeItemId macros when editing.
 * @deprecated Prefer computePlanProgressBreakdown for UI progress.
 */
export function computePlannedTotals(items = [], options = {}) {
    return computePlanProgressBreakdown(items, options).pending;
}

/** Page size for diet log list fetches (documented contract). */
export const DIET_LOG_PAGE_SIZE = 50;
/** Safety cap for pagination loops. */
export const DIET_LOG_MAX_PAGES = 20;

export async function fetchAllDietLogsForRange(dietService, { startDate, endDate }) {
    const all = [];
    let page = 0;
    while (page < DIET_LOG_MAX_PAGES) {
        const res = await dietService.getLogs({
            page,
            size: DIET_LOG_PAGE_SIZE,
            startDate,
            endDate,
        });
        const data = res.data?.data;
        const content = data?.content || [];
        all.push(...content);
        const last = data?.last === true || content.length < DIET_LOG_PAGE_SIZE;
        if (last) break;
        page += 1;
        if (page >= DIET_LOG_MAX_PAGES) {
            console.warn('[diet] hit DIET_LOG_MAX_PAGES while fetching logs', { startDate, endDate });
        }
    }
    return all;
}

