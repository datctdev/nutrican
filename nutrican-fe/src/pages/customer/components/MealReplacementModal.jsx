import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Search } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { Button } from '../../../components/ui/button';
import { dietService } from '../../../services/dietService';

const REASONS = [
  { value: 'DONT_LIKE', label: 'Không thích món' },
  { value: 'UNAVAILABLE', label: 'Không có nguyên liệu' },
  { value: 'ALLERGY', label: 'Dị ứng / không phù hợp' },
  { value: 'EQUIVALENT', label: 'Muốn món tương đương' },
  { value: 'OTHER', label: 'Lý do khác' },
];

function getFoodCode(food) {
  return food.aliases?.[0] || food.nameEn || food.nameVi;
}

export default function MealReplacementModal({ open, item, saving, onClose, onConfirm }) {
  const [reason, setReason] = useState('DONT_LIKE');
  const [customerNote, setCustomerNote] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portionGrams, setPortionGrams] = useState(100);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      return undefined;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await dietService.searchFoods(query.trim(), { dietFilter: true });
        setResults((response.data.data || []).slice(0, 20));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [open, query]);

  const selectedMacros = useMemo(() => {
    if (!selectedFood) return null;
    const baseServing = Number(selectedFood.servingSizeG) || 100;
    const ratio = (Number(portionGrams) || 0) / baseServing;
    return {
      calories: Math.round((Number(selectedFood.calories) || 0) * ratio),
      protein: Math.round((Number(selectedFood.protein) || 0) * ratio),
      carb: Math.round((Number(selectedFood.carb) || 0) * ratio),
      fat: Math.round((Number(selectedFood.fat) || 0) * ratio),
    };
  }, [portionGrams, selectedFood]);

  const canSubmit = selectedFood
    && Number(portionGrams) > 0
    && (reason !== 'OTHER' || customerNote.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({
      suggestedFoodCode: getFoodCode(selectedFood),
      suggestedFoodName: selectedFood.nameVi,
      suggestedGram: Number(portionGrams),
      reason,
      customerNote: customerNote.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Đề nghị thay món" size="lg">
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Món hiện tại</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-slate-800">{item?.freeText || item?.foodCode}</p>
            <span className="shrink-0 text-xs font-bold text-slate-500">{item?.portionGrams}g</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-700">1. Vì sao bạn muốn thay?</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReason(option.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  reason === option.value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {(reason === 'OTHER' || reason === 'ALLERGY') && (
            <textarea
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              rows={2}
              placeholder={reason === 'ALLERGY' ? 'Mô tả phản ứng hoặc thành phần cần tránh...' : 'Nhập lý do...' }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-700">2. Chọn món muốn thay</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm món trong danh mục, ví dụ: cá hồi, khoai lang..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-100">
            {searching ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm món phù hợp...
              </div>
            ) : query.trim().length < 2 ? (
              <p className="py-7 text-center text-xs text-slate-400">Nhập ít nhất 2 ký tự để tìm món.</p>
            ) : results.length === 0 ? (
              <p className="py-7 text-center text-xs text-slate-400">Không tìm thấy món phù hợp.</p>
            ) : results.map((food) => {
              const selected = selectedFood?.id === food.id;
              return (
                <button
                  key={food.id || getFoodCode(food)}
                  type="button"
                  onClick={() => {
                    setSelectedFood(food);
                    setPortionGrams(Number(food.servingSizeG) || Number(item?.portionGrams) || 100);
                  }}
                  className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{food.nameVi}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                      {food.servingSizeG || 100}g · {food.calories || 0} kcal · P {food.protein || 0}g
                    </p>
                  </div>
                  {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {selectedFood && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold text-blue-900">{selectedFood.nameVi}</p>
                <p className="mt-1 text-[11px] font-medium text-blue-700">
                  {selectedMacros.calories} kcal · P {selectedMacros.protein}g · C {selectedMacros.carb}g · F {selectedMacros.fat}g
                </p>
              </div>
              <label className="text-[10px] font-bold text-slate-500">
                Khẩu phần đề nghị
                <div className="mt-1 flex items-center rounded-lg border border-blue-200 bg-white px-2">
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={portionGrams}
                    onChange={(event) => setPortionGrams(event.target.value)}
                    className="h-8 w-20 bg-transparent text-right text-sm font-bold text-slate-800 outline-none"
                  />
                  <span className="ml-1 text-xs text-slate-400">g</span>
                </div>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Món hiện tại chỉ được thay sau khi PT duyệt để không làm lệch mục tiêu dinh dưỡng.
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="bg-blue-600 text-white hover:bg-blue-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Gửi PT duyệt
          </Button>
        </div>
      </div>
    </Modal>
  );
}
