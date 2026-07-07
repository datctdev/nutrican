import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import { dietService } from '../../../services/dietService';

export default function PostMealRatingSheet({ logId, open, onClose }) {
  const [energy, setEnergy] = useState(3);
  const [hunger, setHunger] = useState(3);
  const [digestion, setDigestion] = useState('OK');
  const [saving, setSaving] = useState(false);

  if (!open || !logId) return null;

  const submit = async () => {
    setSaving(true);
    try {
      await dietService.saveFeedback(logId, { energyRating: energy, hungerAfterRating: hunger, digestionStatus: digestion });
      toast.success('Cảm ơn phản hồi!');
      onClose?.();
    } catch {
      toast.error('Không gửi được phản hồi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-slate-900">Bạn cảm thấy thế nào sau bữa ăn?</h3>
        <label className="block text-sm">Năng lượng: {energy}
          <input type="range" min="1" max="5" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-full" />
        </label>
        <label className="block text-sm">No/đói: {hunger}
          <input type="range" min="1" max="5" value={hunger} onChange={(e) => setHunger(Number(e.target.value))} className="w-full" />
        </label>
        <div className="flex gap-2">
          {['OK', 'BAD', 'NOTE'].map((d) => (
            <button key={d} type="button" onClick={() => setDigestion(d)}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${digestion === d ? 'bg-primary text-white' : 'bg-slate-50'}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Bỏ qua</Button>
          <Button onClick={submit} disabled={saving} className="flex-1">Gửi</Button>
        </div>
      </div>
    </div>
  );
}
