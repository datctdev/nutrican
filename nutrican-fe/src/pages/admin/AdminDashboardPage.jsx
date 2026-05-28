import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import Spinner from '../../components/common/Spinner';
import { adminService } from '../../services/adminService';
import { Users, Award, AlertCircle, Activity } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="text-red-500">{error}</div>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'blue' },
    { label: 'Active PTs', value: stats?.totalPts || 0, icon: Award, color: 'green' },
    { label: 'Pending PT Approvals', value: stats?.pendingPtVerifications || 0, icon: AlertCircle, color: 'yellow' },
    { label: 'SOS Tickets', value: stats?.activeSosTickets || 0, icon: Activity, color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Diet Logs</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalDietLogs || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Average Rating</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.averageRating?.toFixed(1) || 'N/A'}</p>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Pending PT Approvals</h3>
            <Link to="/admin/pts" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          {stats?.pendingPtVerifications > 0 ? (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-800 font-medium">
                {stats.pendingPtVerifications} PT(s) waiting for approval
              </p>
              <Link 
                to="/admin/pts" 
                className="mt-2 inline-block text-sm text-yellow-600 hover:text-yellow-800"
              >
                Review now →
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">No pending approvals</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Active SOS Tickets</h3>
            <Link to="/admin/sos" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          {stats?.activeSosTickets > 0 ? (
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">
                {stats.activeSosTickets} SOS ticket(s) need attention
              </p>
              <Link 
                to="/admin/sos" 
                className="mt-2 inline-block text-sm text-red-600 hover:text-red-800"
              >
                Handle now →
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">No active SOS tickets</p>
          )}
        </Card>
      </div>
    </div>
  );
}
