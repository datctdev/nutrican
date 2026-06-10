// src/pages/pt/ClientListPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, Filter, Activity, AlertCircle, CheckCircle2, ChevronRight, UserCircle } from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';

export default function ClientListPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await workspaceService.getClients({ page: 0, size: 20 });
      setClients(response.data.data.content || []);
    } catch (err) { toast.error('Failed to load clients'); } 
    finally { setLoading(false); }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CL';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Clients</h1>
          <p className="text-slate-500 mt-1 font-medium">Monitor progress and manage your active trainees.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card key={client.clientId} className="bg-white border-slate-200 shadow-sm hover:shadow-lg transition-all rounded-3xl overflow-hidden flex flex-col">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-lg">
                  {getInitials(client.clientName)}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">{client.clientName}</h3>
                  <p className="text-xs font-semibold text-slate-500">Last log: {client.lastLogTime ? new Date(client.lastLogTime).toLocaleDateString() : 'No logs yet'}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center mb-4 border border-slate-100">
                <span className="font-bold text-slate-700">Status</span>
                <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md ${client.status === 'GREEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {client.status || 'ACTIVE'}
                </span>
              </div>
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11">
                View Progress <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}