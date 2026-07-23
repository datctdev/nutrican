// src/pages/customer/components/AllergySelector.jsx
import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Check } from 'lucide-react';

const STANDARD_ALLERGENS = [
    'Đậu phộng (Lạc)',
    'Hải sản / Tôm cua',
    'Sữa bò / Lactose',
    'Trứng',
    'Gluten / Lúa mì',
    'Đậu nành',
    'Cá biển',
    'Các loại hạt cây',
];

export default function AllergySelector({ value = '', onChange }) {
    const [selectedPills, setSelectedPills] = useState([]);
    const [customNote, setCustomNote] = useState('');
    const isInternalChange = useRef(false);

    // Đồng bộ từ chuỗi Database (value) vào Checklist khi tải trang
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }

        if (!value) {
            setSelectedPills([]);
            setCustomNote('');
            return;
        }

        // Tách chuỗi thành mảng các từ khóa
        const tokens = value.split(',').map((s) => s.trim()).filter(Boolean);
        const pills = [];
        const customs = [];

        tokens.forEach((token) => {
            // Đối chiếu từ khóa (Tự động nâng cấp cả từ khóa cũ như "đậu phộng" thành chuẩn "Đậu phộng (Lạc)")
            const matched = STANDARD_ALLERGENS.find(
                (std) => std.toLowerCase() === token.toLowerCase() || std.toLowerCase().includes(token.toLowerCase())
            );
            if (matched && !pills.includes(matched)) {
                pills.push(matched);
            } else {
                customs.push(token);
            }
        });

        setSelectedPills(pills);
        setCustomNote(customs.join(', '));
    }, [value]);

    // Cập nhật và gửi chuỗi gộp xuống Parent Component
    const updateAndNotify = (newPills, newCustom) => {
        isInternalChange.current = true;
        const combined = [
            ...newPills,
            newCustom ? newCustom.trim() : ''
        ].filter(Boolean).join(', ');

        if (onChange) onChange(combined);
    };

    const togglePill = (pill) => {
        let nextPills;
        if (selectedPills.includes(pill)) {
            nextPills = selectedPills.filter((p) => p !== pill);
        } else {
            nextPills = [...selectedPills, pill];
        }
        setSelectedPills(nextPills);
        updateAndNotify(nextPills, customNote);
    };

    const handleCustomChange = (e) => {
        const val = e.target.value;
        setCustomNote(val);
        updateAndNotify(selectedPills, val);
    };

    return (
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-rose-500" /> Chọn nhanh thực phẩm dễ dị ứng:
        </span>
                {selectedPills.length > 0 && (
                    <span className="text-[10px] font-extrabold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
            Đã chọn {selectedPills.length}
          </span>
                )}
            </div>

            {/* Checklist Pills */}
            <div className="flex flex-wrap gap-2 pt-0.5">
                {STANDARD_ALLERGENS.map((item) => {
                    const isSelected = selectedPills.includes(item);
                    return (
                        <button
                            key={item}
                            type="button"
                            onClick={() => togglePill(item)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
                                isSelected
                                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-[1.02] border border-rose-600'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-2xs'
                            }`}
                        >
                            <span>{item}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[3]" />}
                        </button>
                    );
                })}
            </div>

            {/* Custom Input */}
            <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">
                    Dị ứng khác (Tự nhập bổ sung nếu không có trong danh sách trên):
                </label>
                <input
                    type="text"
                    value={customNote}
                    onChange={handleCustomChange}
                    placeholder="Ví dụ: Dâu tây, mật ong, hạt điều, thịt bò..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
            </div>

            <p className="text-[11px] text-slate-400 font-medium italic">
                💡 Hệ thống AI Scanner và Huấn luyện viên (PT) sẽ tự động ghi nhận danh sách này để loại trừ món ăn nguy hiểm khỏi thực đơn của bạn.
            </p>
        </div>
    );
}