// src/pages/customer/DietTrackerPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { dietService } from '../../services/dietService';
import { userService } from '../../services/userService';
import { toast } from 'sonner';
import { Upload, Camera, FileText, AlertTriangle, RefreshCw, Trash2, CheckCircle2, Clock, XCircle, Activity, Sparkles, Keyboard, Star, X, MessageSquare, Send } from 'lucide-react';

export default function DietTrackerPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Tab Mode: 'ai' or 'manual'
  const [inputMode, setInputMode] = useState('ai');
  const fileInputRef = useRef(null);

  // Manual form state
  const [manualFood, setManualFood] = useState('');
  const [manualMealType, setManualMealType] = useState('LUNCH');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');
  
  // SOS Ticket State
  const [showSosForm, setShowSosForm] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [sosSubmitting, setSosSubmitting] = useState(false);

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
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 500 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 500KB.`);
        return false;
      }
      return true;
    });
    setSelectedFiles(validFiles);
  };

  const handleAnalyze = async (e) => {
    e.stopPropagation();
    if (!selectedFiles.length) {
      toast.error('Please select at least one image');
      return;
    }
    try {
      setAnalyzing(true);
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));

      await dietService.analyzeMeal(formData);
      toast.success('Meal analyzed successfully!');
      fetchData();
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const handleUploadAdditionalImages = async (logId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      const validFiles = files.filter(file => {
        if (file.size > 500 * 1024) {
          toast.error(`${file.name} is too large. Max 500KB.`);
          return false;
        }
        return true;
      });
      if (!validFiles.length) return;

      try {
        setUploading(true);
        const formData = new FormData();
        validFiles.forEach((file) => formData.append('files', file));
        await dietService.uploadImages(logId, formData);
        toast.success('Images uploaded successfully!');
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload images');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSetPrimary = async (logId, imageId) => {
    try {
      await dietService.setPrimaryImage(logId, imageId);
      toast.success('Primary image updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDeleteImage = async (logId, imageId) => {
    try {
      await dietService.deleteImage(logId, imageId);
      toast.success('Image deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleSosSubmit = async (e) => {
    e.preventDefault();
    if (!sosMessage.trim()) return toast.error('Please enter a message');
    try {
      setSosSubmitting(true);
      await dietService.createSos({ message: sosMessage });
      toast.success('SOS Ticket Created!');
      setShowSosForm(false);
      setSosMessage('');
    } catch (error) {
      toast.error('Failed to create SOS ticket');
    } finally {
      setSosSubmitting(false);
    }
  };

  const calculateProgress = (current, target) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
  };

  const renderLogImages = (log) => {
    const images = [
      { url: log.imageUrl, isPrimary: true, id: null },
      ...(log.additionalImages || []).map(img => ({ url: img.imageUrl, isPrimary: img.isPrimary, id: img.id })),
    ].filter(img => img.url);

    if (images.length === 0) return null;

    return (
      <div className="flex gap-2 mt-4 flex-wrap">
        {images.map((img, idx) => (
          <div key={img.id || `primary-${idx}`} className="relative group">
            <img
              src={img.url}
              alt="meal"
              className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
              loading="lazy"
            />
            {img.isPrimary && (
              <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 rounded-full p-1 shadow-sm">
                <Star className="w-3 h-3 fill-current" />
              </div>
            )}
            {img.id && (
              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => handleSetPrimary(log.id, img.id)} className="bg-amber-500 text-white rounded-full p-1.5 hover:bg-amber-600 shadow-sm" title="Set Primary"><Star className="w-3 h-3" /></button>
                <button onClick={() => handleDeleteImage(log.id, img.id)} className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-sm" title="Delete"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

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
              
              <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-max mb-8 border border-slate-200/50">
                <button onClick={() => setInputMode('ai')} className={`flex-1 sm:w-40 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Sparkles className="w-4 h-4" /> AI Snapshot</button>
                <button onClick={() => setInputMode('manual')} className={`flex-1 sm:w-40 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Keyboard className="w-4 h-4" /> Manual Entry</button>
              </div>

              {inputMode === 'ai' ? (
                <div 
                  className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                  <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-100"><Camera className="w-8 h-8 text-blue-500" /></div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800">Upload Meal Photo</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">Drag & drop or click to browse. Select one or more images.</p>

                  {selectedFiles.length > 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap justify-center gap-2">
                        {selectedFiles.map((file, idx) => (
                          <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-bold border border-blue-100">{file.name}</span>
                        ))}
                      </div>
                      <Button onClick={handleAnalyze} disabled={analyzing} className="shadow-md bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12">
                        {analyzing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Process with AI'}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="bg-white border-slate-300 text-slate-700 pointer-events-none rounded-xl">Select Image</Button>
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
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Calories</label><input type="number" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} placeholder="kcal" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Protein</label><input type="number" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} placeholder="g" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Carbs</label><input type="number" value={manualCarb} onChange={(e) => setManualCarb(e.target.value)} placeholder="g" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fat</label><input type="number" value={manualFat} onChange={(e) => setManualFat(e.target.value)} placeholder="g" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" /></div>
                  </div>
                  <Button type="submit" disabled={uploading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md px-8 h-12">
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
                    
                    <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm group">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => handleUploadAdditionalImages(log.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="Add Image">
                            <Upload className="w-5 h-5" />
                          </Button>
                          <Button variant="ghost" onClick={() => handleDelete(log.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Delete">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Render Images Section */}
                      {renderLogImages(log)}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Analytics & SOS */}
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
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 relative" style={{ width: `${calculateProgress(summary?.totalCalories, summary?.targetCalories)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MacroRing label="Protein" current={summary?.totalProtein} target={summary?.targetProtein || 120} colorClass="stroke-blue-500" />
                <MacroRing label="Carbs" current={summary?.totalCarbs} target={summary?.targetCarbs || 200} colorClass="stroke-amber-500" />
                <MacroRing label="Fat" current={summary?.totalFat} target={summary?.targetFat || 65} colorClass="stroke-red-500" />
              </div>
            </CardContent>
          </Card>

          {/* SOS Section */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-3xl p-6 shadow-sm">
            <div className="flex gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-white border border-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 mb-1">SOS Request</h4>
                <p className="text-sm text-amber-700/80 font-medium">Not sure how to log your restaurant meal? Ask your PT for help.</p>
              </div>
            </div>
            
            {!showSosForm ? (
              <Button onClick={() => setShowSosForm(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm rounded-xl text-sm font-bold h-11">
                Create SOS Ticket
              </Button>
            ) : (
              <form onSubmit={handleSosSubmit} className="space-y-3 animate-fade-in bg-white p-4 rounded-2xl border border-amber-100 shadow-inner">
                <textarea
                  value={sosMessage}
                  onChange={(e) => setSosMessage(e.target.value)}
                  rows="3"
                  placeholder="Describe your meal or ask a question..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl" disabled={sosSubmitting}>
                    <Send className="w-4 h-4 mr-1.5" /> Send
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowSosForm(false)} className="rounded-xl border-slate-200">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}