import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { workspaceService } from '../../../services/workspaceService';
import { toast } from 'sonner';

/** ISO date (yyyy-mm-dd) in local calendar. */
function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(value) {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 3) {
    return new Date(value[0], value[1] - 1, value[2]);
  }
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Tuần gần nhất đã kết thúc (today >= weekEnd+1), neo từ coachingStartedAt. */
export function lastCompletedWeekStart(coachingStartedAt, today = new Date()) {
  const start = parseLocalDate(coachingStartedAt);
  if (!start) return '';
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let last = null;
  for (let i = 0; i < 520; i++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + i * 7);
    const weekEndPlus1 = new Date(weekStart);
    weekEndPlus1.setDate(weekStart.getDate() + 7);
    if (todayDate.getTime() >= weekEndPlus1.getTime()) {
      last = weekStart;
    } else {
      break;
    }
  }
  return last ? toIsoDate(last) : '';
}

/** Tuần đã kết thúc? today >= weekStart+7 (local date). */
export function isCompletedCoachingWeek(weekStartStr, today = new Date()) {
  const weekStart = parseLocalDate(weekStartStr);
  if (!weekStart) return false;
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEndPlus1 = new Date(weekStart);
  weekEndPlus1.setDate(weekStart.getDate() + 7);
  return todayDate.getTime() >= weekEndPlus1.getTime();
}

/**
 * Tổng kết tuần coaching (start + mỗi 7 ngày).
 * BE: chỉ gửi khi todayVn >= weekEnd+1.
 */
export default function WeeklySummaryForm({ clientId, adherence, defaultWeekStart, coachingStartedAt, onDone }) {
  const computed = defaultWeekStart || lastCompletedWeekStart(coachingStartedAt);
  const [text, setText] = useState('');
  const [nextNote, setNextNote] = useState('');
  const [weekStartStr, setWeekStartStr] = useState(computed);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = defaultWeekStart || lastCompletedWeekStart(coachingStartedAt);
    if (next) setWeekStartStr(next);
  }, [defaultWeekStart, coachingStartedAt]);

  const submit = async () => {
    if (!weekStartStr) {
      toast.error('Vui lòng chọn ngày bắt đầu tuần coaching');
      return;
    }
    if (!isCompletedCoachingWeek(weekStartStr)) {
      toast.error('Tuần này chưa kết thúc — chỉ gửi tổng kết từ ngày sau ngày cuối tuần');
      return;
    }
    if (!text.trim()) {
      toast.error('Vui lòng nhập nhận xét tuần này');
      return;
    }
    setSaving(true);
    try {
      await workspaceService.createWeeklySummary({
        clientId,
        weekStartDate: weekStartStr,
        summaryText: text,
        adherenceRate: adherence != null ? Number(adherence) : undefined,
        nextPlanNote: nextNote,
      });
      toast.success('Đã gửi tổng kết tuần cho học viên');
      setText('');
      setNextNote('');
      onDone?.();
    } catch (e) {
      const msg = e.response?.data?.message;
      toast.error(msg && !/^[A-Z_]+$/.test(msg) ? msg : 'Không gửi được tổng kết. Kiểm tra tuần đã kết thúc chưa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0 space-y-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          Tuần coaching tính từ ngày bắt đầu tập với PT, mỗi chu kỳ 7 ngày.
          Chỉ gửi sau khi tuần đã kết thúc (từ ngày hôm sau của ngày cuối tuần).
        </p>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
            Ngày bắt đầu tuần coaching
          </label>
          <input
            type="date"
            value={weekStartStr}
            onChange={(e) => setWeekStartStr(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            {computed
              ? `Đã gợi ý tuần gần nhất đã kết thúc (${computed}).`
              : 'Chưa có tuần nào kết thúc — chọn biên tuần (ngày bắt đầu + 7×n).'}
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Nhận xét tuần này (bắt buộc)..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none"
        />
        <textarea
          value={nextNote}
          onChange={(e) => setNextNote(e.target.value)}
          rows={2}
          placeholder="Ghi chú thực đơn / kế hoạch tuần tới (tuỳ chọn)..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none"
        />
        <Button
          onClick={submit}
          disabled={saving || !text.trim()}
          className="w-full font-bold h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
        >
          {saving ? 'Đang gửi...' : 'Gửi tổng kết'}
        </Button>
      </CardContent>
    </Card>
  );
}
