import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { workspaceService } from '../../services/workspaceService';
import { useAuthStore } from '../../stores/authStore';
import { Users, Clock, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';

export default function PtDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsRes, statsRes] = await Promise.all([
        workspaceService.getClients({ size: 10 }),
        workspaceService.getStats(),
      ]);
      setClients(clientsRes.data.data.content || []);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Error fetching PT dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'GREEN': return 'bg-green-500';
      case 'YELLOW': return 'bg-yellow-500';
      case 'RED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'GREEN': return 'On Track';
      case 'YELLOW': return 'Missing Log';
      case 'RED': return 'Overdue';
      default: return status;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'GREEN': return 'success';
      case 'YELLOW': return 'warning';
      case 'RED': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) return <Spinner />;

  const statCards = [
    {
      label: 'Total Clients',
      value: stats?.totalClients || clients.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Pending Reviews',
      value: stats?.pendingReviews || 0,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'SOS Tickets',
      value: stats?.pendingSosTickets || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Reviews This Week',
      value: stats?.reviewsThisWeek || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fullName?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here is your PT workspace overview</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">My Clients</h2>
        <Link
          to="/pt/clients"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View all
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900">No clients yet</h3>
          <p className="text-sm text-gray-500 mt-1">Clients will appear here once they request your services.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {clients.map((client) => (
              <div
                key={client.clientId}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(client.status)} animate-pulse`} />
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {client.clientName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.clientName}</p>
                    <p className="text-sm text-gray-500">
                      {client.lastLogTime ? `Last log: ${new Date(client.lastLogTime).toLocaleDateString()}` : 'No logs yet'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {client.avgCalories && (
                    <span className="text-sm text-gray-500">{client.avgCalories} kcal avg</span>
                  )}
                  <Badge variant={getStatusVariant(client.status)}>
                    {getStatusLabel(client.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(stats?.pendingReviews > 0 || stats?.pendingSosTickets > 0) && (
        <Card className="p-6 border-amber-200 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Action Required</p>
                <p className="text-sm text-amber-700">
                  You have {stats.pendingReviews > 0 && `${stats.pendingReviews} pending review${stats.pendingReviews > 1 ? 's' : ''}`}
                  {stats.pendingReviews > 0 && stats.pendingSosTickets > 0 && ' and '}
                  {stats.pendingSosTickets > 0 && `${stats.pendingSosTickets} SOS ticket${stats.pendingSosTickets > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Link
              to="/pt/reviews"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Review Now
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
