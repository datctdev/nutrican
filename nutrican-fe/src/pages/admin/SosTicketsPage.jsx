// src/pages/admin/SosTicketsPage.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import { AlertTriangle, Clock, CheckCircle2, ArrowRight, ShieldAlert, FileText, User } from 'lucide-react';

export default function SosTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedPtId, setSelectedPtId] = useState('');

  useEffect(() => { fetchTickets(); }, [page, status]);
  useEffect(() => { fetchPts(); }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = { page, size: 10 };
      if (status) params.status = status;
      const response = await adminService.getSosTickets(params);
      setTickets(response.data.data.content);
      setTotalPages(response.data.data.totalPages);
    } catch (err) { toast.error('Không thể tải danh sách yêu cầu SOS'); }
    finally { setLoading(false); }
  };

  const fetchPts = async () => {
    try {
      const [cert, free] = await Promise.all([
        adminService.getUsers({ role: 'PT_CERTIFIED', size: 50 }),
        adminService.getUsers({ role: 'PT_FREELANCE', size: 50 }),
      ]);
      const all = [
        ...(cert.data.data.content || []),
        ...(free.data.data.content || []),
      ];
      setPts(all);
    } catch (err) {
      console.error('Failed to load PTs', err);
    }
  };

  const handleAssign = async (ticketId) => {
    if (!selectedPtId) return toast.error('Vui lòng chọn một Huấn luyện viên');
    try {
      await adminService.assignSosTicket(ticketId, selectedPtId);
      toast.success('Đã phân công yêu cầu SOS thành công');
      setAssigningId(null);
      setSelectedPtId('');
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phân công yêu cầu thất bại');
    }
  };

  const getStatusConfig = (s) => {
    switch (s) {
      case 'OPEN': return { color: 'bg-red-100 text-red-700 border-red-200', label: 'Đang mở', icon: AlertTriangle };
      case 'ASSIGNED': return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Đã phân công', icon: Clock };
      case 'IN_PROGRESS': return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Đang xử lý', icon: Clock };
      case 'RESOLVED': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Đã giải quyết', icon: CheckCircle2 };
      default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', label: s || 'Nháp', icon: FileText };
    }
  };

  const slaCountdown = (ticket) => {
    const base = ticket.assignedAt || ticket.createdAt;
    if (!base || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return null;
    const deadline = new Date(base);
    deadline.setHours(deadline.getHours() + 24);
    const ms = deadline.getTime() - Date.now();
    if (ms <= 0 || ticket.slaBreached) return { text: 'Quá hạn 24h', breached: true };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return { text: `${h}h ${m}m còn lại`, breached: false };
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('vi-VN') : 'Không có';

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trung tâm SOS</h1>
          <p className="text-slate-500 mt-1 font-medium">Quản lý và điều phối các yêu cầu hỗ trợ dinh dưỡng khẩn cấp.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          {[{val: '', label:'Tất cả'}, {val:'OPEN', label:'Mở'}, {val:'ASSIGNED', label:'Đã giao'}, {val:'SLA_BREACHED', label:'Quá hạn 24h'}, {val:'RESOLVED', label:'Đã giải quyết'}].map(s => (
            <button
              key={s.val}
              onClick={() => { setStatus(s.val); setPage(0); }}
              className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${status === s.val ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl bg-slate-200" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
          <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Tuyệt vời!</h3>
          <p className="text-slate-500 mt-2 font-medium">Không tìm thấy yêu cầu SOS nào trong bộ lọc này.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {tickets.map((ticket) => {
            const config = getStatusConfig(ticket.status);
            const Icon = config.icon;
            const sla = slaCountdown(ticket);

            return (
              <Card key={ticket.id} className={`bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow group ${ticket.slaBreached ? 'ring-2 ring-red-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest border ${config.color}`}>
                          <Icon className="w-3.5 h-3.5" /> {config.label}
                        </span>
                        <span className="text-xs font-bold text-slate-400">YÊU CẦU #{ticket.id?.slice(0, 8)}</span>
                        {ticket.slaBreached && (
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-red-600 text-white">SLA breached</span>
                        )}
                        {sla && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sla.breached ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                            {sla.text}
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-400 flex items-center"><Clock className="w-3 h-3 mr-1"/> {formatDate(ticket.createdAt)}</span>
                      </div>

                      <p className="text-lg font-bold text-slate-800 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        "{ticket.note || 'Không có lời nhắn'}"
                      </p>

                      <div className="flex items-center gap-6 text-sm font-semibold text-slate-600">
                        <span className="flex items-center"><User className="w-4 h-4 mr-2 text-slate-400" /> {ticket.customerName || 'Người dùng ẩn danh'}</span>
                        {ticket.ptName && (
                          <span className="flex items-center text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full"><ShieldAlert className="w-4 h-4 mr-1.5" /> Đã giao cho PT: {ticket.ptName}</span>
                        )}
                        {ticket.dietLogId && (
                          <span className="text-slate-500">Nhật ký liên quan: #{ticket.dietLogId?.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>

                    {(ticket.status === 'OPEN' || (ticket.slaBreached && ['ASSIGNED', 'IN_PROGRESS'].includes(ticket.status))) && (
                      <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[220px]">
                        {assigningId === ticket.id ? (
                          <div className="space-y-2">
                            <select
                              value={selectedPtId}
                              onChange={(e) => setSelectedPtId(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            >
                              <option value="">Chọn PT...</option>
                              {pts.map(pt => (
                                <option key={pt.id} value={pt.id}>{pt.fullName}</option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <Button onClick={() => handleAssign(ticket.id)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-xs">Xác nhận</Button>
                              <Button onClick={() => { setAssigningId(null); setSelectedPtId(''); }} variant="outline" className="rounded-xl h-10 text-xs">Hủy</Button>
                            </div>
                          </div>
                        ) : (
                          <Button onClick={() => setAssigningId(ticket.id)} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 shadow-sm">
                            {ticket.slaBreached ? 'Giao lại PT' : 'Giao Huấn Luyện Viên'} <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-6">
              <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 bg-white shadow-sm">Trang trước</Button>
              <div className="flex items-center px-4 font-bold text-slate-500">Trang {page + 1} / {totalPages}</div>
              <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 bg-white shadow-sm">Trang sau</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
