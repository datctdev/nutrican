import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { workspaceService } from '../../../services/workspaceService';

const REASON_LABEL = {
  DONT_LIKE: 'Không thích món',
  UNAVAILABLE: 'Không có nguyên liệu',
  ALLERGY: 'Dị ứng / không phù hợp',
  EQUIVALENT: 'Muốn món tương đương',
  OTHER: 'Lý do khác',
};

const MEAL_LABEL = {
  BREAKFAST: 'Bữa sáng',
  LUNCH: 'Bữa trưa',
  DINNER: 'Bữa tối',
  SNACK: 'Bữa phụ',
};

export default function MealPlanSuggestionReviewList({ suggestions, onUpdated }) {
  const [notes, setNotes] = useState({});
  const [reviewingId, setReviewingId] = useState(null);

  const review = async (suggestion, action) => {
    const ptNote = notes[suggestion.id]?.trim();
    if (action === 'REJECT' && !ptNote) {
      toast.error('Vui lòng nhập lý do từ chối để học viên biết cách điều chỉnh');
      return;
    }
    setReviewingId(suggestion.id);
    try {
      await workspaceService.reviewMealPlanSuggestion(suggestion.id, { action, ptNote });
      toast.success(action === 'APPROVE' ? 'Đã duyệt thay món' : 'Đã từ chối yêu cầu');
      setNotes((current) => ({ ...current, [suggestion.id]: '' }));
      await onUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xử lý yêu cầu');
    } finally {
      setReviewingId(null);
    }
  };

  if (!suggestions?.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800">Yêu cầu thay món chờ duyệt</h3>
        <p className="mt-0.5 text-xs text-slate-500">Kiểm tra món và khẩu phần trước khi cập nhật thực đơn của học viên.</p>
      </div>

      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {suggestion.planDate}</span>
            <span>·</span>
            <span>{MEAL_LABEL[suggestion.mealType] || suggestion.mealType}</span>
            <span className={`ml-auto rounded-full px-2 py-1 font-extrabold ${suggestion.requestReason === 'ALLERGY' ? 'bg-rose-100 text-rose-700' : 'bg-white text-violet-700'}`}>
              {REASON_LABEL[suggestion.requestReason] || suggestion.requestReason}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Món hiện tại</p>
              <p className="mt-1 truncate text-sm font-extrabold text-slate-800">
                {suggestion.originalFoodName || suggestion.originalFoodCode}
              </p>
              <p className="text-[11px] font-semibold text-slate-500">{suggestion.originalGram}g</p>
            </div>
            <ArrowRight className="h-4 w-4 text-violet-400" />
            <div className="min-w-0 rounded-xl border border-violet-200 bg-white px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-violet-400">Món đề nghị</p>
              <p className="mt-1 truncate text-sm font-extrabold text-violet-800">{suggestion.suggestedFoodName}</p>
              <p className="text-[11px] font-semibold text-violet-600">{suggestion.suggestedGram}g</p>
            </div>
          </div>

          {suggestion.customerNote && (
            <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-600">
              <span className="font-bold">Học viên ghi chú:</span> {suggestion.customerNote}
            </p>
          )}

          <textarea
            rows={2}
            value={notes[suggestion.id] || ''}
            onChange={(event) => setNotes((current) => ({ ...current, [suggestion.id]: event.target.value }))}
            placeholder="Ghi chú cho học viên (bắt buộc nếu từ chối)..."
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />

          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={reviewingId === suggestion.id} onClick={() => review(suggestion, 'REJECT')} className="gap-1 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50">
              {reviewingId === suggestion.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Từ chối
            </Button>
            <Button type="button" size="sm" disabled={reviewingId === suggestion.id} onClick={() => review(suggestion, 'APPROVE')} className="gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              {reviewingId === suggestion.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Duyệt thay món
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
