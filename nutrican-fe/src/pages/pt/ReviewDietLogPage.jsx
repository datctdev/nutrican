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
  const [sosTickets, setSosTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sosLoading, setSosLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState({});
  const [adjustingLog, setAdjustingLog] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    adjustedCalories: 0,
    adjustedProtein: 0,
    adjustedCarb: 0,
    adjustedFat: 0,
    note: '',
    correctionReason: 'OTHER',
  });
  const [blindMode, setBlindMode] = useState({});
  const [blindRevealed, setBlindRevealed] = useState({});
  const [blindForms, setBlindForms] = useState({});
  const [ptRblStats, setPtRblStats] = useState(null);

  const CORRECTION_REASONS = [
    'WRONG_FOOD', 'WRONG_PORTION', 'WRONG_MACROS', 'UNCLEAR_IMAGE',
    'RESTAURANT_TOO_COMPLEX', 'DB_MATCH_INCORRECT', 'OTHER',
  ];

  const MacroCol = ({ label, macros, color }) => (
    <div className={`p-3 rounded-xl border text-center ${color}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1 opacity-70">{label}</p>
      <p className="text-xs font-bold">{macros?.calories || 0} kcal</p>
      <p className="text-[10px] text-slate-500">P{macros?.protein || 0} C{macros?.carbs || macros?.carb || 0} F{macros?.fat || 0}</p>
    </div>
  );

  useEffect(() => {
    fetchPendingLogs();
    fetchSosTickets();
    fetchPtRblStats();
  }, []);

  const fetchPtRblStats = async () => {
    try {
      const res = await workspaceService.getPtRblStats();
      setPtRblStats(res.data.data);
    } catch (err) {
      console.error('PT RBL stats unavailable', err);
    }
  };

  const getBlindForm = (logId) => blindForms[logId] || { calories: '', protein: '', carb: '', fat: '' };
  const setBlindField = (logId, key, value) => {
    setBlindForms((prev) => ({ ...prev, [logId]: { ...getBlindForm(logId), [key]: value } }));
  };

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

  const fetchSosTickets = async () => {
    try {
      setSosLoading(true);
      const response = await workspaceService.getSosTickets();
      setSosTickets(response.data.data || []);
    } catch (err) {
      console.error('Error fetching SOS tickets:', err);
    } finally {
      setSosLoading(false);
    }
  };

  const handleResolveSos = async (ticketId) => {
    try {
      setResolvingId(ticketId);
      await workspaceService.resolveSosTicket(ticketId, { note: resolveNotes[ticketId] || '' });
      toast.success('SOS ticket resolved');
      setResolveNotes((prev) => ({ ...prev, [ticketId]: '' }));
      fetchSosTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve SOS');
    } finally {
      setResolvingId(null);
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
      correctionReason: adjustForm.correctionReason,
    });
  };

  const handleBlindSubmit = async (logId) => {
    const form = getBlindForm(logId);
    try {
      await workspaceService.submitBlindEstimate(logId, {
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carb: parseFloat(form.carb) || 0,
        fat: parseFloat(form.fat) || 0,
      });
      setBlindRevealed((prev) => ({ ...prev, [logId]: true }));
      toast.success('Blind estimate saved — AI/DB revealed');
      fetchPendingLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save blind estimate');
    }
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

      {ptRblStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
            <p className="text-[10px] font-bold text-indigo-600 uppercase">Your reviews (30d)</p>
            <p className="text-xl font-black text-indigo-900">{ptRblStats.totalReviewed}</p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
            <p className="text-[10px] font-bold text-indigo-600 uppercase">CV labeled</p>
            <p className="text-xl font-black text-indigo-900">{ptRblStats.totalLabeledCv}</p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
            <p className="text-[10px] font-bold text-indigo-600 uppercase">MAE AI (kcal)</p>
            <p className="text-xl font-black text-indigo-900">{ptRblStats.maeAiCalories ?? '—'}</p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
            <p className="text-[10px] font-bold text-indigo-600 uppercase">Adjust rate</p>
            <p className="text-xl font-black text-indigo-900">{ptRblStats.adjustRate != null ? `${Math.round(ptRblStats.adjustRate * 100)}%` : '—'}</p>
          </div>
        </div>
      )}

      {/* SOS Tickets */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-amber-900">Client SOS Requests</h2>
            <p className="text-sm text-amber-700/80">Assigned tickets requiring your response.</p>
          </div>
          <Button onClick={fetchSosTickets} variant="outline" size="sm" className="bg-white border-amber-200 text-amber-800 rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-1 ${sosLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        {sosLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl bg-amber-100/50" />
        ) : sosTickets.filter(t => t.status !== 'RESOLVED').length === 0 ? (
          <p className="text-sm text-amber-700/70 font-medium">No open SOS tickets.</p>
        ) : (
          <div className="space-y-3">
            {sosTickets.filter(t => t.status !== 'RESOLVED').map(ticket => (
              <div key={ticket.id} className="bg-white border border-amber-100 rounded-2xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{ticket.customerName || 'Client'}</p>
                    <p className="text-xs text-slate-500 mt-1">{ticket.note}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">{ticket.status}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResolveSos(ticket.id)}
                    disabled={resolvingId === ticket.id}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 text-xs shrink-0"
                  >
                    Resolve
                  </Button>
                </div>
                <input
                  type="text"
                  placeholder="Optional note to client..."
                  value={resolveNotes[ticket.id] || ''}
                  onChange={(e) => setResolveNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                  className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-400"
                />
              </div>
            ))}
          </div>
        )}
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
                            {log.mealSource && ` • ${log.mealSource === 'HOME_COOKED' ? 'Tự nấu' : 'Ăn ngoài'}`}
                          </p>
                          {(!blindMode[log.id] || blindRevealed[log.id] || log.blindSubmitted) && (log.restaurantName || log.aiConfidenceScore != null) && (
                            <p className="text-xs text-slate-500 mt-1">
                              {log.restaurantName && <span>📍 {log.restaurantName}</span>}
                              {log.aiConfidenceScore != null && (
                                <span className="ml-2">AI confidence: {Math.round(log.aiConfidenceScore * 100)}%</span>
                              )}
                              {log.recognitionSource && <span className="ml-2">Source: {log.recognitionSource}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <p className="text-slate-800 font-bold text-lg capitalize flex-1">{log.foodDescription || 'Meal Log'}</p>
                        {(!blindMode[log.id] || blindRevealed[log.id] || log.blindSubmitted) && log.experimentCohort && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{log.experimentCohort}</span>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setBlindMode((p) => ({ ...p, [log.id]: !p[log.id] }))} className="text-xs h-7 rounded-lg">
                          {blindMode[log.id] ? 'Exit blind' : 'Blind mode'}
                        </Button>
                      </div>

                      {blindMode[log.id] && !blindRevealed[log.id] && !log.blindSubmitted ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
                          <p className="text-xs font-bold text-amber-800 mb-3">Step 1: Estimate macros without seeing AI/DB</p>
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {['calories', 'protein', 'carb', 'fat'].map((k) => (
                              <input key={k} type="number" placeholder={k} value={getBlindForm(log.id)[k]} onChange={(e) => setBlindField(log.id, k, e.target.value)} className="px-2 py-1.5 border border-amber-200 rounded-lg text-xs" />
                            ))}
                          </div>
                          <Button size="sm" onClick={() => handleBlindSubmit(log.id)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg h-8 text-xs">Save & reveal AI/DB</Button>
                        </div>
                      ) : (
                        <>
                        <div className="grid grid-cols-3 gap-3 mb-2">
                          <MacroCol label="AI Prediction" macros={log.aiPredictedMacros} color="bg-purple-50 border-purple-100" />
                          <MacroCol label="DB/Hybrid" macros={log.dbMatchedMacros} color="bg-emerald-50 border-emerald-100" />
                          <MacroCol label="Shown to client" macros={log.macrosJson} color="bg-white border-slate-200" />
                        </div>
                        {(log.modelVersion || log.matchedFoodName) && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {log.modelVersion && <>Model: {log.modelVersion}</>}
                          {log.matchedFoodName && <> • DB match: {log.matchedFoodName} (score {log.dbMatchScore ?? 'N/A'})</>}
                        </p>
                      )}
                        </>
                      )}
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
                        <div className="mb-3">
                          <label className="text-[10px] font-extrabold text-blue-700 uppercase">Correction reason</label>
                          <select value={adjustForm.correctionReason} onChange={(e) => setAdjustForm({...adjustForm, correctionReason: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm">
                            {CORRECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
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
                      <select
                        className="text-xs border border-slate-200 rounded-xl px-2 h-10"
                        defaultValue="OTHER"
                        id={`reject-reason-${log.id}`}
                      >
                        {CORRECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <Button variant="outline" onClick={() => handleReview(log.id, 'REJECT', { correctionReason: document.getElementById(`reject-reason-${log.id}`)?.value || 'OTHER' })} disabled={actionLoading === log.id} className="text-red-600 border-red-200 hover:bg-red-50 bg-white rounded-xl h-10 px-4">
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