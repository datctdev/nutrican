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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => { fetchTickets(); }, [page, status]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = { page, size: 10 };
      if (status) params.status = status;
      const response = await adminService.getSosTickets(params);
      setTickets(response.data.data.content);
      setTotalPages(response.data.data.totalPages);
    } catch (err) { toast.error('Failed to load SOS tickets'); } 
    finally { setLoading(false); }
  };

  const handleAssign = async (ticketId) => {
    toast.info('PT Assignment feature coming soon', { description: 'This will open a modal to select an available PT.' });
  };

  const getStatusConfig = (s) => {
    switch (s) {
      case 'OPEN': return { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle };
      case 'ASSIGNED': return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock };
      case 'RESOLVED': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileText };
    }
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">SOS Center</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage and assign emergency nutrition requests.</p>
        </div>
        
        {/* Status Filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          {[{val: '', label:'All'}, {val:'OPEN', label:'Open'}, {val:'ASSIGNED', label:'Assigned'}, {val:'RESOLVED', label:'Resolved'}].map(s => (
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
          <h3 className="text-xl font-bold text-slate-800">Clear Skies!</h3>
          <p className="text-slate-500 mt-2 font-medium">No SOS tickets found for the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {tickets.map((ticket) => {
            const config = getStatusConfig(ticket.status);
            const Icon = config.icon;
            
            return (
              <Card key={ticket.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest border ${config.color}`}>
                          <Icon className="w-3.5 h-3.5" /> {ticket.status}
                        </span>
                        <span className="text-xs font-bold text-slate-400">TICKET #{ticket.id?.slice(0, 8)}</span>
                        <span className="text-xs font-medium text-slate-400 flex items-center"><Clock className="w-3 h-3 mr-1"/> {formatDate(ticket.createdAt)}</span>
                      </div>
                      
                      <p className="text-lg font-bold text-slate-800 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        "{ticket.message}"
                      </p>
                      
                      <div className="flex items-center gap-6 text-sm font-semibold text-slate-600">
                        <span className="flex items-center"><User className="w-4 h-4 mr-2 text-slate-400" /> {ticket.userName || 'Unknown User'}</span>
                        {ticket.assignedPtName && (
                          <span className="flex items-center text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full"><ShieldAlert className="w-4 h-4 mr-1.5" /> Assigned to: {ticket.assignedPtName}</span>
                        )}
                        {ticket.dietLogId && (
                          <span className="text-slate-500">Related Log: #{ticket.dietLogId?.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>

                    {ticket.status === 'OPEN' && (
                      <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <Button onClick={() => handleAssign(ticket.id)} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 shadow-sm">
                          Assign Trainer <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-6">
              <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 bg-white shadow-sm">Previous</Button>
              <div className="flex items-center px-4 font-bold text-slate-500">Page {page + 1} of {totalPages}</div>
              <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 bg-white shadow-sm">Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}