import { useState, useEffect } from 'react';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import { AlertTriangle, Clock, CheckCircle, ArrowRight } from 'lucide-react';

export default function SosTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [page, status]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = { page, size: 10 };
      if (status) params.status = status;

      const response = await adminService.getSosTickets(params);
      setTickets(response.data.data.content);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error('Error fetching SOS tickets:', err);
      toast.error('Failed to load SOS tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (ticketId) => {
    // For now, just show a toast - in production, you'd have a modal to select PT
    toast.info('PT assignment feature coming soon');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Open</Badge>;
      case 'ASSIGNED':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Assigned</Badge>;
      case 'RESOLVED':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading && tickets.length === 0) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">SOS Tickets</h1>
        
        {/* Filter */}
        <div className="flex gap-2">
          {['', 'OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED'].map((s) => (
            <Button
              key={s || 'all'}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatus(s); setPage(0); }}
            >
              {s || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {tickets.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No SOS tickets</h3>
          <p className="text-gray-500 mt-1">All tickets have been resolved</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(ticket.status)}
                    <span className="text-sm text-gray-500">
                      #{ticket.id?.slice(0, 8)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900">
                    {ticket.userName || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{ticket.message}</p>

                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>Created: {formatDate(ticket.createdAt)}</span>
                    {ticket.assignedPtName && (
                      <span>Assigned to: {ticket.assignedPtName}</span>
                    )}
                  </div>

                  {ticket.dietLogId && (
                    <p className="text-sm text-gray-500 mt-2">
                      Related Diet Log: #{ticket.dietLogId?.slice(0, 8)}
                    </p>
                  )}
                </div>

                {ticket.status === 'OPEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssign(ticket.id)}
                  >
                    Assign PT <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
