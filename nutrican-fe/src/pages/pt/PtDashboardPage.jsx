// // src/pages/pt/PtDashboardPage.jsx
// import { Link } from 'react-router-dom';
// import Card from '../../components/common/Card';
// import Badge from '../../components/common/Badge';
// import Avatar from '../../components/common/Avatar';

// export default function PtDashboardPage() {
//   const clients = [
//     { id: 1, name: 'Alice Smith', status: 'GREEN', lastLog: '2 hours ago', avgCalories: 1800 },
//     { id: 2, name: 'Bob Johnson', status: 'RED', lastLog: 'Overdue', avgCalories: 2500 },
//     { id: 3, name: 'Charlie Lee', status: 'YELLOW', lastLog: 'Yesterday', avgCalories: 1600 },
//   ];

//   const statusColors = { GREEN: 'bg-green-500', RED: 'bg-red-500', YELLOW: 'bg-yellow-500' };
//   const statusLabels = { GREEN: 'On Track', RED: 'Over Calorie', YELLOW: 'Missing Log' };
//   const statusBadge = { GREEN: 'success', RED: 'danger', YELLOW: 'warning' };

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold text-gray-900">PT Dashboard</h1>
//         <Link to="/pt/reviews" className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">
//           Pending Reviews (3)
//         </Link>
//       </div>
//       <div className="grid grid-cols-4 gap-4">
//         {[
//           { label: 'Total Clients', value: '12' },
//           { label: 'Pending Reviews', value: '3' },
//           { label: 'SOS Tickets', value: '1' },
//           { label: 'This Week Reviews', value: '28' },
//         ].map((stat) => (
//           <Card key={stat.label} className="p-4 text-center">
//             <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
//             <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
//           </Card>
//         ))}
//       </div>
//       <Card>
//         <h3 className="font-semibold text-gray-900 mb-4">My Clients</h3>
//         <div className="space-y-3">
//           {clients.map((client) => (
//             <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//               <div className="flex items-center gap-3">
//                 <div className={`w-3 h-3 rounded-full ${statusColors[client.status]} animate-pulse`} />
//                 <Avatar alt={client.name} size="sm" />
//                 <div>
//                   <p className="font-medium text-gray-900">{client.name}</p>
//                   <p className="text-sm text-gray-500">Last log: {client.lastLog}</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-3">
//                 <span className="text-sm text-gray-600">{client.avgCalories} kcal avg</span>
//                 <Badge variant={statusBadge[client.status]}>{statusLabels[client.status]}</Badge>
//               </div>
//             </div>
//           ))}
//         </div>
//       </Card>
//     </div>
//   );
// }

// src/pages/pt/PtDashboardPage.jsx
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, FileText, AlertTriangle, TrendingUp, ChevronRight, Activity, ArrowRight } from 'lucide-react';

export default function PtDashboardPage() {
  // Dữ liệu mẫu (Giữ nguyên cấu trúc để không break logic, sau này có thể hook vào API workspaceService)
  const clients = [
    { id: 1, name: 'Alice Smith', status: 'GREEN', lastLog: '2 hours ago', avgCalories: 1800, goal: 'Weight Loss' },
    { id: 2, name: 'Bob Johnson', status: 'RED', lastLog: 'Overdue', avgCalories: 2500, goal: 'Muscle Gain' },
    { id: 3, name: 'Charlie Lee', status: 'YELLOW', lastLog: 'Yesterday', avgCalories: 1600, goal: 'Maintenance' },
  ];

  const getStatusConfig = (status) => {
    switch (status) {
      case 'GREEN': return { color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'On Track', shadow: 'shadow-emerald-500/20' };
      case 'RED': return { color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Action Needed', shadow: 'shadow-red-500/20' };
      case 'YELLOW': return { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Missing Log', shadow: 'shadow-amber-500/20' };
      default: return { color: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-700', label: 'Unknown', shadow: 'shadow-slate-500/20' };
    }
  };

  const stats = [
    { label: 'Total Clients', value: '12', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Pending Reviews', value: '3', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'SOS Tickets', value: '1', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Weekly Reviews', value: '28', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trainer Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">Welcome back! Here's what's happening with your clients.</p>
        </div>
        <Link to="/pt/reviews">
          <Button className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm rounded-xl font-bold">
            <AlertTriangle className="w-4 h-4 mr-2" /> Pending Reviews (3)
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p>
                    <p className="text-4xl font-black text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${stat.bg}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Client List */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Client Overview
          </h3>
          <Link to="/pt/clients" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {clients.map((client) => {
            const config = getStatusConfig(client.status);
            return (
              <div key={client.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="flex items-center gap-4">
                  {/* Glowing Status Indicator */}
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute w-full h-full rounded-full ${config.color} opacity-20 animate-ping`} />
                    <div className={`w-3 h-3 rounded-full ${config.color} shadow-lg ${config.shadow}`} />
                  </div>
                  
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                    {getInitials(client.name)}
                  </div>
                  
                  {/* Info */}
                  <div>
                    <h4 className="font-bold text-slate-900">{client.name}</h4>
                    <p className="text-sm text-slate-500 font-medium">Last log: {client.lastLog}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-bold text-slate-700">{client.avgCalories} kcal</p>
                    <p className="text-xs text-slate-400 font-medium uppercase">{client.goal}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${config.bg} ${config.text} border-${config.color}/20`}>
                    {config.label}
                  </span>
                  <Button variant="ghost" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-2">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}