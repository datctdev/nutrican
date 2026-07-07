// src/pages/pt/components/ChatMessageContextCard.jsx
import { FileText, Utensils, Calendar } from 'lucide-react';

const TYPE_CONFIG = {
  DIET_LOG: { label: 'Nhật ký bữa ăn', icon: Utensils, path: '/pt/reviews' },
  MEAL_PLAN: { label: 'Thực đơn', icon: FileText, path: '/pt/clients' },
  APPOINTMENT: { label: 'Lịch hẹn', icon: Calendar, path: '/pt/appointments' },
};

export default function ChatMessageContextCard({ contextType, contextRefId, onNavigate }) {
  if (!contextType || !contextRefId) return null;
  const config = TYPE_CONFIG[contextType] || { label: contextType, icon: FileText, path: '/pt/reviews' };
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(config.path, contextRefId)}
      className="mb-2 w-full text-left rounded-xl border border-slate-200 bg-white/90 px-3 py-2 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span>{config.label}</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5 truncate">#{String(contextRefId).slice(0, 8)}… — Nhấn để xem</p>
    </button>
  );
}
