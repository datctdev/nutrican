// src/pages/pt/PtDashboardPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { useAuthStore } from '../../stores/authStore';

export default function PtDashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const sRes = await workspaceService.getStats();
            setStats(sRes.data.data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchData();
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

    const statCards = [
        { label: 'Total Clients', value: stats?.totalClients || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Pending Reviews', value: stats?.pendingReviews || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'SOS Tickets', value: stats?.pendingSosTickets || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome, {user?.fullName?.split(' ')[0]}</h1>
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
        </div>
    );
}