// src/pages/admin/AdminDashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
<<<<<<< HEAD
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';
import { Users, Award, AlertTriangle, Activity, Shield, RefreshCw, ArrowRight } from 'lucide-react';
=======
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { adminService } from '../../services/adminService';
import { Users, Award, AlertCircle, ChevronRight, ShieldCheck, HeartPulse, UserPlus, Star } from 'lucide-react';
>>>>>>> feature/premium-ui-revamp

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getStats();
      setStats(response.data.data);
    } catch (err) {
<<<<<<< HEAD
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
      toast.error('Failed to load dashboard stats');
=======
      console.error(err);
>>>>>>> feature/premium-ui-revamp
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
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
=======
  if (loading) return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      <Skeleton className="h-10 w-64 rounded-xl mb-8 bg-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl bg-slate-200" />)}
      </div>
    </div>
  );

  const mainStats = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Active PTs', value: stats?.totalPts || 0, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Pending PTs', value: stats?.pendingPtVerifications || 0, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'SOS Tickets', value: stats?.activeSosTickets || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-slate-500 mt-1 font-medium">Nutrican Platform Executive Dashboard</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat, idx) => (
          <Card key={idx} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg} border ${stat.border}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
>>>>>>> feature/premium-ui-revamp
          </Card>
        ))}
      </div>

<<<<<<< HEAD
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
=======
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Engagement Stats */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
              <HeartPulse className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold">Platform Engagement</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Customers</span>
                <span className="text-2xl font-bold">{stats?.totalCustomers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Diet Logs</span>
                <span className="text-2xl font-bold">{stats?.totalDietLogs || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Average PT Rating</span>
                <span className="text-2xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> 
                  {stats?.averageRating?.toFixed(1) || '5.0'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Center */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-slate-800">Action Center</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* PT Approvals */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-amber-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">PT Verifications</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  {stats?.pendingPtVerifications > 0 
                    ? `You have ${stats.pendingPtVerifications} personal trainers waiting for background check and approval.`
                    : 'All personal trainer applications have been reviewed.'}
                </p>
                <Link to="/admin/pts">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11">
                    Review Applications <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* SOS Tickets */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Emergency SOS</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  {stats?.activeSosTickets > 0 
                    ? `There are ${stats.activeSosTickets} unresolved SOS tickets from clients needing immediate assistance.`
                    : 'No active SOS tickets. Platform is running smoothly.'}
                </p>
                <Link to="/admin/sos">
                  <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11">
                    Manage Tickets <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

          </div>
        </div>
>>>>>>> feature/premium-ui-revamp
      </div>
    </div>
  );
}