// src/pages/customer/components/ConfirmFoodModal.jsx
import { X, Sparkles, Send } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { 
    FOOD_CODE_LABELS, formatPredictionConfidence, getManualDishOptions, 
    resolveResnetFoodCode, getServingGForCode, scaleMacrosByGrams 
} from './dietUtils';

export default function ConfirmFoodModal({
    confirmModal,
    resnetDishes,
    confirmingFood,
    handleCancelConfirmation,
    handleConfirmRecognition,
    setConfirmModal,
}) {
    if (!confirmModal) return null;

    const selectFoodCode = (code) => {
        const servingG = getServingGForCode(code, resnetDishes);
        setConfirmModal((prev) => ({
            ...prev,
            selectedFoodCode: code,
            adjustedGrams: servingG,
        }));
    };

    const manualDishOptions = getManualDishOptions(resnetDishes);
    const selectedPrediction = confirmModal.selectedFoodCode
        ? {
            foodCode: confirmModal.selectedFoodCode,
            foodName: FOOD_CODE_LABELS[confirmModal.selectedFoodCode] || confirmModal.selectedFoodCode,
            ...scaleMacrosByGrams(
                manualDishOptions.find((d) => resolveResnetFoodCode(d) === confirmModal.selectedFoodCode) || 
                RESNET_MACRO_ESTIMATES[confirmModal.selectedFoodCode] || 
                confirmModal.topPredictions?.find((p) => p.foodCode === confirmModal.selectedFoodCode),
                confirmModal.adjustedGrams ?? getServingGForCode(confirmModal.selectedFoodCode, resnetDishes),
                getServingGForCode(confirmModal.selectedFoodCode, resnetDishes)
            )
        }
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-in">
                {/* Header */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-blue-50">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-605 flex-shrink-0" />
                                Xác nhận món ăn
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                                ResNet Phase 2 + NutriHome · kéo gram → xác nhận để gửi
                            </p>
                            {confirmModal.llavaUsed && confirmModal.llavaFoodName && (
                                <p className="text-xs text-emerald-700 mt-1.5 font-medium truncate">
                                    LLaVA: {confirmModal.llavaFoodName}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleCancelConfirmation}
                            disabled={confirmingFood}
                            aria-label="Đóng"
                            className="p-2 rounded-full hover:bg-white/90 text-slate-500 disabled:opacity-50 flex-shrink-0 animate-fade-in"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {confirmModal.needsConfirmation && (
                        <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                            Độ tin cậy thấp — chọn đúng món và chỉnh gram trước khi gửi.
                        </p>
                    )}
                    {confirmModal.dietPrefWarning && (
                        <p className="mt-2 text-[11px] text-orange-900 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
                            {confirmModal.dietPrefWarning}
                        </p>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                    <section>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Top 3 nhận diện</p>
                        <div className="space-y-2">
                            {confirmModal.topPredictions?.map((pred, idx) => {
                                const isSelected = pred.foodCode === confirmModal.selectedFoodCode;
                                return (
                                    <button
                                        key={pred.foodCode}
                                        type="button"
                                        onClick={() => selectFoodCode(pred.foodCode)}
                                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                            isSelected
                                                ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-200'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-slate-400 font-sans">#{idx + 1}</span>
                                                <p className="font-semibold text-slate-800 text-sm truncate">
                                                    {pred.foodName || FOOD_CODE_LABELS[pred.foodCode]}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                isSelected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-655'
                                            }`}>
                                                {formatPredictionConfidence(pred.confidence)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {manualDishOptions.length > 0 && (
                        <section className="pt-1 border-t border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Chọn món đúng (10 món)
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-0.5">
                                {manualDishOptions.map((dish) => {
                                    const code = resolveResnetFoodCode(dish);
                                    if (!code) return null;
                                    const isSelected = code === confirmModal.selectedFoodCode;
                                    const servingG = getServingGForCode(code, resnetDishes);
                                    const scaled = scaleMacrosByGrams(dish, confirmModal.adjustedGrams ?? servingG, servingG);
                                    return (
                                        <button
                                            key={code}
                                            type="button"
                                            onClick={() => selectFoodCode(code)}
                                            className={`text-left p-2.5 rounded-xl border-2 text-xs transition-all ${
                                                isSelected
                                                    ? 'border-emerald-500 bg-emerald-50'
                                                    : code === 'com_tam'
                                                        ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                                                        : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <p className="font-bold text-slate-800 leading-tight line-clamp-2">
                                                {dish.nameVi || FOOD_CODE_LABELS[code]}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                ~{scaled?.calories ?? '—'} kcal
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {confirmModal.selectedFoodCode && (() => {
                        const servingG = getServingGForCode(confirmModal.selectedFoodCode, resnetDishes);
                        const minG = Math.max(50, Math.round(servingG * 0.4));
                        const maxG = Math.min(900, Math.round(servingG * 2.2));
                        const grams = confirmModal.adjustedGrams ?? servingG;
                        return (
                            <section className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/50 to-white p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-800">Khẩu phần</p>
                                    <span className="text-xl font-bold text-violet-750 tabular-nums">{grams}g</span>
                                </div>
                                <input
                                    type="range"
                                    min={minG}
                                    max={maxG}
                                    step={5}
                                    value={grams}
                                    onChange={(e) => setConfirmModal((prev) => ({
                                        ...prev,
                                        adjustedGrams: Number(e.target.value),
                                    }))}
                                    className="w-full h-2.5 accent-violet-600 cursor-pointer rounded-full"
                                />
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>{minG}g</span>
                                    <span className="font-medium text-violet-650">Chuẩn {servingG}g</span>
                                    <span>{maxG}g</span>
                                </div>
                                {selectedPrediction && (
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[
                                            { label: 'Kcal', value: selectedPrediction.calories, accent: 'text-emerald-700' },
                                            { label: 'Đạm (Pro)', value: `${selectedPrediction.protein ?? '—'}g`, accent: 'text-slate-800' },
                                            { label: 'Tinh bột (Carb)', value: `${selectedPrediction.carb ?? '—'}g`, accent: 'text-slate-800' },
                                            { label: 'Chất béo (Fat)', value: `${selectedPrediction.fat ?? '—'}g`, accent: 'text-slate-800' },
                                        ].map(({ label, value, accent }) => (
                                            <div key={label} className="rounded-xl bg-white border border-slate-100 py-2 text-center shadow-sm">
                                                <p className="text-[10px] text-slate-500">{label}</p>
                                                <p className={`text-sm font-bold ${accent}`}>{value ?? '—'}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })()}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-4 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-pb">
                    {selectedPrediction && (
                        <p className="text-center text-sm font-semibold text-emerald-700 mb-3">
                            Tổng: {selectedPrediction.calories ?? '—'} kcal · {confirmModal.adjustedGrams ?? '—'}g
                        </p>
                    )}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-slate-300 text-slate-700 font-semibold"
                            disabled={confirmingFood}
                            onClick={handleCancelConfirmation}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            className="flex-1 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md shadow-violet-200"
                            disabled={confirmingFood || !confirmModal.selectedFoodCode}
                            onClick={handleConfirmRecognition}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {confirmingFood ? 'Đang gửi...' : 'Gửi bữa ăn'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Fallback estimates map in case needed
const RESNET_MACRO_ESTIMATES = {
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
