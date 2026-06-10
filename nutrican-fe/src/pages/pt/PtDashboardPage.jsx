// src/pages/pt/PtDashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, Clock, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { useAuthStore } from '../../stores/authStore';

export default function PtDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [cRes, sRes] = await Promise.all([ workspaceService.getClients({ size: 10 }).catch(()=>({data:{data:{content:[]}}})), workspaceService.getStats().catch(()=>({data:{data:{}}})) ]);
      setClients(cRes.data.data.content || []); setStats(sRes.data.data);
    };
    fetchData();
  }, []);

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
              <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p><p className="text-4xl font-black text-slate-900">{stat.value}</p></div>
              <div className={`p-3 rounded-2xl ${stat.bg}`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}