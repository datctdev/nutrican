// src/pages/customer/components/dietUtils.js

export const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const minioUrl = import.meta.env.VITE_MINIO_URL || 'http://localhost:9000/nutrican-media';
    return `${minioUrl}/${url}`;
};

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
    const alias = dish.aliases?.find((a) => RESNET_FOOD_CODES.includes(a));
    if (alias) return alias;
    if (dish.nameEn) return dish.nameEn.replace(/ /g, '_');
    return null;
}

export function getManualDishOptions(resnetDishes) {
    if (resnetDishes?.length > 0) return resnetDishes;
    return RESNET_FOOD_CODES.map((code) => ({
        nameVi: FOOD_CODE_LABELS[code],
        aliases: [code],
        ...RESNET_MACRO_ESTIMATES[code],
    }));
}

export function getServingGForCode(foodCode, resnetDishes) {
    if (!foodCode) return 350;
    const dish = getManualDishOptions(resnetDishes).find((d) => resolveResnetFoodCode(d) === foodCode);
    return Math.round(
        Number(dish?.servingSizeG || dish?.servingG || RESNET_MACRO_ESTIMATES[foodCode]?.servingG || 350)
    );
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
