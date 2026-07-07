import Modal from '../../../components/common/Modal';
import { Button } from '../../../components/ui/button';
import { useState } from 'react';

const SKIP_REASONS = [
  { value: 'NO_TIME', label: 'Không có thời gian' },
  { value: 'DONT_LIKE', label: 'Không thích món' },
  { value: 'ALLERGY', label: 'Dị ứng / không hợp' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export default function MealPlanSkipModal({ open, onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('NO_TIME');
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm({
      skipReason: reason,
      skipNote: reason === 'OTHER' ? note.trim() || undefined : undefined,
    });
  };

  const handleClose = () => {
    setReason('NO_TIME');
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Bỏ qua món trong thực đơn" size="sm">
      <div className="space-y-4">
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
        {reason === 'OTHER' && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ghi chú thêm (tùy chọn)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        )}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Xác nhận bỏ qua'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
