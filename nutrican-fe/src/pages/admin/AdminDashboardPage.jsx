// src/pages/admin/AdminDashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { adminService } from '../../services/adminService';
import { userService } from '../../services/userService';
import { Users, Award, ChevronRight, ShieldCheck, HeartPulse, Star, Download, BarChart3, UserPlus, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [rblStats, setRblStats] = useState(null);
  const [rblPreview, setRblPreview] = useState(null);
  const [rblFrom, setRblFrom] = useState('');
  const [rblTo, setRblTo] = useState('');
  const [rblCohortKey, setRblCohortKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [requireKyc, setRequireKyc] = useState(true);
  const [updatingKycSetting, setUpdatingKycSetting] = useState(false);

  const rblParams = () => {
    const p = { cvOnly: true };
    if (rblFrom) p.from = rblFrom;
    if (rblTo) p.to = rblTo;
    if (rblCohortKey) p.experimentCohortKey = rblCohortKey;
    return p;
  };

  useEffect(() => { 
    fetchStats(); 
    fetchRbl(); 
    fetchRequireKycSetting();
  }, []);

  const fetchRequireKycSetting = async () => {
    try {
      const res = await userService.getRequireKycSetting();
      setRequireKyc(res.data.data);
    } catch (err) {
      console.error('Failed to fetch requireKyc setting:', err);
    }
  };

  const handleToggleRequireKyc = async () => {
    try {
      setUpdatingKycSetting(true);
      const newValue = !requireKyc;
      await userService.updateRequireKycSetting(newValue);
      setRequireKyc(newValue);
      toast.success(newValue ? 'Đã bật yêu cầu KYC khi đăng ký PT' : 'Đã tắt yêu cầu KYC khi đăng ký PT');
    } catch (err) {
      toast.error('Không thể cập nhật cấu hình');
      console.error(err);
    } finally {
      setUpdatingKycSetting(false);
    }
  };

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
      const params = rblParams();
      const [statsRes, previewRes] = await Promise.all([
        adminService.getRblStats(params),
        adminService.getRblExportPreview(params),
      ]);
      setRblStats(statsRes.data.data);
      setRblPreview(previewRes.data);
    } catch (err) {
      console.error('RBL stats unavailable', err);
    }
  };

  const handleDownloadRbl = async () => {
    try {
      const res = await adminService.downloadRblExport(rblParams());
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rbl_export.csv';
      a.click();
      toast.success('Đã tải xuống tập dữ liệu RBL');
    } catch (err) {
      toast.error('Không thể tải xuống dữ liệu RBL');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await adminService.getRblReport(rblParams());
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rbl_report.md';
      a.click();
      toast.success('Đã tải xuống báo cáo RBL');
    } catch (err) {
      toast.error('Không thể tải xuống báo cáo');
    }
  };

  if (loading) return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">
      <Skeleton className="h-10 w-64 rounded-xl mb-8 bg-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl bg-slate-200" />)}
      </div>
    </div>
  );

  const mainStats = [
    { label: 'Tổng người dùng', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'PT hoạt động', value: stats?.totalPts || 0, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'PT chờ duyệt', value: stats?.pendingPtVerifications || 0, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tổng Quan Hệ Thống</h1>
        <p className="text-slate-500 mt-1 font-medium">Bảng quản trị hệ thống Nutrican</p>
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
              <h3 className="text-xl font-bold">Chỉ số tương tác hệ thống</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Tổng học viên</span>
                <span className="text-2xl font-bold">{stats?.totalCustomers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Tổng nhật ký ăn uống</span>
                <span className="text-2xl font-bold">{stats?.totalDietLogs || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Đánh giá PT trung bình</span>
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
          <h3 className="text-xl font-bold text-slate-800">Trung tâm xử lý</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* PT Approvals */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-amber-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Xác thực PT</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  {stats?.pendingPtVerifications > 0 
                    ? `Bạn có ${stats.pendingPtVerifications} hồ sơ huấn luyện viên đang chờ xác minh và duyệt.`
                    : 'Tất cả hồ sơ đăng ký PT đã được xử lý.'}
                </p>
                <Link to="/admin/pts">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11">
                    Duyệt hồ sơ <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
                  <HeartPulse className="w-6 h-6 text-orange-500" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Mapping dị ứng món ăn</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  Quản lý foodCode → allergen cho cảnh báo khi ghi nhận bữa ăn và lên thực đơn.
                </p>
                <Link to="/admin/allergens">
                  <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11">
                    Quản lý dị ứng <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                  <HeartPulse className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Diet tags món ăn</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  Gán VEGAN, KETO, … cho foodCode — hỗ trợ lọc chế độ ăn và badge !PREF.
                </p>
                <Link to="/admin/food-tags">
                  <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11">
                    Quản lý diet tags <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

          </div>

          {/* Cấu hình hệ thống */}
          <h3 className="text-xl font-bold text-slate-800 pt-2">Cấu hình hệ thống</h3>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 mb-1">Yêu cầu xác thực KYC khi đăng ký PT</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {requireKyc 
                      ? 'Hiện tại hệ thống yêu cầu người dùng phải hoàn thành xác thực danh tính (CCCD) trước khi được đăng ký làm huấn luyện viên.' 
                      : 'Hiện tại hệ thống cho phép người dùng tự do đăng ký làm huấn luyện viên mà không cần xác thực danh tính.'}
                  </p>
                </div>
                <button 
                  type="button"
                  disabled={updatingKycSetting}
                  onClick={handleToggleRequireKyc}
                  className="focus:outline-none transition-all disabled:opacity-50 text-primary border-none bg-transparent"
                >
                  {updatingKycSetting ? (
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                  ) : requireKyc ? (
                    <ToggleRight className="w-12 h-12 text-primary" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-slate-350" />
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RBL Research Section */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-900">Nghiên cứu RBL (Dữ liệu CV + PT Đối chứng)</h3>
          </div>
          {rblStats ? (
            <>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Bữa ăn đã duyệt</p>
                <p className="text-2xl font-black text-slate-900">{rblStats.totalReviewed}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Ảnh đã gán nhãn</p>
                <p className="text-2xl font-black text-slate-900">{rblStats.totalLabeledCv}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Sai số AI (MAE kcal)</p>
                <p className="text-2xl font-black text-indigo-600">{rblStats.maeAiCalories}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Tỷ lệ sửa (Ăn ngoài)</p>
                <p className="text-2xl font-black text-amber-600">
                  {rblStats.adjustRateByMealSource?.RESTAURANT != null
                    ? `${Math.round(rblStats.adjustRateByMealSource.RESTAURANT * 100)}%` : '—'}
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-700 uppercase">Sai số DB (MAE kcal)</p>
                <p className="text-2xl font-black text-emerald-700">{rblStats.maeDbCalories ?? '—'}</p>
              </div>
              <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100">
                <p className="text-xs font-bold text-violet-700 uppercase">Chênh lệch ΔA (AI - DB)</p>
                <p className="text-2xl font-black text-violet-700">
                  {rblStats.maeAiCalories != null && rblStats.maeDbCalories != null
                    ? (Number(rblStats.maeAiCalories) - Number(rblStats.maeDbCalories)).toFixed(1)
                    : '—'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">MAE CHỈ AI</p>
                <p className="text-2xl font-black text-slate-700">{rblStats.maeByRecognitionSource?.AI_ONLY ?? '—'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">MAE HYBRID</p>
                <p className="text-2xl font-black text-slate-700">{rblStats.maeByRecognitionSource?.HYBRID ?? '—'}</p>
              </div>
            </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 mb-4">Chưa có dữ liệu ăn uống nào được phê duyệt từ PT.</p>
          )}
          {rblStats?.insufficientSample && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4">
              Kích thước mẫu &lt; 30 — hãy thu thập thêm nhật ký đã duyệt trước khi phân tích kết quả.
            </p>
          )}
          {rblStats?.cohortKeyCounts && Object.keys(rblStats.cohortKeyCounts).length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Phân bố experimentCohortKey</p>
              <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Cohort key</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Số lượng</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">MAE (kcal)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rblStats.cohortKeyCounts).map(([key, count]) => (
                    <tr key={key} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs">{key}</td>
                      <td className="px-3 py-2 text-right">{count}</td>
                      <td className="px-3 py-2 text-right">{rblStats.maeByCohortKey?.[key] ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rblStats?.cohortCounts && Object.keys(rblStats.cohortCounts).length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Phân bố nhóm mẫu (Mục tiêu: ≥8 Tự nấu, ≥8 Ăn ngoài, ≥4 Lẩu, ≥4 Buffet)</p>
              <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Nhóm</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rblStats.cohortCounts).map(([cohort, count]) => (
                    <tr key={cohort} className="border-t border-slate-100">
                      <td className="px-3 py-2">{cohort}</td>
                      <td className="px-3 py-2 text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rblStats?.calibrationBuckets && Object.keys(rblStats.calibrationBuckets).length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Các nhóm hiệu chuẩn (Calibration buckets)</p>
              <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Độ tự tin</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Số lượng</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Sai số MAE (kcal)</th>
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
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Từ ngày</label>
              <input type="date" value={rblFrom} onChange={(e) => setRblFrom(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Đến ngày</label>
              <input type="date" value={rblTo} onChange={(e) => setRblTo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cohort key</label>
              <select value={rblCohortKey} onChange={(e) => setRblCohortKey(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm min-w-[180px]">
                <option value="">Tất cả</option>
                {Object.keys(rblStats?.cohortKeyCounts || {}).map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={fetchRbl} className="rounded-xl border-slate-200 h-10">Áp dụng ngày</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadRbl} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              <Download className="w-4 h-4 mr-2" /> Tải xuống CSV
            </Button>
            <Button variant="outline" onClick={handleDownloadReport} className="rounded-xl border-slate-200">
              Tải xuống báo cáo (.md)
            </Button>
            <Button variant="outline" onClick={fetchRbl} className="rounded-xl border-slate-200">Cập nhật chỉ số</Button>
          </div>
          {rblPreview?.message && (
            <p className="text-xs text-slate-400 mt-3">{rblPreview.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}