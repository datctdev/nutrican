import { useState } from 'react';
import { CalendarDays, Check, Loader2, Utensils, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { workspaceService } from '../../../services/workspaceService';

const MEAL_LABEL = {
  BREAKFAST: 'Buổi sáng',
  LUNCH: 'Buổi trưa',
  DINNER: 'Buổi tối',
  SNACK: 'Buổi chiều / khuya',
};

export default function SelfPlanSubmissionReviewList({ submissions, onUpdated }) {
  const [notes, setNotes] = useState({});
  const [reviewingId, setReviewingId] = useState(null);

  const review = async (submission, action) => {
    const ptNote = notes[submission.id]?.trim();
    if (action === 'REJECT' && !ptNote) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setReviewingId(submission.id);
    try {
      await workspaceService.reviewSelfPlanSubmission(submission.id, { action, ptNote });
      toast.success(action === 'APPROVE' ? 'Đã duyệt — override thực đơn theo bữa đã setup' : 'Đã từ chối yêu cầu');
      setNotes((current) => ({ ...current, [submission.id]: '' }));
      await onUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xử lý yêu cầu');
    } finally {
      setReviewingId(null);
    }
  };

  if (!submissions?.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800">Kế hoạch ngày đặc biệt chờ duyệt</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Duyệt sẽ thay thực đơn PT đúng các bữa học viên đã thêm. Từ chối giữ nguyên thực đơn gốc.
        </p>
      </div>

      {submissions.map((submission) => (
        <div key={submission.id} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {submission.planDate}
            </span>
            <span className="ml-auto rounded-full bg-white px-2 py-1 font-extrabold text-amber-700">
              {submission.status}
            </span>
          </div>

          <ul className="mt-3 space-y-1.5">
            {(submission.items || []).map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <Utensils className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1 truncate font-extrabold text-slate-800">{item.itemName}</span>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {MEAL_LABEL[item.mealType] || item.mealType}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">{item.quantityG}g</span>
              </li>
            ))}
          </ul>

          <textarea
            rows={2}
            value={notes[submission.id] || ''}
            onChange={(event) => setNotes((current) => ({ ...current, [submission.id]: event.target.value }))}
            placeholder="Ghi chú cho học viên (bắt buộc nếu từ chối)..."
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />

          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={reviewingId === submission.id}
              onClick={() => review(submission, 'REJECT')}
              className="gap-1 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              {reviewingId === submission.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Từ chối
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={reviewingId === submission.id}
              onClick={() => review(submission, 'APPROVE')}
              className="gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {reviewingId === submission.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Duyệt override
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
