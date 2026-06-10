// src/pages/pt/ReviewDietLogPage.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { CheckCircle2, XCircle, SlidersHorizontal, Clock, Image as ImageIcon, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { workspaceService } from '../../services/workspaceService';

export default function ReviewDietLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [adjustingLog, setAdjustingLog] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    adjustedCalories: 0,
    adjustedProtein: 0,
    adjustedCarb: 0,
    adjustedFat: 0,
    note: '',
  });

  useEffect(() => {
    fetchPendingLogs();
  }, []);

  const fetchPendingLogs = async () => {
    try {
      setLoading(true);
      const response = await workspaceService.getPendingLogs({ size: 20 });
      setLogs(response.data.data.content || []);
    } catch (err) {
      console.error('Error fetching pending logs:', err);
      toast.error('Failed to load pending logs');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (logId, action, extra = {}) => {
    try {
      setActionLoading(logId);
      await workspaceService.reviewLog(logId, { action, ...extra });
      toast.success(
        action === 'APPROVE' ? 'Log approved successfully' :
        action === 'REJECT' ? 'Log rejected' :
        'Log updated with adjustments'
      );
      fetchPendingLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review log');
    } finally {
      setActionLoading(null);
      setAdjustingLog(null);
    }
  };

  const openAdjust = (log) => {
    setAdjustingLog(log.id);
    const macros = log.macrosJson || {};
    setAdjustForm({
      adjustedCalories: macros.calories || 0,
      adjustedProtein: macros.protein || 0,
      adjustedCarb: macros.carbs || macros.carb || 0,
      adjustedFat: macros.fat || 0,
      note: '',
    });
  };

  const handleAdjustSubmit = (logId) => {
    handleReview(logId, 'ADJUST_MACROS', {
      adjustedCalories: parseFloat(adjustForm.adjustedCalories) || 0,
      adjustedProtein: parseFloat(adjustForm.adjustedProtein) || 0,
      adjustedCarb: parseFloat(adjustForm.adjustedCarb) || 0,
      adjustedFat: parseFloat(adjustForm.adjustedFat) || 0,
      note: adjustForm.note,
    });
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CL';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review Diet Logs</h1>
          <p className="text-slate-500 mt-1 font-medium">You have {logs.length} pending logs from your clients requiring your review.</p>
        </div>
        <Button onClick={fetchPendingLogs} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-3xl bg-slate-200" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">All Caught Up!</h3>
          <p className="text-slate-500 mt-2">There are no pending diet logs to review at this moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map((log) => (
            <Card key={log.id} className="bg-white border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                
                {/* Image Section */}
                <div className="md:w-72 h-48 md:h-auto bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-b md:border-b-0 md:border-r border-slate-200 relative">
                  {log.imageUrl ? (
                    <img src={log.imageUrl} alt="Meal" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                      <span className="text-sm font-semibold">No Image Provided</span>
                    </>
                  )}
                  {/* Status Badges Over Image */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-slate-200/50">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Pending</span>
                    </div>
                    {log.sosTicketFlag && (
                      <div className="bg-red-500/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-red-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">SOS</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-300">
                          {getInitials(log.customerName || 'Client')}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 leading-tight">{log.customerName}</h3>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                            {log.mealType} • {log.logDate ? new Date(log.logDate).toLocaleDateString() : 'Today'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-slate-800 font-bold text-lg capitalize mb-5">{log.foodDescription || 'Meal Log'}</p>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Cals</p>
                          <p className="font-black text-slate-800 text-lg">{log.macrosJson?.calories || 0}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Protein</p>
                          <p className="font-black text-blue-600 text-lg">{log.macrosJson?.protein || 0}g</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Carbs</p>
                          <p className="font-black text-amber-500 text-lg">{log.macrosJson?.carbs || log.macrosJson?.carb || 0}g</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Fat</p>
                          <p className="font-black text-red-500 text-lg">{log.macrosJson?.fat || 0}g</p>
                        </div>
                      </div>
                    </div>

                    {/* Adjust Form */}
                    {adjustingLog === log.id && (
                      <div className="mt-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl animate-fade-in">
                        <h4 className="text-sm font-bold text-blue-900 mb-3">Adjust Macros</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div>
                            <label className="text-[10px] font-extrabold text-blue-700 uppercase">Calories</label>
                            <input type="number" value={adjustForm.adjustedCalories} onChange={(e) => setAdjustForm({...adjustForm, adjustedCalories: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-blue-700 uppercase">Protein (g)</label>
                            <input type="number" value={adjustForm.adjustedProtein} onChange={(e) => setAdjustForm({...adjustForm, adjustedProtein: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-blue-700 uppercase">Carbs (g)</label>
                            <input type="number" value={adjustForm.adjustedCarb} onChange={(e) => setAdjustForm({...adjustForm, adjustedCarb: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-blue-700 uppercase">Fat (g)</label>
                            <input type="number" value={adjustForm.adjustedFat} onChange={(e) => setAdjustForm({...adjustForm, adjustedFat: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="text-[10px] font-extrabold text-blue-700 uppercase">Note to client</label>
                          <input type="text" placeholder="Explain your adjustments..." value={adjustForm.note} onChange={(e) => setAdjustForm({...adjustForm, note: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleAdjustSubmit(log.id)} disabled={actionLoading === log.id} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 text-xs">
                            Confirm Adjustments
                          </Button>
                          <Button onClick={() => setAdjustingLog(null)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl h-9 text-xs">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!adjustingLog && (
                    <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
                      <Button variant="outline" onClick={() => handleReview(log.id, 'REJECT')} disabled={actionLoading === log.id} className="text-red-600 border-red-200 hover:bg-red-50 bg-white rounded-xl h-10 px-4">
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button variant="outline" onClick={() => openAdjust(log)} disabled={actionLoading === log.id} className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white rounded-xl h-10 px-4">
                        <SlidersHorizontal className="w-4 h-4 mr-2" /> Adjust Macros
                      </Button>
                      <Button onClick={() => handleReview(log.id, 'APPROVE')} disabled={actionLoading === log.id} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 px-6 shadow-sm shadow-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Log
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}