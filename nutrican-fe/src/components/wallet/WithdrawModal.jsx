import { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { Button } from '../ui/button';
import { coachingPaymentService } from '../../services/coachingPaymentService';
import { formatVnd } from '../../utils/currency';
import { toast } from 'sonner';

const MIN_WITHDRAW = 1000;

const VN_BANKS = [
    'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank', 'MB Bank',
    'ACB', 'VPBank', 'Sacombank', 'TPBank', 'VIB', 'HDBank', 'SHB', 'OCB',
    'MSB', 'SeABank', 'Eximbank', 'LPBank', 'Nam A Bank', 'SCB', 'Bac A Bank',
];

export default function WithdrawModal({ open, onClose, availableBalance = 0, onSuccess }) {
    const [amount, setAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const balance = Number(availableBalance) || 0;
    const amountNumber = Number(amount) || 0;

    const handleAmountChange = (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '');
        setAmount(digitsOnly);
    };

    const handleAccountChange = (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '');
        setBankAccountNumber(digitsOnly);
    };

    const reset = () => {
        setAmount('');
        setBankName('');
        setBankAccountNumber('');
    };

    const close = () => {
        if (submitting) return;
        reset();
        onClose?.();
    };

    const handleSubmit = async () => {
        if (amountNumber < MIN_WITHDRAW) {
            toast.error(`Số tiền rút tối thiểu là ${formatVnd(MIN_WITHDRAW)}`);
            return;
        }
        if (amountNumber > balance) {
            toast.error('Số tiền rút vượt quá số dư khả dụng');
            return;
        }
        if (!bankName.trim()) {
            toast.error('Vui lòng chọn ngân hàng');
            return;
        }
        if (!/^\d{6,20}$/.test(bankAccountNumber)) {
            toast.error('Số tài khoản phải gồm 6-20 chữ số');
            return;
        }
        setSubmitting(true);
        try {
            const res = await coachingPaymentService.withdraw({
                amount: amountNumber,
                bankName: bankName.trim(),
                bankAccountNumber: bankAccountNumber.trim(),
            });
            toast.success(res.data?.message || 'Rút tiền thành công. Thông báo đã gửi qua email.');
            reset();
            onSuccess?.(res.data?.data || null);
            onClose?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rút tiền thất bại, vui lòng thử lại');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
            <div
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Rút tiền từ ví</h2>
                            <p className="text-xs font-semibold text-slate-500">
                                Số dư khả dụng: <span className="text-emerald-600">{formatVnd(balance)}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={close}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Đóng"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Số tiền muốn rút
                </label>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                        onChange={handleAmountChange}
                        placeholder="0"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-10 text-right text-lg font-black text-slate-900 focus:border-emerald-400 focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        đ
                    </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {[100000, 500000, 1000000].map((quick) => (
                        <button
                            key={quick}
                            type="button"
                            disabled={quick > balance}
                            onClick={() => setAmount(String(quick))}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {formatVnd(quick)}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={balance < MIN_WITHDRAW}
                        onClick={() => setAmount(String(Math.floor(balance)))}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Tất cả
                    </button>
                </div>

                <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Ngân hàng
                    </label>
                    <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none"
                    >
                        <option value="">-- Chọn ngân hàng --</option>
                        {VN_BANKS.map((bank) => (
                            <option key={bank} value={bank}>{bank}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-3">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Số tài khoản
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={bankAccountNumber}
                        onChange={handleAccountChange}
                        placeholder="Nhập số tài khoản ngân hàng"
                        maxLength={20}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none"
                    />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                    Sau khi rút, chúng tôi sẽ gửi email thông báo tới bạn.
                </p>

                <div className="mt-5 flex gap-3">
                    <Button
                        onClick={close}
                        disabled={submitting}
                        className="flex-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                        Huỷ
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            submitting
                            || amountNumber < MIN_WITHDRAW
                            || amountNumber > balance
                            || !bankName.trim()
                            || !/^\d{6,20}$/.test(bankAccountNumber)
                        }
                        className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        {submitting ? 'Đang xử lý...' : 'Rút tiền'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
