<<<<<<< HEAD
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';
import { Check, X, Sliders, RefreshCw, Clock, AlertTriangle, Star } from 'lucide-react';

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
        action === 'APPROVE' ? 'Log approved' :
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
      adjustedCarb: macros.carbs || 0,
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

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'BREAKFAST': return '🌅';
      case 'LUNCH': return '☀️';
      case 'DINNER': return '🌙';
      case 'SNACK': return '🍎';
      default: return '🍽️';
    }
  };

  if (loading) return <Spinner />;
=======
// // src/pages/pt/ReviewDietLogPage.jsx
// import { useState } from 'react';
// import Card from '../../components/common/Card';
// import Badge from '../../components/common/Badge';
// import Button from '../../components/common/Button';

// export default function ReviewDietLogPage() {
//   const [logs] = useState([
//     { id: 1, client: 'Alice Smith', meal: 'Lunch', food: 'Grilled chicken salad', time: '12:30 PM', calories: 450, protein: 35, status: 'PT_REVIEWING' },
//     { id: 2, client: 'Bob Johnson', meal: 'Dinner', food: 'Pasta with meat sauce', time: '7:00 PM', calories: 720, protein: 28, status: 'PT_REVIEWING' },
//   ]);

//   return (
//     <div className="space-y-6">
//       <h1 className="text-2xl font-bold text-gray-900">Review Diet Logs</h1>
//       <div className="space-y-4">
//         {logs.map((log) => (
//           <Card key={log.id}>
//             <div className="flex gap-6">
//               <div className="w-48 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
//                 [Meal Image]
//               </div>
//               <div className="flex-1">
//                 <div className="flex items-center gap-2 mb-2">
//                   <h3 className="font-semibold text-gray-900">{log.client}</h3>
//                   <Badge>{log.meal}</Badge>
//                   <Badge variant="warning">{log.time}</Badge>
//                 </div>
//                 <p className="text-gray-700">{log.food}</p>
//                 <div className="flex gap-4 mt-2 text-sm text-gray-600">
//                   <span>Calories: {log.calories} kcal</span>
//                   <span>Protein: {log.protein}g</span>
//                 </div>
//                 <div className="flex gap-2 mt-4">
//                   <Button variant="success" size="sm">Approve</Button>
//                   <Button variant="outline" size="sm">Adjust Macros</Button>
//                   <Button variant="ghost" size="sm">Reject</Button>
//                 </div>
//               </div>
//             </div>
//           </Card>
//         ))}
//       </div>
//     </div>
//   );
// }

