import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import SessionDisputeThread from '../../components/coaching/SessionDisputeThread';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

const TYPE_LABEL = {
  PAYMENT: 'Thanh toán',
  HOLD: 'Giữ escrow',
  RELEASE: 'Chi PT',
  COMMISSION: 'Hoa hồng',
  REFUND: 'Hoàn khách',
  WITHDRAWAL: 'Rút tiền',
};

const REFUND_STATUS = {
  PENDING_REVIEW: 'Chờ duyệt',
  AUTO_APPROVED: 'Tự động duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const PT_REPORT_STATUS_LABEL = {
  PENDING: 'Chờ xử lý',
  REVIEWED: 'Đã xử lý',
  DISMISSED: 'Đã đóng',
};

const adminReportOutcomeLabel = (r) => {
  if (r.status === 'PENDING') return 'Chờ xử lý';
  if (r.status === 'DISMISSED' && r.falseReport) return 'Đã đóng — báo cáo giả';
  if (r.status === 'DISMISSED') return 'Đã đóng — không vi phạm';
  if (r.status === 'REVIEWED' && r.ptSuspended) {
    if (r.ptCurrentlySuspended === false) return 'Đã xử lý — PT đã được mở khóa';
    if (r.suspendUntil) {
      return `Đã xử lý — PT khóa đến ${new Date(r.suspendUntil).toLocaleString('vi-VN')}`;
    }
    return 'Đã xử lý — PT bị khóa (vô thời hạn)';
  }
  if (r.status === 'REVIEWED') return 'Đã tiếp nhận / xử lý';
  return r.status;
};

const VALID_TABS = new Set(['overview', 'refunds', 'disputes', 'pt-reports']);

const TABS = [
  { id: 'overview', label: 'Tổng quan & sổ cái' },
  { id: 'refunds', label: 'Hoàn tiền' },
  { id: 'disputes', label: 'Tranh chấp buổi' },
  { id: 'pt-reports', label: 'Báo cáo PT' },
];

