import React, { useMemo, useState } from 'react';
import { ShoppingCart, X, Check, Copy, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { toast } from 'sonner';

export default function GroceryListModal({ isOpen, onClose, items, weekStart }) {
  const [copied, setCopied] = useState(false);

  // Gom nhóm danh sách thực phẩm theo tên món
  const groceryList = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    const map = new Map();
    items.forEach(item => {
      // Bỏ qua các món rỗng
      if (!item.foodCode && !item.freeText) return;
      
      const key = item.nameVi || item.freeText || item.foodCode;
      const amount = Number(item.portionGrams) || 0;
      
      if (map.has(key)) {
        map.set(key, map.get(key) + amount);
      } else {
        map.set(key, amount);
      }
    });

    const result = Array.from(map.entries()).map(([name, totalGrams]) => ({
      name,
      totalGrams: Math.round(totalGrams)
    }));

    // Sắp xếp giảm dần theo số lượng gram
    return result.sort((a, b) => b.totalGrams - a.totalGrams);
  }, [items]);

  const handleCopy = async () => {
    try {
      let text = `🛒 DANH SÁCH ĐI CHỢ (Tuần ${new Date(weekStart).toLocaleDateString('vi-VN')})\n\n`;
      groceryList.forEach((item, index) => {
        text += `${index + 1}. ${item.name}: ${item.totalGrams}g\n`;
      });
      text += `\n*Lưu ý: Mua dư 10-15% bù hao hụt khi sơ chế.`;
      
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Đã sao chép danh sách đi chợ!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Lỗi khi sao chép');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Danh Sách Đi Chợ</h2>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">Tự động tổng hợp từ thực đơn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {groceryList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Chưa có món ăn nào trong thực đơn tuần này.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex bg-slate-50 p-3 rounded-xl mb-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <div className="flex-1">Nguyên liệu / Món ăn</div>
                <div className="w-24 text-right">Tổng lượng</div>
              </div>
              
              {groceryList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <span className="font-semibold text-slate-700">{item.name}</span>
                  <span className="font-bold text-slate-900 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg">
                    {item.totalGrams} <span className="text-xs opacity-70">g</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <div className="flex items-start gap-2 mb-4 text-xs font-medium text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
             <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
             <p>Danh sách trên được tổng hợp chính xác theo Gram định lượng của thực đơn. Khi đi chợ, khuyên học viên mua dôi ra khoảng 10-15% để bù trừ hao hụt khi sơ chế (bỏ vỏ, xương...).</p>
          </div>
          
          <Button 
            onClick={handleCopy} 
            disabled={groceryList.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 font-bold flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Đã sao chép' : 'Sao chép để gửi Zalo / Tin nhắn'}
          </Button>
        </div>
      </div>
    </div>
  );
}
