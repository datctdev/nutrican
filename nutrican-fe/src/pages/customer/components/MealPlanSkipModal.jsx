import Modal from '../../../components/common/Modal';
import { Button } from '../../../components/ui/button';
import { useState } from 'react';

const SKIP_REASONS = [
  { value: 'NO_TIME', label: 'Không có thời gian' },
  { value: 'DONT_LIKE', label: 'Không thích món' },
  { value: 'ALLERGY', label: 'Dị ứng / không hợp' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export default function MealPlanSkipModal({ open, item, mealItemCount = 1, initialScope = 'ITEM', onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('NO_TIME');
  const [note, setNote] = useState('');
  const [scope, setScope] = useState(initialScope);

  const handleConfirm = () => {
    onConfirm({
      skipReason: reason,
      skipNote: note.trim() || undefined,
      scope,
    });
  };

  const handleClose = () => {
    setReason('NO_TIME');
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Xác nhận không ăn" size="sm">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bạn đang chọn</p>
          <p className="mt-0.5 text-sm font-extrabold text-slate-800">{item?.freeText || item?.foodCode}</p>
        </div>
        {mealItemCount > 1 && (
          <div>
            <p className="mb-2 text-xs font-extrabold text-slate-700">Phạm vi áp dụng</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setScope('ITEM')} className={`rounded-xl border px-3 py-2 text-xs font-bold ${scope === 'ITEM' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>
                Món này
              </button>
              <button type="button" onClick={() => setScope('MEAL')} className={`rounded-xl border px-3 py-2 text-xs font-bold ${scope === 'MEAL' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>
                Cả bữa ({mealItemCount} món)
              </button>
            </div>
          </div>
        )}
        <p className="text-sm text-slate-600">Chọn lý do để PT điều chỉnh thực đơn phù hợp hơn.</p>
        <div className="space-y-2">
          {SKIP_REASONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="skipReason"
                value={opt.value}
                checked={reason === opt.value}
                onChange={() => setReason(opt.value)}
                className="text-primary"
              />
              <span className="text-sm font-medium text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>
        {(reason === 'OTHER' || reason === 'ALLERGY') && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={reason === 'ALLERGY' ? 'Mô tả thành phần hoặc phản ứng cần lưu ý...' : 'Nhập lý do...'}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        )}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleConfirm} disabled={saving || (reason === 'OTHER' && !note.trim())}>
            {saving ? 'Đang lưu...' : scope === 'MEAL' ? 'Xác nhận không ăn cả bữa' : 'Xác nhận không ăn món'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