export default function AdminFinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [tab, setTab] = useState(() => (VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'overview'));
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [ptReports, setPtReports] = useState([]);
  const [ptReportStatus, setPtReportStatus] = useState('PENDING');
  const [pendingPtReports, setPendingPtReports] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [splitForm, setSplitForm] = useState({});
  const [reportNotes, setReportNotes] = useState({});
  const [suspendPtById, setSuspendPtById] = useState({});
  const [suspendDaysById, setSuspendDaysById] = useState({});
  const [falseReportById, setFalseReportById] = useState({});
  const [suspendReporterById, setSuspendReporterById] = useState({});

  useEffect(() => {
    if (VALID_TABS.has(tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const selectTab = (id) => {
    setTab(id);
    const next = new URLSearchParams(searchParams);
    if (id === 'overview') next.delete('tab');
    else next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  const loadOverview = async () => {
    const [ov, tx] = await Promise.all([
      adminService.getFinanceOverview(),
      adminService.getFinanceTransactions({ page: 0, size: 30, ...(typeFilter ? { type: typeFilter } : {}) }),
    ]);
    setOverview(ov.data?.data || null);
    setTransactions(tx.data?.data?.content || tx.data?.data?.items || []);
  };

  const loadRefunds = async () => {
    const res = await adminService.getRefunds();
    setRefunds(res.data?.data || []);
  };

  const loadDisputes = async () => {
    const res = await adminService.getSessionDisputes({ status: 'PENDING' });
    setDisputes(res.data?.data || []);
  };

  const loadPendingPtReportCount = async () => {
    try {
      const res = await adminService.getPtReports({ status: 'PENDING' });
      setPendingPtReports((res.data?.data || []).length);
    } catch {
      /* keep previous count */
    }
  };

  const loadPtReports = async () => {
    const params = ptReportStatus === 'ALL' ? {} : { status: ptReportStatus };
    const res = await adminService.getPtReports(params);
    setPtReports(res.data?.data || []);
  };

  const load = async () => {
    setLoading(true);
    try {
      await loadPendingPtReportCount();
      if (tab === 'overview') await loadOverview();
      else if (tab === 'refunds') await loadRefunds();
      else if (tab === 'disputes') await loadDisputes();
      else await loadPtReports();
    } catch {
      toast.error('Không tải được dữ liệu dòng tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, typeFilter, ptReportStatus]);

  useEffect(() => {
    const refresh = () => {
      loadPendingPtReportCount().catch(() => {});
      if (tab === 'refunds') loadRefunds().catch(() => {});
      if (tab === 'disputes') loadDisputes().catch(() => {});
      if (tab === 'pt-reports') loadPtReports().catch(() => {});
      if (tab === 'overview') loadOverview().catch(() => {});
    };
    window.addEventListener('refund_update', refresh);
    window.addEventListener('session_confirm_updated', refresh);
    return () => {
      window.removeEventListener('refund_update', refresh);
      window.removeEventListener('session_confirm_updated', refresh);
    };
  }, [tab, typeFilter, ptReportStatus]);

  const reviewRefund = async (id, action) => {
    setActing(id + action);
    try {
      await adminService.reviewRefund(id, {
        action,
        adminNote: action === 'APPROVE' ? 'Approved by admin' : 'Rejected',
      });
      toast.success(action === 'APPROVE' ? 'Đã duyệt hoàn tiền' : 'Đã từ chối');
      await loadRefunds();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActing(null);
    }
  };

  const resolveDispute = async (id, decision) => {
    setActing(id + decision);
    try {
      const form = splitForm[id] || {};
      const body = {
        decision,
        adminNote: (form.adminNote || '').trim() || undefined,
      };
      if (decision === 'SPLIT') {
        body.ptAmount = Number(form.ptAmount || 0);
        body.customerAmount = Number(form.customerAmount || 0);
      }
      await adminService.resolveSessionDispute(id, body);
      toast.success('Đã xử lý tranh chấp');
      await loadDisputes();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActing(null);
    }
  };

  const replyDispute = async (id, body) => {
    setActing(id);
    try {
      await adminService.replySessionDispute(id, { body });
      toast.success('Đã gửi ghi chú');
      await loadDisputes();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gửi ghi chú thất bại');
    } finally {
      setActing(null);
    }
  };

  const resolvePtReport = async (id, status) => {
    const suspendPt = status === 'REVIEWED' && Boolean(suspendPtById[id]);
    const falseReport = status === 'DISMISSED' && Boolean(falseReportById[id]);
    const suspendReporter = falseReport && Boolean(suspendReporterById[id]);
    const note = (reportNotes[id] || '').trim();
    if (suspendPt && note.length < 10) {
      toast.error('Khi khóa PT cần ghi chú ít nhất 10 ký tự');
      return;
    }
    const daysRaw = suspendDaysById[id];
    const suspendDays = suspendPt && daysRaw ? Number(daysRaw) : null;
    setActing(id + status);
    try {
      await adminService.resolvePtReport(id, {
        status,
        adminNote: note || (status === 'REVIEWED' ? 'Đã tiếp nhận' : 'Đóng báo cáo'),
        suspendPt,
        suspendDays: suspendDays || undefined,
        falseReport,
        suspendReporter,
        suspendReporterDays: suspendReporter ? 7 : undefined,
      });
      toast.success(
        status === 'DISMISSED'
          ? (falseReport ? 'Đã đóng — đánh dấu báo cáo giả' : 'Đã đóng báo cáo')
          : suspendPt
            ? 'Đã khóa PT, hủy buổi chưa dạy và hoàn escrow'
            : 'Đã tiếp nhận báo cáo',
      );
      setSuspendPtById((s) => ({ ...s, [id]: false }));
      setFalseReportById((s) => ({ ...s, [id]: false }));
      setSuspendReporterById((s) => ({ ...s, [id]: false }));
      await Promise.all([loadPtReports(), loadPendingPtReportCount()]);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActing(null);
    }
  };

  const unsuspendPt = async (ptId) => {
    if (!ptId) return;
    setActing(`unsuspend-${ptId}`);
    try {
      await adminService.unsuspendPt(ptId);
      toast.success('Đã mở khóa tài khoản PT');
      await loadPtReports();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Mở khóa thất bại');
    } finally {
      setActing(null);
    }
  };

  const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;
  const pendingDisputes = overview?.pendingSessionDisputeCount ?? 0;

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tài chính & tranh chấp</h1>
          <p className="text-sm text-slate-500">Escrow, hoàn tiền, tranh chấp buổi offline và báo cáo PT</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl">
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
            {t.id === 'disputes' && pendingDisputes > 0 && tab !== 'disputes' && (
              <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                {pendingDisputes}
              </span>
            )}
            {t.id === 'pt-reports' && pendingPtReports > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                {pendingPtReports}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : tab === 'overview' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-amber-200 bg-amber-50/60"><CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Escrow đang giữ</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{money(overview?.escrowLockedBalance)}</p>
              <p className="text-xs text-slate-500 mt-1">{overview?.heldEscrowCount || 0} escrow active</p>
            </CardContent></Card>
            <Card className="border-emerald-200 bg-emerald-50/60"><CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Ví Platform</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{money(overview?.platformAvailableBalance)}</p>
              <p className="text-xs text-slate-500 mt-1">Hoa hồng kỳ: {money(overview?.totalCommission)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Hoàn tiền</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{money(overview?.totalRefunds)}</p>
            </CardContent></Card>
            <Card className="border-rose-200 bg-rose-50/50"><CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Tranh chấp buổi</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{pendingDisputes}</p>
              <p className="text-xs text-slate-500 mt-1">
                Escrow hoàn tiền (khác): {overview?.disputedEscrowCount || 0}
              </p>
            </CardContent></Card>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Tất cả loại</option>
              {Object.keys(TYPE_LABEL).map((k) => (
                <option key={k} value={k}>{TYPE_LABEL[k]}</option>
              ))}
            </select>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Chưa có giao dịch</td></tr>
                  ) : transactions.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 whitespace-nowrap">{t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : '—'}</td>
                      <td className="px-4 py-3 font-semibold">{TYPE_LABEL[t.type] || t.type}</td>
                      <td className="px-4 py-3 font-bold">{money(t.amount)}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-md truncate">{t.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : tab === 'refunds' ? (
        refunds.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-500">Không có yêu cầu hoàn tiền.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {refunds.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.reason} — {REFUND_STATUS[r.status] || r.status}</p>
                    <p className="text-sm text-slate-500">{r.note || '—'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : r.createdAt}
                    </p>
                  </div>
                  {r.status === 'PENDING_REVIEW' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewRefund(r.id, 'APPROVE')} disabled={!!acting}>Duyệt</Button>
                      <Button size="sm" variant="outline" onClick={() => reviewRefund(r.id, 'REJECT')} disabled={!!acting}>Từ chối</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'disputes' ? (
        disputes.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-400">Không có tranh chấp chờ xử lý</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <SessionDisputeThread
                key={d.id}
                dispute={d}
                viewerRole="admin"
                actingId={acting === d.id ? d.id : null}
                onSendMessage={replyDispute}
                resolveSlot={(
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Quyết định giải ngân · giá trị buổi {money(d.perSessionAmount)}
                    </p>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú quyết định (hiển thị cho PT & khách)..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                      value={splitForm[d.id]?.adminNote || ''}
                      onChange={(e) => setSplitForm((s) => ({
                        ...s,
                        [d.id]: { ...s[d.id], adminNote: e.target.value },
                      }))}
                    />
                    <div className="flex flex-wrap gap-2 items-end">
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white"
                        disabled={!!acting}
                        onClick={() => resolveDispute(d.id, 'TO_PT')}
                      >
                        Về PT (đủ buổi)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!acting}
                        onClick={() => resolveDispute(d.id, 'TO_CUSTOMER')}
                      >
                        Về khách (hoàn đủ)
                      </Button>
                      <div className="flex flex-wrap items-end gap-2 border-l border-slate-200 pl-3">
                        <input
                          placeholder="PT nhận"
                          className="w-28 rounded-lg border px-2 py-1.5 text-sm"
                          value={splitForm[d.id]?.ptAmount || ''}
                          onChange={(e) => setSplitForm((s) => ({
                            ...s,
                            [d.id]: { ...s[d.id], ptAmount: e.target.value },
                          }))}
                        />
                        <input
                          placeholder="Khách nhận"
                          className="w-28 rounded-lg border px-2 py-1.5 text-sm"
                          value={splitForm[d.id]?.customerAmount || ''}
                          onChange={(e) => setSplitForm((s) => ({
                            ...s,
                            [d.id]: { ...s[d.id], customerAmount: e.target.value },
                          }))}
                        />
                        <Button
                          size="sm"
                          className="bg-slate-900 text-white"
                          disabled={!!acting}
                          onClick={() => resolveDispute(d.id, 'SPLIT')}
                        >
                          Chia
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={ptReportStatus}
              onChange={(e) => setPtReportStatus(e.target.value)}
            >
              <option value="PENDING">Chờ xử lý</option>
              <option value="REVIEWED">Đã tiếp nhận</option>
              <option value="DISMISSED">Đã đóng</option>
              <option value="ALL">Tất cả</option>
            </select>
          </div>
          {ptReports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-400">
                {ptReportStatus === 'PENDING' || ptReportStatus === 'ALL'
                  ? 'Không có báo cáo PT'
                  : `Không có báo cáo ${PT_REPORT_STATUS_LABEL[ptReportStatus] || ''}`}
              </CardContent>
            </Card>
          ) : (
            ptReports.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase text-rose-700">
                        Báo cáo PT
                        <span className="ml-2 font-semibold normal-case text-slate-500">
                          · {adminReportOutcomeLabel(r)}
                        </span>
                      </p>
                      <p className="font-semibold text-slate-900 mt-1">
                        {r.customerName || 'HV'} → {r.ptName || 'PT'}
                      </p>
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{r.reason}</p>
                      {Array.isArray(r.evidenceUrls) && r.evidenceUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {r.evidenceUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={url}
                                alt="Bằng chứng"
                                className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      {r.adminNote && (
                        <p className="text-xs text-slate-500 mt-2">Ghi chú admin: {r.adminNote}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 whitespace-nowrap">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : ''}
                    </p>
                  </div>
                  {r.status === 'PENDING' && (
                    <>
                      <input
                        placeholder="Ghi chú admin (bắt buộc nếu khóa PT, tối đa 1000 ký tự)"
                        maxLength={1000}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={reportNotes[r.id] || ''}
                        onChange={(e) => setReportNotes((s) => ({ ...s, [r.id]: e.target.value }))}
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(suspendPtById[r.id])}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setSuspendPtById((s) => ({ ...s, [r.id]: on }));
                            if (on) {
                              setFalseReportById((s) => ({ ...s, [r.id]: false }));
                              setSuspendReporterById((s) => ({ ...s, [r.id]: false }));
                            }
                          }}
                        />
                        Khóa tài khoản PT khi xử lý
                      </label>
                      {suspendPtById[r.id] && (
                        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
                          <p className="font-semibold">
                            Khóa sẽ hủy buổi chưa dạy + hoàn escrow còn lại + đóng hire đang chờ.
                          </p>
                          <label className="flex flex-wrap items-center gap-2">
                            Thời hạn khóa
                            <select
                              className="rounded-lg border px-2 py-1 text-sm bg-white"
                              value={suspendDaysById[r.id] ?? ''}
                              onChange={(e) => setSuspendDaysById((s) => ({
                                ...s,
                                [r.id]: e.target.value,
                              }))}
                            >
                              <option value="">Vô thời hạn</option>
                              <option value="7">7 ngày</option>
                              <option value="14">14 ngày</option>
                              <option value="30">30 ngày</option>
                            </select>
                          </label>
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(falseReportById[r.id])}
                          disabled={Boolean(suspendPtById[r.id])}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setFalseReportById((s) => ({ ...s, [r.id]: on }));
                            if (!on) setSuspendReporterById((s) => ({ ...s, [r.id]: false }));
                          }}
                        />
                        Đánh dấu báo cáo giả (khi đóng)
                      </label>
                      {falseReportById[r.id] && (
                        <label className="flex items-center gap-2 text-sm text-slate-700 pl-1">
                          <input
                            type="checkbox"
                            checked={Boolean(suspendReporterById[r.id])}
                            onChange={(e) => setSuspendReporterById((s) => ({
                              ...s,
                              [r.id]: e.target.checked,
                            }))}
                          />
                          Khóa tài khoản HV (chỉ chặn đăng nhập, 7 ngày)
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="bg-emerald-600 text-white" disabled={!!acting} onClick={() => resolvePtReport(r.id, 'REVIEWED')}>
                          {suspendPtById[r.id] ? 'Xử lý & khóa PT' : 'Tiếp nhận / xử lý'}
                        </Button>
                        <Button size="sm" variant="outline" disabled={!!acting} onClick={() => resolvePtReport(r.id, 'DISMISSED')}>
                          {falseReportById[r.id] ? 'Đóng — báo cáo giả' : 'Đóng (không vi phạm)'}
                        </Button>
                      </div>
                    </>
                  )}
                  {r.status === 'REVIEWED' && r.ptSuspended && r.ptCurrentlySuspended && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-800"
                      disabled={!!acting}
                      onClick={() => unsuspendPt(r.ptId)}
                    >
                      Mở khóa PT
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
