// src/pages/pt/PtDashboardPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

export default function PtDashboardPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [maxClients, setMaxClients] = useState(10);
    const [savingMax, setSavingMax] = useState(false);
    const [pendingHiresCount, setPendingHiresCount] = useState(0);
    const [alerts, setAlerts] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [sRes, cRes, aRes] = await Promise.all([
                workspaceService.getStats(),
                workspaceService.getClients({ page: 0, size: 10, status: 'PENDING' }).catch(() => ({ data: { data: { totalElements: 0 } } })),
                workspaceService.getAlerts().catch(() => ({ data: { data: [] } })),
            ]);
            setStats(sRes.data.data);
            setPendingHiresCount(cRes.data.data.totalElements || cRes.data.data.content?.length || 0);
            setAlerts(aRes.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchData();
            try {
                const res = await userService.getProfile();
                const max = res.data?.data?.maxClients;
                if (max) setMaxClients(max);
            } catch { /* ignore */ }
        };
        init();

        const handleRealtimeUpdate = () => {
            console.log("🔄 Realtime event received! Updating dashboard stats...");
            fetchData();
        };
        window.addEventListener('realtime_update', handleRealtimeUpdate);

        return () => {
            window.removeEventListener('realtime_update', handleRealtimeUpdate);
        };
    }, [fetchData]);

    const handleSaveMaxClients = async () => {
        const value = Number(maxClients);
        if (value < 1 || value > 20) {
            toast.error('Số học viên tối đa phải từ 1 đến 20');
            return;
        }
        setSavingMax(true);
        try {
            await userService.setMaxClients(value);
            toast.success('Đã cập nhật số học viên tối đa');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không thể lưu');
        } finally {
            setSavingMax(false);
        }
    };

    const statCards = [
        { label: 'Tổng học viên', value: stats?.totalClients || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Chờ nhận xét', value: stats?.pendingReviews || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Xin chào, {user?.fullName?.split(' ')[0]}</h1>

            {pendingHiresCount > 0 && (
                <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-extrabold text-blue-900">Yêu cầu nhận học viên mới ({pendingHiresCount})</p>
                            <p className="text-sm text-blue-700/80 mt-0.5">Bạn đang có học viên mới gửi yêu cầu thuê huấn luyện viên.</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => navigate('/pt/clients')}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-bold shadow-md shadow-blue-500/20 shrink-0"
                    >
                        Xem và Duyệt ngay
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, idx) => (
                    <Card key={idx} className="bg-white border-slate-200 shadow-sm rounded-3xl">
                        <CardContent className="p-6 flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p>
                                <p className="text-4xl font-black text-slate-900">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-2xl ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Attention list */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Học viên cần chú ý trong ngày
                </h2>
                {alerts.length === 0 ? (
                    <Card className="bg-slate-50 border border-slate-200/60 shadow-sm rounded-3xl">
                        <CardContent className="p-6 text-center text-slate-500 text-sm">
                            Hôm nay không có cảnh báo nào cần xử lý. Tất cả học viên đang đi đúng hướng!
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alerts.map((alert, idx) => {
                            let cardColor = "bg-amber-50 border-amber-200 text-amber-900";
                            let iconColor = "text-amber-600";
                            let typeText = "Chú ý";
                            if (alert.alertType === "DIET_VIOLATION") {
                                cardColor = "bg-red-50 border-red-200 text-red-900";
                                iconColor = "text-red-600";
                                typeText = "Ăn sai mục tiêu";
                            } else if (alert.alertType === "PLAN_EXPIRED") {
                                cardColor = "bg-orange-50 border-orange-200 text-orange-950";
                                iconColor = "text-orange-600";
                                typeText = "Đến hạn đổi thực đơn";
                            } else if (alert.alertType === "WEIGHT_CHANGED") {
                                cardColor = "bg-blue-50 border-blue-200 text-blue-900";
                                iconColor = "text-blue-600";
                                typeText = "Cập nhật cân nặng";
                            }
                            return (
                                <Card key={idx} className={`${cardColor} border rounded-3xl shadow-sm hover:shadow transition-all`}>
                                    <CardContent className="p-5 flex items-start gap-4">
                                        <div className={`w-10 h-10 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0`}>
                                            <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-wider opacity-75">{typeText}</span>
                                                <span className="text-[10px] font-bold opacity-60">{alert.logDate}</span>
                                            </div>
                                            <h4 className="font-extrabold text-sm mt-1">{alert.clientName}</h4>
                                            <p className="text-xs mt-1 leading-relaxed opacity-90">{alert.reason}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate(`/pt/progress/${alert.clientId}`)}
                                            className="bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold shadow-sm self-center text-xs shrink-0 px-3 py-1.5 h-auto border border-slate-200/50"
                                        >
                                            Xem tiến độ
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <Card className="bg-white border-slate-200 shadow-sm rounded-3xl max-w-md">
                <CardContent className="p-6 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giới hạn học viên</p>
                    <p className="text-sm text-slate-600">Số client ACTIVE tối đa bạn chấp nhận (1–20).</p>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={maxClients}
                            onChange={(e) => setMaxClients(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <Button onClick={handleSaveMaxClients} disabled={savingMax} className="rounded-xl">
                            Lưu
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}