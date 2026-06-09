// src/pages/customer/DietTrackerPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { dietService } from '../../services/dietService';
import { userService } from '../../services/userService';
import { toast } from 'sonner';
import { UploadCloud, Camera, FileText, AlertTriangle, RefreshCw, Trash2, CheckCircle2, Clock, XCircle, Activity, Sparkles, Keyboard } from 'lucide-react';

export default function DietTrackerPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Tab Mode: 'ai' or 'manual'
  const [inputMode, setInputMode] = useState('ai');
  const fileInputRef = useRef(null);

  // Manual form state restored
  const [manualFood, setManualFood] = useState('');
  const [manualMealType, setManualMealType] = useState('LUNCH');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, summaryRes, macroRes] = await Promise.all([
        dietService.getLogs({ page: 0, size: 10 }),
        dietService.getSummary(),
        userService.getMacroTarget().catch(() => ({ data: { data: null } })),
      ]);
      setLogs(logsRes.data.data.content || []);
      setSummary(summaryRes.data.data);
      if (macroRes.data.data) {
        setSummary(prev => ({
          ...prev,
          targetCalories: macroRes.data.data.dailyCalories,
          targetProtein: macroRes.data.data.protein,
          targetCarbs: macroRes.data.data.carbs,
          targetFat: macroRes.data.data.fat,
        }));
      }
    } catch (err) {
      console.error('Error fetching diet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error('File too large. Maximum size is 500KB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleAnalyze = async (e) => {
    e.stopPropagation();
    if (!selectedFile) return;
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      await dietService.analyzeMeal(formData);
      toast.success('AI Analysis Complete!', { description: 'Your meal has been logged successfully.' });
      fetchData();
      setSelectedFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to analyze meal');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualFood) {
      toast.error('Please enter a food name');
      return;
    }
    try {
      setUploading(true);
      await dietService.createLog({
        mealType: manualMealType,
        foods: [{
          name: manualFood,
          calories: parseFloat(manualCalories) || 0,
          protein: parseFloat(manualProtein) || 0,
          carbs: parseFloat(manualCarb) || 0,
          fat: parseFloat(manualFat) || 0,
        }],
      });
      toast.success('Meal logged successfully!');
      setManualFood(''); setManualCalories(''); setManualProtein(''); setManualCarb(''); setManualFat('');
      fetchData();
    } catch (err) {
      toast.error('Failed to log meal');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await dietService.deleteLog(logId);
      toast.success('Log deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const calculateProgress = (current, target) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
  };

  // Modern SVG Macro Ring Component
  const MacroRing = ({ label, current, target, colorClass }) => {
    const progress = calculateProgress(current || 0, target || 1);
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="relative w-20 h-20 mb-3">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} className="stroke-slate-200" strokeWidth="8" fill="transparent" />
            <circle cx="50" cy="50" r={radius} fill="transparent"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className={`transition-all duration-1000 ease-out ${colorClass}`}
              strokeWidth="8" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-sm font-bold text-slate-800">{Math.round(current || 0)}</span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-slate-400 mt-0.5">{target || 0}g target</span>
      </div>
    );
  };

  const StatusBadge = ({ status }) => {
    const map = {
      'APPROVED': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
      'PENDING_AI': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Activity },
      'PT_REVIEWING': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
      'REJECTED': { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    };
    const config = map[status] || { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Activity };
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status?.replace('_', ' ') || 'UNKNOWN'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Diet Tracker</h1>
          <p className="text-slate-500 mt-1 font-medium">Analyze meals instantly and hit your daily goals.</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Data
        </Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Logging & Timeline */}
        <div className="lg:col-span-8 space-y-8">
          
          <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
            <CardContent className="p-8">
              
              {/* Segmented Control (Tabs) */}
              <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-max mb-8 border border-slate-200/50">
                <button 
                  onClick={() => setInputMode('ai')}
                  className={`flex-1 sm:w-40 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sparkles className="w-4 h-4" /> AI Snapshot
                </button>
                <button 
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 sm:w-40 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Keyboard className="w-4 h-4" /> Manual Entry
                </button>
              </div>

              {/* Input Area */}
              {inputMode === 'ai' ? (
                <div 
                  className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer ${
                    dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  
                  <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-100">
                    <Camera className="w-8 h-8 text-blue-500" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-slate-800">Upload Meal Photo</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">
                    Drag & drop or click to browse. Nutrican AI will magically extract the macros for you.
                  </p>

                  {selectedFile ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <UploadCloud className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                          {selectedFile.name}
                        </span>
                      </div>
                      <Button onClick={handleAnalyze} disabled={analyzing} className="w-full sm:w-auto shadow-md bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                        {analyzing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Process with AI'}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="bg-white border-slate-300 text-slate-700 pointer-events-none rounded-xl">
                      Select Image
                    </Button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-5 animate-fade-in bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Meal Type</label>
                      <select value={manualMealType} onChange={(e) => setManualMealType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
                        <option value="BREAKFAST">Breakfast</option>
                        <option value="LUNCH">Lunch</option>
                        <option value="DINNER">Dinner</option>
                        <option value="SNACK">Snack</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Food Name</label>
                      <input type="text" value={manualFood} onChange={(e) => setManualFood(e.target.value)} placeholder="e.g. Avocado Toast" required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Calories</label>
                      <input type="number" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} placeholder="kcal" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Protein</label>
                      <input type="number" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} placeholder="g" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Carbs</label>
                      <input type="number" value={manualCarb} onChange={(e) => setManualCarb(e.target.value)} placeholder="g" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fat</label>
                      <input type="number" value={manualFat} onChange={(e) => setManualFat(e.target.value)} placeholder="g" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                  <Button type="submit" disabled={uploading} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md px-8 py-6">
                    {uploading ? 'Saving...' : 'Save Meal Entry'}
                  </Button>
                </form>
              )}

            </CardContent>
          </Card>

          {/* Timeline Logs */}
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> Today's Log
            </h3>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl bg-slate-200" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 border-dashed">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold">No meals logged today.</p>
                <p className="text-sm text-slate-400 mt-1">Your timeline will appear here.</p>
              </div>
            ) : (
              <div className="space-y-5 relative before:absolute before:inset-y-0 before:left-[23px] before:w-0.5 before:bg-slate-200">
                {logs.map((log, idx) => {
                  const logDate = new Date(log.loggedAt);
                  const displayTime = isNaN(logDate) ? '--' : `${logDate.getHours()}h`;
                  
                  return (
                  <div key={log.id} className="relative flex items-start gap-6 animate-slide-in" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="w-12 h-12 rounded-full bg-white border-[3px] border-blue-500 flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                      <span className="text-xs font-extrabold text-blue-600">{displayTime}</span>
                    </div>
                    
                    <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">{log.mealType}</span>
                          <StatusBadge status={log.status} />
                        </div>
                        <p className="text-lg font-bold text-slate-800 capitalize">
                          {log.foods?.map(f => f.name).join(', ') || 'Processing AI Data...'}
                        </p>
                        <div className="flex items-center gap-4 mt-2.5 text-sm font-semibold text-slate-600">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{log.totalCalories || 0} kcal</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{log.totalProtein || 0}g Pro</span>
                        </div>
                      </div>
                      
                      <Button variant="ghost" onClick={() => handleDelete(log.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Analytics */}
        <div className="lg:col-span-4 space-y-6">
          
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-400 w-full" />
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> Daily Target
              </h3>
              
              <div className="mb-8">
                <div className="flex justify-between items-end mb-2.5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Total Calories</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-800">{summary?.totalCalories || 0}</span>
                    <span className="text-sm font-semibold text-slate-400"> / {summary?.targetCalories || 2000}</span>
                  </div>
                </div>
                <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 relative"
                    style={{ width: `${calculateProgress(summary?.totalCalories, summary?.targetCalories)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MacroRing label="Protein" current={summary?.totalProtein} target={summary?.targetProtein || 120} colorClass="stroke-blue-500" delay="100ms" />
                <MacroRing label="Carbs" current={summary?.totalCarbs} target={summary?.targetCarbs || 200} colorClass="stroke-amber-500" delay="200ms" />
                <MacroRing label="Fat" current={summary?.totalFat} target={summary?.targetFat || 65} colorClass="stroke-red-500" delay="300ms" />
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-3xl p-6 flex gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-white border border-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1">SOS Request</h4>
              <p className="text-sm text-amber-700/80 mb-4 font-medium leading-relaxed">Not sure how to log your restaurant meal? Ask your PT for help.</p>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm rounded-xl text-sm font-bold">
                Create SOS Ticket
              </Button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}