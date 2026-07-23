import { useState } from 'react';
import { AlertCircle, Check, Clock, MapPin, X } from 'lucide-react';
import { Button } from '../ui/button';
import Modal from '../common/Modal';

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

/**
 * Customer panel: confirm or dispute sessions in AWAITING_CONFIRM.
 */
export default function SessionConfirmPanel({
  sessions = [],
  getCounterpartName,
  actingId = null,
  onConfirm,
  onDispute,
}) {
  const pending = (sessions || []).filter((s) => s.status === 'AWAITING_CONFIRM');
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [reason, setReason] = useState('');

  if (pending.length === 0) return null;

  const submitting = Boolean(actingId);

  return (
    <>
      <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-950">
              Có {pending.length} buổi đang chờ bạn xác nhận
            </h3>
            <p className="mt-0.5 text-xs font-medium text-amber-800/80">
              PT đã đánh dấu dạy xong — Đồng ý để giải ngân, hoặc Không đồng ý nếu buổi chưa đúng.
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {pending.map((session) => {
            const id = session.id;
            const busy = actingId === id;
            const ptName = typeof getCounterpartName === 'function'
              ? getCounterpartName(session)
              : session.counterpartName || 'Huấn luyện viên';

            return (
              <li
                key={id}
                className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-bold text-slate-900 truncate">
                      Buổi #{session.sequence ?? '—'} · {ptName}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {formatRange(session.startTime, session.endTime)}
                    </p>
                    {(session.venueName || session.venueAddress) && (
                      <p className="flex items-start gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span>{session.venueName || session.venueAddress}</span>
                      </p>
                    )}
                    {session.confirmDeadlineAt && (
                      <p className="text-xs font-semibold text-amber-700">
                        Tự động xác nhận trước:{' '}
                        {new Date(session.confirmDeadlineAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                    <Button
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      disabled={submitting}
                      onClick={() => onConfirm?.(id, session)}
                    >
                      {busy ? (
                        'Đang xác nhận...'
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="h-4 w-4" /> Đồng ý
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-amber-200 text-amber-900 hover:bg-amber-50 font-bold"
                      disabled={submitting}
                      onClick={() => {
                        setReason('');
                        setDisputeTarget(session);
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <X className="h-4 w-4" /> Không đồng ý
                      </span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Modal
        isOpen={Boolean(disputeTarget)}
        onClose={() => {
          if (submitting) return;
          setDisputeTarget(null);
          setReason('');
        }}
        title="Không đồng ý buổi tập"
        size="sm"
      >
        {disputeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Buổi #{disputeTarget.sequence ?? '—'} ·{' '}
              {formatRange(disputeTarget.startTime, disputeTarget.endTime)}.
              Nhập lý do để gửi khiếu nại.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ví dụ: PT không đến đúng giờ / buổi chưa diễn ra..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"
              disabled={submitting}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={submitting}
                onClick={() => {
                  setDisputeTarget(null);
                  setReason('');
                }}
              >
                Hủy
              </Button>
              <Button
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                disabled={submitting || !reason.trim()}
                onClick={async () => {
                  const sid = disputeTarget.id;
                  const text = reason.trim();
                  await onDispute?.(sid, text, disputeTarget);
                  setDisputeTarget(null);
                  setReason('');
                }}
              >
                {actingId === disputeTarget.id ? 'Đang gửi...' : 'Gửi khiếu nại'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
