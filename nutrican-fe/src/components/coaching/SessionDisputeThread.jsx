import { useMemo, useState } from 'react';
import { AlertCircle, MessageSquare, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

const ROLE_LABEL = {
  CUSTOMER: 'Khách hàng',
  PT: 'Huấn luyện viên',
  ADMIN: 'Admin',
};

const ROLE_BUBBLE = {
  CUSTOMER: 'bg-amber-50 border-amber-100 text-amber-950',
  PT: 'bg-sky-50 border-sky-100 text-sky-950',
  ADMIN: 'bg-slate-100 border-slate-200 text-slate-900',
};

function formatRange(startTime, endTime) {
  if (!startTime) return '—';
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return '—';
  const date = start.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  const from = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (!endTime) return `${date} · ${from}`;
  const end = new Date(endTime);
  const to = Number.isNaN(end.getTime())
    ? ''
    : end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return to ? `${date} · ${from} – ${to}` : `${date} · ${from}`;
}

function money(v) {
  return `${Number(v || 0).toLocaleString('vi-VN')}đ`;
}

/**
 * Shared debate card for session disputes (customer / PT / admin).
 */
export default function SessionDisputeThread({
  dispute,
  viewerRole = 'customer',
  actingId = null,
  onSendMessage,
  resolveSlot = null,
}) {
  const [draft, setDraft] = useState('');
  const pending = dispute?.status === 'PENDING';
  const busy = actingId === dispute?.id;
  const messages = useMemo(() => dispute?.messages || [], [dispute?.messages]);

  if (!dispute) return null;

  const counterpart =
    viewerRole === 'pt'
      ? dispute.customerName || 'Khách hàng'
      : viewerRole === 'admin'
        ? `${dispute.customerName || 'Khách'} ↔ ${dispute.ptName || 'PT'}`
        : dispute.ptName || 'Huấn luyện viên';

  const placeholder =
    viewerRole === 'admin'
      ? 'Gửi ghi chú / câu hỏi cho cả hai bên trước khi quyết định...'
      : viewerRole === 'pt'
        ? 'Phản hồi lý do của khách (admin sẽ thấy)...'
        : 'Bổ sung thêm chi tiết cho admin và PT...';

  return (
    <Card className="border-rose-200 bg-white shadow-sm rounded-3xl overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <p className="text-xs font-black uppercase tracking-wider text-rose-700">
                {pending ? 'Đang tranh chấp' : 'Đã xử lý'}
              </p>
            </div>
            <p className="font-bold text-slate-900">
              Buổi #{dispute.sequence ?? '—'} · {counterpart}
            </p>
            <p className="text-sm text-slate-600">{formatRange(dispute.startTime, dispute.endTime)}</p>
            {(dispute.venueName || dispute.venueAddress) && (
              <p className="text-xs text-slate-500">{dispute.venueName || dispute.venueAddress}</p>
            )}
            {dispute.perSessionAmount != null && (
              <p className="text-xs font-semibold text-slate-700">
                Giá trị buổi: {money(dispute.perSessionAmount)}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-400 whitespace-nowrap">
            {dispute.createdAt ? new Date(dispute.createdAt).toLocaleString('vi-VN') : ''}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-2 max-h-72 overflow-y-auto">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Trao đổi
          </p>
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 italic">{dispute.reason || 'Chưa có nội dung.'}</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border px-3 py-2 text-sm ${ROLE_BUBBLE[m.authorRole] || ROLE_BUBBLE.ADMIN}`}
              >
                <div className="flex justify-between gap-2 text-[11px] font-bold opacity-70 mb-0.5">
                  <span>
                    {ROLE_LABEL[m.authorRole] || m.authorRole}
                    {m.authorName ? ` · ${m.authorName}` : ''}
                  </span>
                  <span>
                    {m.createdAt ? new Date(m.createdAt).toLocaleString('vi-VN') : ''}
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
              </div>
            ))
          )}
        </div>

        {!pending && dispute.adminDecision && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <p className="font-bold">
              Kết quả: {dispute.adminDecision}
              {dispute.ptAmount != null && ` · PT ${money(dispute.ptAmount)}`}
              {dispute.customerAmount != null && ` · Khách ${money(dispute.customerAmount)}`}
            </p>
            {dispute.adminNote && <p className="mt-1 text-xs">{dispute.adminNote}</p>}
          </div>
        )}

        {pending && onSendMessage && (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              disabled={busy}
              placeholder={placeholder}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
            <Button
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              disabled={busy || !draft.trim()}
              onClick={async () => {
                const text = draft.trim();
                if (!text) return;
                await onSendMessage(dispute.id, text);
                setDraft('');
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                {busy ? 'Đang gửi...' : 'Gửi ý kiến'}
              </span>
            </Button>
          </div>
        )}

        {pending && resolveSlot}
      </CardContent>
    </Card>
  );
}
