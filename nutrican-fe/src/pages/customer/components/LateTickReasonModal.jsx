import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';

export default function LateTickReasonModal({
    open,
    title = 'Ghi lý do tick trễ',
    description = 'Buổi này đã qua. Hãy ghi lý do để PT hiểu bối cảnh.',
    loading = false,
    onClose,
    onSubmit,
}) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!open) {
            setReason('');
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
                <textarea
                    autoFocus
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ví dụ: Em vừa ăn xong nhưng bận chăm con nên ghi nhận trễ."
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
                <p className="mt-1 text-[11px] text-slate-400">Tối thiểu 10 ký tự.</p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        disabled={loading || reason.trim().length < 10}
                        onClick={() => onSubmit?.(reason.trim())}
                        className="rounded-xl"
                    >
                        {loading ? 'Đang lưu...' : 'Xác nhận'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