// src/pages/pt/ReviewDietLogPage.jsx
import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle2, XCircle, SlidersHorizontal, Clock, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewDietLogPage() {
  const [logs, setLogs] = useState([
    { id: 1, client: 'Alice Smith', meal: 'LUNCH', food: 'Grilled chicken salad with olive oil', time: '12:30 PM', calories: 450, protein: 35, carb: 12, fat: 22, status: 'PT_REVIEWING', imageUrl: null },
    { id: 2, client: 'Bob Johnson', meal: 'DINNER', food: 'Pasta with meat sauce and garlic bread', time: '7:00 PM', calories: 820, protein: 28, carb: 95, fat: 35, status: 'PT_REVIEWING', imageUrl: null },
  ]);
>>>>>>> feature/premium-ui-revamp

  const handleAction = (id, action) => {
    toast.success(`Log ${action.toLowerCase()} successfully`);
    setLogs(logs.filter(log => log.id !== id));
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Diet Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {logs.length > 0
              ? `${logs.length} pending log${logs.length > 1 ? 's' : ''} to review`
              : 'All caught up!'}
          </p>
        </div>
        <button
          onClick={fetchPendingLogs}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {logs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-1">No pending diet logs to review.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="p-5">
              <div className="flex gap-5">
                {log.imageUrl && (
                  <div className="w-32 h-32 flex-shrink-0">
                    <img
                      src={log.imageUrl}
                      alt="Meal"
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getMealIcon(log.mealType)}</span>
                    <Badge variant="outline">{log.mealType}</Badge>
                    {log.sosTicketFlag && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SOS
                      </Badge>
                    )}
                    {log.status === 'PT_REVIEWING' && (
                      <Badge variant="warning" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending Review
                      </Badge>
                    )}
                  </div>

                  <p className="font-medium text-gray-900 mb-1">
                    {log.foodDescription || 'Meal'}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">
                    {log.customerName} &middot;{' '}
                    {log.logDate
                      ? new Date(log.logDate).toLocaleDateString()
                      : 'Today'}
                  </p>

                  {log.macrosJson && (
                    <div className="flex flex-wrap gap-3 mb-3">
                      <span className="text-sm">
                        <span className="text-gray-500">Cal:</span>{' '}
                        <span className="font-medium">{log.macrosJson.calories || 0}</span>
                      </span>
                      <span className="text-sm">
                        <span className="text-gray-500">P:</span>{' '}
                        <span className="font-medium">{log.macrosJson.protein || 0}g</span>
                      </span>
                      <span className="text-sm">
                        <span className="text-gray-500">C:</span>{' '}
                        <span className="font-medium">{log.macrosJson.carbs || log.macrosJson.carb || 0}g</span>
                      </span>
                      <span className="text-sm">
                        <span className="text-gray-500">F:</span>{' '}
                        <span className="font-medium">{log.macrosJson.fat || 0}g</span>
                      </span>
                    </div>
                  )}

                  {log.additionalImages && log.additionalImages.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {log.additionalImages.map((img) => (
                        <img
                          key={img.id}
                          src={img.imageUrl}
                          alt="Additional"
                          className="w-12 h-12 object-cover rounded border border-gray-200"
                        />
                      ))}
                    </div>
                  )}

                  {adjustingLog === log.id ? (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700">Adjust Macros</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { key: 'adjustedCalories', label: 'Calories', suffix: '' },
                          { key: 'adjustedProtein', label: 'Protein', suffix: 'g' },
                          { key: 'adjustedCarb', label: 'Carbs', suffix: 'g' },
                          { key: 'adjustedFat', label: 'Fat', suffix: 'g' },
                        ].map(({ key, label, suffix }) => (
                          <div key={key}>
                            <label className="text-xs text-gray-500">{label}</label>
                            <input
                              type="number"
                              value={adjustForm[key]}
                              onChange={(e) => setAdjustForm(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Add a note..."
                        value={adjustForm.note}
                        onChange={(e) => setAdjustForm(prev => ({ ...prev, note: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAdjustSubmit(log.id)}
                          loading={actionLoading === log.id}
                        >
                          <Check className="w-4 h-4 mr-1" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setAdjustingLog(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleReview(log.id, 'APPROVE')}
                        disabled={actionLoading === log.id}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {actionLoading === log.id ? '...' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAdjust(log)}
                        disabled={actionLoading === log.id}
                      >
                        <Sliders className="w-4 h-4 mr-1" />
                        Adjust Macros
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReview(log.id, 'REJECT')}
                        disabled={actionLoading === log.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {actionLoading === log.id ? '...' : 'Reject'}
                      </Button>
                    </div>
                  )}
=======
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review Diet Logs</h1>
          <p className="text-slate-500 mt-1 font-medium">You have {logs.length} pending logs from your clients requiring your review.</p>
        </div>
      </div>

      {logs.length === 0 ? (
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
                  {/* Status Badge Over Image */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-slate-200/50">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Pending Review</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-300">
                          {getInitials(log.client)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 leading-tight">{log.client}</h3>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">{log.meal} • {log.time}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-slate-800 font-bold text-lg capitalize mb-5">{log.food}</p>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Cals</p>
                          <p className="font-black text-slate-800 text-lg">{log.calories}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Protein</p>
                          <p className="font-black text-blue-600 text-lg">{log.protein}g</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Carbs</p>
                          <p className="font-black text-amber-500 text-lg">{log.carb}g</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Fat</p>
                          <p className="font-black text-red-500 text-lg">{log.fat}g</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
                    <Button variant="outline" onClick={() => handleAction(log.id, 'Rejected')} className="text-red-600 border-red-200 hover:bg-red-50 bg-white rounded-xl h-10 px-4">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button variant="outline" onClick={() => handleAction(log.id, 'Adjusted')} className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white rounded-xl h-10 px-4">
                      <SlidersHorizontal className="w-4 h-4 mr-2" /> Adjust Macros
                    </Button>
                    <Button onClick={() => handleAction(log.id, 'Approved')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 px-6 shadow-sm shadow-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Log
                    </Button>
                  </div>
>>>>>>> feature/premium-ui-revamp
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}