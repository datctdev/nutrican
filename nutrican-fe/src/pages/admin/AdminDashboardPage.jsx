import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';
import { Users, Award, AlertTriangle, Activity, Shield, RefreshCw, ArrowRight } from 'lucide-react';

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
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Active PTs',
      value: stats?.totalPts || 0,
      icon: Award,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Pending PT Approvals',
      value: stats?.pendingPtVerifications || 0,
      icon: AlertTriangle,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Active SOS Tickets',
      value: stats?.activeSosTickets || 0,
      icon: Activity,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview and quick actions</p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Customers</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats?.totalDietLogs || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Diet Logs</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats?.averageRating?.toFixed(1) || '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Avg Rating</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats?.pendingKycVerifications || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Pending KYC</p>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PT Approvals */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">PT Approvals</h3>
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
              {stats?.pendingPtVerifications || 0} pending
            </span>
          </div>
          {stats?.pendingPtVerifications > 0 ? (
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800 font-medium mb-2">
                {stats.pendingPtVerifications} PT(s) waiting for approval
              </p>
              <Link
                to="/admin/pts"
                className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                Review now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No pending approvals</p>
          )}
        </Card>

        {/* KYC */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">KYC Verifications</h3>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
              {stats?.pendingKycVerifications || 0} pending
            </span>
          </div>
          {stats?.pendingKycVerifications > 0 ? (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">
                {stats.pendingKycVerifications} KYC request(s) to review
              </p>
              <Link
                to="/admin/kyc"
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 font-medium"
              >
                Review now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No pending KYC requests</p>
          )}
        </Card>

        {/* SOS */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">SOS Tickets</h3>
            <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">
              {stats?.activeSosTickets || 0} active
            </span>
          </div>
          {stats?.activeSosTickets > 0 ? (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">
                {stats.activeSosTickets} SOS ticket(s) need attention
              </p>
              <Link
                to="/admin/sos"
                className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900 font-medium"
              >
                Handle now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No active SOS tickets</p>
          )}
        </Card>
      </div>
    </div>
  );
}
