import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';
import { Users, RefreshCw, ChevronRight } from 'lucide-react';

export default function ClientListPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchClients();
  }, [status, page]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = { page, size: 20 };
      if (status) params.status = status;
      const response = await workspaceService.getClients(params);
      setClients(response.data.data.content || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'GREEN': return 'bg-green-500';
      case 'YELLOW': return 'bg-yellow-500';
      case 'RED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (s) => {
    switch (s) {
      case 'GREEN': return 'On Track';
      case 'YELLOW': return 'Missing Log';
      case 'RED': return 'Over Calorie';
      default: return s;
    }
  };

  const getStatusVariant = (s) => {
    switch (s) {
      case 'GREEN': return 'success';
      case 'YELLOW': return 'warning';
      case 'RED': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
        <button
          onClick={fetchClients}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2">
        {['', 'ACTIVE', 'INACTIVE', 'PENDING'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatus(s); setPage(0); }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : clients.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900">No clients found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {status ? `No clients with status "${status}"` : 'You have no assigned clients yet.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Avg Calories</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => (
                  <tr key={client.clientId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`} />
                        <div>
                          <p className="font-medium text-gray-900">{client.clientName}</p>
                          <p className="text-xs text-gray-500">
                            {client.lastLogTime
                              ? `Last log: ${new Date(client.lastLogTime).toLocaleDateString()}`
                              : 'No logs yet'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(client.status)}>
                        {getStatusLabel(client.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {client.avgCalories ? `${client.avgCalories} kcal` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/pt/clients/${client.clientId}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Progress <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
