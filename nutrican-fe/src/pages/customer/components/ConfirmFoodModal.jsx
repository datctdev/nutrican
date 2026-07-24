import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Send, Search, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { dietService } from '../../../services/dietService';
import {
    FOOD_CODE_LABELS,
    formatPredictionConfidence,
    getDefaultDishHints,
    resolveResnetFoodCode,
    getServingGForCode,
    getServingGForDish,
    scaleMacrosByGrams,
    RESNET_MACRO_ESTIMATES,
} from './dietUtils';

const SEARCH_MIN_LEN = 2;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_CAP = 20;

function isSelectedFood(selectedFood, type, value) {
    return selectedFood?.type === type && String(selectedFood?.value) === String(value);
}

export default function ConfirmFoodModal({
    confirmModal,
    resnetDishes,
    confirmingFood,
    handleCancelConfirmation,
    handleConfirmRecognition,
    setConfirmModal,
    onSwitchToManual,
    hasActivePt = false,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [searchActive, setSearchActive] = useState(false);
    const searchSeqRef = useRef(0);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!confirmModal?.logId) return;
        setSearchQuery('');
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError('');
        setSearchActive(false);
        searchSeqRef.current += 1;
    }, [confirmModal?.logId]);

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    if (!confirmModal) return null;

    const selectedFood = confirmModal.selectedFood || null;
    const llavaName = confirmModal.llavaUsed && confirmModal.llavaFoodName
        ? confirmModal.llavaFoodName
        : null;

    const defaultHints = getDefaultDishHints(resnetDishes, llavaName, 8);

    const selectByCode = (code, dishHint) => {
        if (!code) return;
        const servingG = dishHint
            ? getServingGForDish(dishHint)
            : getServingGForCode(code, resnetDishes);
        setConfirmModal((prev) => ({
            ...prev,
            selectedFood: { type: 'code', value: code },
            selectedDish: dishHint || null,
            adjustedGrams: servingG,
        }));
    };

    const selectById = (dish) => {
        if (!dish?.id) return;
        const servingG = getServingGForDish(dish);
        setConfirmModal((prev) => ({
            ...prev,
            selectedFood: { type: 'id', value: String(dish.id) },
            selectedDish: dish,
            adjustedGrams: servingG,
        }));
    };

    const runSearch = async (q) => {
        const trimmed = (q || '').trim();
        if (trimmed.length < SEARCH_MIN_LEN) {
            setSearchResults([]);
            setSearchError('');
            setSearchLoading(false);
            setSearchActive(false);
            return;
        }
        const seq = ++searchSeqRef.current;
        setSearchLoading(true);
        setSearchError('');
        setSearchActive(true);
        try {
            const res = await dietService.searchFoods(trimmed, { dietFilter: false });
            if (seq !== searchSeqRef.current) return;
            const list = (res.data?.data || []).slice(0, SEARCH_CAP);
            setSearchResults(list);
        } catch {
            if (seq !== searchSeqRef.current) return;
            setSearchResults([]);
            setSearchError('Không tải được danh sách — thử lại');
        } finally {
            if (seq === searchSeqRef.current) setSearchLoading(false);
        }
    };

    const onSearchChange = (value) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(value), SEARCH_DEBOUNCE_MS);
    };

    const onLlavaChipClick = () => {
        if (!llavaName) return;
        setSearchQuery(llavaName);
        runSearch(llavaName);
    };

    const resolveSelectedPreview = () => {
        if (!selectedFood) return null;
        const grams = confirmModal.adjustedGrams ?? 350;
        if (selectedFood.type === 'id' && confirmModal.selectedDish) {
            const dish = confirmModal.selectedDish;
            const servingG = getServingGForDish(dish);
            const scaled = scaleMacrosByGrams(dish, grams, servingG);
            return {
                foodName: dish.nameVi || dish.nameEn || 'Món đã chọn',
                servingG,
                ...scaled,
            };
        }
        const code = selectedFood.value;
        const dish = resnetDishes?.find((d) => resolveResnetFoodCode(d) === code);
        const servingG = getServingGForCode(code, resnetDishes);
        const base = dish
            || RESNET_MACRO_ESTIMATES[code]
            || confirmModal.topPredictions?.find((p) => p.foodCode === code);
        const scaled = scaleMacrosByGrams(base || {}, grams, servingG);
        return {
            foodName: dish?.nameVi
                || FOOD_CODE_LABELS[code]
                || confirmModal.topPredictions?.find((p) => p.foodCode === code)?.foodName
                || code,
            foodCode: code,
            servingG,
            ...scaled,
        };
    };

    const selectedPrediction = resolveSelectedPreview();
    const servingG = selectedPrediction?.servingG ?? 350;
    const grams = confirmModal.adjustedGrams ?? servingG;
    const minG = Math.max(50, Math.round(servingG * 0.4));
    const maxG = Math.min(900, Math.round(servingG * 2.2));

    const showHints = !searchActive && searchQuery.trim().length < SEARCH_MIN_LEN;
    const showResults = searchActive;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-in">
                <div className="flex-shrink-0 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-blue-50">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-600 flex-shrink-0" />
                                Xác nhận món ăn
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                                ResNet Phase 2 + NutriHome · kéo gram → xác nhận để gửi
                            </p>
                            {llavaName && (
                                <p className="text-xs text-emerald-700 mt-1.5 font-medium truncate">
                                    LLaVA: {llavaName}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleCancelConfirmation}
                            disabled={confirmingFood}
                            aria-label="Đóng"
                            className="p-2 rounded-full hover:bg-white/90 text-slate-500 disabled:opacity-50 flex-shrink-0"
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

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                    <section>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Top 3 nhận diện</p>
                        <div className="space-y-2">
                            {confirmModal.topPredictions?.map((pred, idx) => {
                                const isSelected = isSelectedFood(selectedFood, 'code', pred.foodCode);
                                return (
                                    <button
                                        key={pred.foodCode || idx}
                                        type="button"
                                        onClick={() => selectByCode(pred.foodCode)}
                                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                            isSelected
                                                ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-200'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                                                <p className="font-semibold text-slate-800 text-sm truncate">
                                                    {pred.foodName || FOOD_CODE_LABELS[pred.foodCode] || pred.foodCode}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                isSelected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {formatPredictionConfidence(pred.confidence)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 font-medium">Không đúng món? Tìm bên dưới</p>
                    </section>

                    <section className="pt-1 border-t border-slate-100 space-y-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {showResults ? `Kết quả tìm kiếm (${searchResults.length})` : 'Tìm món đúng'}
                        </p>

                        {llavaName && (
                            <button
                                type="button"
                                onClick={onLlavaChipClick}
                                className="inline-flex items-center gap-1.5 max-w-full px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                            >
                                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">LLaVA gợi ý: &quot;{llavaName}&quot;</span>
                            </button>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Gõ tên món (tối thiểu 2 ký tự)…"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
                            />
                        </div>

                        {searchLoading && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tìm…
                            </div>
                        )}
                        {searchError && (
                            <div className="flex items-center justify-between gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                <span>{searchError}</span>
                                <button type="button" className="font-semibold underline" onClick={() => runSearch(searchQuery)}>
                                    Thử lại
                                </button>
                            </div>
                        )}

                        {showHints && defaultHints.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                                {defaultHints.map((dish) => {
                                    const code = resolveResnetFoodCode(dish);
                                    if (!code) return null;
                                    const isSelected = isSelectedFood(selectedFood, 'code', code);
                                    const sG = getServingGForDish(dish);
                                    const scaled = scaleMacrosByGrams(dish, sG, sG);
                                    return (
                                        <button
                                            key={code}
                                            type="button"
                                            onClick={() => selectByCode(code, dish)}
                                            className={`text-left p-2.5 rounded-xl border-2 text-xs transition-all ${
                                                isSelected
                                                    ? 'border-emerald-500 bg-emerald-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <p className="font-bold text-slate-800 leading-tight line-clamp-2">
                                                {dish.nameVi || code}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                ~{scaled?.calories ?? '—'} kcal
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {showResults && !searchLoading && !searchError && (
                            <>
                                {searchResults.length === 0 ? (
                                    <p className="text-xs text-slate-500 py-2">Không có kết quả phù hợp.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                                        {searchResults.map((dish) => {
                                            const isSelected = isSelectedFood(selectedFood, 'id', dish.id);
                                            const sG = getServingGForDish(dish);
                                            const scaled = scaleMacrosByGrams(dish, sG, sG);
                                            return (
                                                <button
                                                    key={dish.id}
                                                    type="button"
                                                    onClick={() => selectById(dish)}
                                                    className={`text-left p-2.5 rounded-xl border-2 text-xs transition-all ${
                                                        isSelected
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <p className="font-bold text-slate-800 leading-tight line-clamp-2">
                                                        {dish.nameVi || dish.nameEn}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        ~{scaled?.calories ?? '—'} kcal
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {searchResults.length >= SEARCH_CAP && (
                                    <p className="text-[11px] text-slate-400">Gõ thêm để thu hẹp kết quả</p>
                                )}
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onSwitchToManual}
                            disabled={confirmingFood}
                            className="w-full text-center text-xs font-semibold text-violet-700 hover:text-violet-900 py-2 disabled:opacity-50"
                        >
                            Không tìm thấy — nhập thủ công
                        </button>
                    </section>

                    {selectedFood && (
                        <section className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/50 to-white p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-800">Khẩu phần</p>
                                <span className="text-xl font-bold text-violet-700 tabular-nums">{grams}g</span>
                            </div>
                            <input
                                type="range"
                                min={minG}
                                max={maxG}
                                step={5}
                                value={Math.min(maxG, Math.max(minG, grams))}
                                onChange={(e) => setConfirmModal((prev) => ({
                                    ...prev,
                                    adjustedGrams: Number(e.target.value),
                                }))}
                                className="w-full h-2.5 accent-violet-600 cursor-pointer rounded-full"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500">
                                <span>{minG}g</span>
                                <span className="font-medium text-violet-600">Chuẩn {servingG}g</span>
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
                    )}
                </div>

                <div className="flex-shrink-0 px-5 py-4 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                    {hasActivePt && (
                        <label className="flex items-start gap-2 mb-3 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked
                                disabled
                                readOnly
                            />
                            <span className="text-xs text-violet-900">
                                <strong>Ghi vào nhật ký & gửi PT kiểm tra</strong>
                                <span className="block text-violet-700/80 mt-0.5">
                                    Kết quả nhận diện từ ảnh luôn được PT kiểm tra (không tắt được). Bữa ăn vẫn tính vào mục tiêu hôm nay; nếu AI sai, PT sẽ chỉnh lại chỉ số.
                                </span>
                            </span>
                        </label>
                    )}
                    {selectedPrediction && (
                        <p className="text-center text-sm font-semibold text-emerald-700 mb-3">
                            Tổng: {selectedPrediction.calories ?? '—'} kcal · {grams}g
                            {selectedPrediction.foodName ? ` · ${selectedPrediction.foodName}` : ''}
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
                            disabled={confirmingFood || !selectedFood}
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
