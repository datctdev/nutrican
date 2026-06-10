// src/pages/admin/AdminDashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { adminService } from '../../services/adminService';
import { Users, Award, AlertCircle, ChevronRight, ShieldCheck, HeartPulse, UserPlus, Star, Download, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [rblStats, setRblStats] = useState(null);
  const [rblPreview, setRblPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); fetchRbl(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getStats();
      setStats(response.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRbl = async () => {
    try {
      const [statsRes, previewRes] = await Promise.all([
        adminService.getRblStats({}),
        adminService.getRblExportPreview({ cvOnly: true }),
      ]);
      setRblStats(statsRes.data.data);
      setRblPreview(previewRes.data);
    } catch (err) {
      console.error('RBL stats unavailable', err);
    }
  };

  const handleDownloadRbl = async () => {
    try {
      const res = await adminService.downloadRblExport({ cvOnly: true });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rbl_export.csv';
      a.click();
      toast.success('RBL dataset downloaded');
    } catch (err) {
      toast.error('Failed to download export');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await adminService.getRblReport({});
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rbl_report.md';
      a.click();
      toast.success('RBL report downloaded');
    } catch (err) {
      toast.error('Failed to download report');
    }
  };

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
          </Card>
        ))}
      </div>

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

            {/* KYC */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">KYC Verifications</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  {stats?.pendingKycVerifications > 0 
                    ? `You have ${stats.pendingKycVerifications} KYC requests to review.`
                    : 'No pending KYC requests.'}
                </p>
                <Link to="/admin/kyc">
                  <Button className="w-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl h-11">
                    Review KYC <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* SOS Tickets */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between md:col-span-2">
              <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="font-bold text-slate-900 mb-1">Emergency SOS</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {stats?.activeSosTickets > 0 
                      ? `There are ${stats.activeSosTickets} unresolved SOS tickets from clients needing immediate assistance.`
                      : 'No active SOS tickets. Platform is running smoothly.'}
                  </p>
                </div>
                <Link to="/admin/sos" className="w-full md:w-auto">
                  <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11">
                    Manage Tickets <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* RBL Research Section */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-900">RBL Research (CV + PT Ground Truth)</h3>
          </div>
          {rblStats ? (
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Reviewed logs</p>
                <p className="text-2xl font-black text-slate-900">{rblStats.totalReviewed}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">CV labeled</p>
                <p className="text-2xl font-black text-slate-900">{rblStats.totalLabeledCv}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">MAE AI (kcal)</p>
                <p className="text-2xl font-black text-indigo-600">{rblStats.maeAiCalories}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Adjust rate (restaurant)</p>
                <p className="text-2xl font-black text-amber-600">
                  {rblStats.adjustRateByMealSource?.RESTAURANT != null
                    ? `${Math.round(rblStats.adjustRateByMealSource.RESTAURANT * 100)}%` : '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-4">No reviewed logs yet — collect PT reviews to populate RBL metrics.</p>
          )}
          {rblStats?.insufficientSample && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4">
              Sample size &lt; 30 — collect more reviewed CV logs before writing Results.
            </p>
          )}
          {rblStats?.calibrationBuckets && Object.keys(rblStats.calibrationBuckets).length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Calibration buckets</p>
              <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Confidence</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Count</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">MAE kcal</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rblStats.calibrationBuckets).map(([bucket, data]) => (
                    <tr key={bucket} className="border-t border-slate-100">
                      <td className="px-3 py-2">{bucket}</td>
                      <td className="px-3 py-2 text-right">{data?.count ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{data?.mae ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadRbl} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
            <Button variant="outline" onClick={handleDownloadReport} className="rounded-xl border-slate-200">
              Download Report (.md)
            </Button>
            <Button variant="outline" onClick={fetchRbl} className="rounded-xl border-slate-200">Refresh stats</Button>
          </div>
          {rblPreview?.message && (
            <p className="text-xs text-slate-400 mt-3">{rblPreview.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}