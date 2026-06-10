// src/pages/pt/ClientListPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, Filter, Activity, TrendingUp, AlertCircle, CheckCircle2, Clock, ChevronRight, UserCircle } from 'lucide-react';

export default function ClientListPage() {
  // Mock Data cho PT test UI
  const [clients] = useState([
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', joinedDate: 'Jan 15, 2026', status: 'ON_TRACK', logsThisWeek: 18, targetLogs: 21, avgCalories: 1850, targetCalories: 2000, avatarUrl: null },
    { id: 2, name: 'Bob Johnson', email: 'bob@example.com', joinedDate: 'Feb 01, 2026', status: 'NEEDS_ATTENTION', logsThisWeek: 5, targetLogs: 21, avgCalories: 2600, targetCalories: 2400, avatarUrl: null },
    { id: 3, name: 'Charlie Lee', email: 'charlie.l@example.com', joinedDate: 'Mar 10, 2026', status: 'EXCELLENT', logsThisWeek: 21, targetLogs: 21, avgCalories: 2100, targetCalories: 2100, avatarUrl: null },
  ]);

  const [search, setSearch] = useState('');

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CL';

  const StatusIndicator = ({ status }) => {
    const config = {
      'EXCELLENT': { color: 'bg-emerald-500', text: 'text-emerald-700', bgCard: 'bg-emerald-50', border: 'border-emerald-200', label: 'Excellent', icon: CheckCircle2 },
      'ON_TRACK': { color: 'bg-blue-500', text: 'text-blue-700', bgCard: 'bg-blue-50', border: 'border-blue-200', label: 'On Track', icon: Activity },
      'NEEDS_ATTENTION': { color: 'bg-red-500', text: 'text-red-700', bgCard: 'bg-red-50', border: 'border-red-200', label: 'Needs Attention', icon: AlertCircle },
    };
    const c = config[status];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border ${c.bgCard} ${c.text} ${c.border}`}>
        <Icon className="w-3.5 h-3.5" /> {c.label}
      </span>
    );
  };

  const calculateProgress = (current, target) => Math.min(100, (current / target) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Clients</h1>
          <p className="text-slate-500 mt-1 font-medium">Monitor progress and manage your active trainees.</p>
        </div>
        <div className="bg-white text-slate-600 px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm flex items-center shadow-sm">
          <UserCircle className="w-4 h-4 mr-2 text-blue-500" /> {clients.length} Active Clients
        </div>
      </div>

      {/* Toolbar */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
            />
          </div>
          <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-6 h-[46px]">
            <Filter className="w-4 h-4 mr-2" /> Sort & Filter
          </Button>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className="bg-white border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-3xl overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              
              {/* Card Header Profile */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-lg shadow-sm">
                    {client.avatarUrl ? <img src={client.avatarUrl} alt="Avatar" className="w-full h-full rounded-2xl object-cover" /> : getInitials(client.name)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 line-clamp-1">{client.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Joined {client.joinedDate}</p>
                  </div>
                </div>
              </div>

              {/* Card Body Stats */}
              <div className="p-6 bg-slate-50/50 flex-1 space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <StatusIndicator status={client.status} />
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Avg Intake</p>
                    <p className="text-sm font-black text-slate-800">{client.avgCalories} <span className="text-slate-500 font-semibold text-xs">/ {client.targetCalories} kcal</span></p>
                  </div>
                </div>

                {/* Engagement Progress */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400"/> Weekly Logs</p>
                    <span className="text-xs font-black text-slate-900">{client.logsThisWeek}/{client.targetLogs}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${client.status === 'NEEDS_ATTENTION' ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${calculateProgress(client.logsThisWeek, client.targetLogs)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-4 bg-white border-t border-slate-100">
                <Link to={`/pt/progress/${client.id}`}>
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 shadow-sm">
                    View Full Report <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}