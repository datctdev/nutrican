import { Button } from '../ui/button';

/** Styled confirm dialog — replaces window.confirm for demos / product UI. */
export default function ConfirmModal({
    open,
    title = 'Xác nhận',
    description,
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
    loading = false,
    danger = false,
    onClose,
    onConfirm,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
            <div
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-modal-title"
            >
                <h3 id="confirm-modal-title" className="text-lg font-extrabold text-slate-900">
                    {title}
                </h3>
                {description && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={onClose}
                        className="rounded-xl"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        disabled={loading}
                        onClick={() => onConfirm?.()}
                        className={`rounded-xl ${
                            danger
                                ? 'bg-rose-600 text-white hover:bg-rose-700'
                                : ''
                        }`}
                    >
                        {loading ? 'Đang xử lý...' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
