import { useState, useEffect, useRef } from 'react';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import Badge from '../../components/ui/badge';
import Spinner from '../../components/common/Spinner';
import { dietService } from '../../services/dietService';
import { userService } from '../../services/userService';
import { toast } from 'sonner';
import { Upload, Camera, FileText, AlertTriangle, RefreshCw, Trash2, Check, Clock, X } from 'lucide-react';

export default function DietTrackerPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const fileInputRef = useRef(null);

  // Manual form state
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
      // Merge macro targets from user profile
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
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error('File too large. Maximum size is 500KB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await dietService.analyzeMeal(formData);
      toast.success('Meal analyzed successfully!');
      
      // Refresh data
      fetchData();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error analyzing meal:', err);
      toast.error(err.response?.data?.message || 'Failed to analyze meal');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualFood) {
      toast.error('Please enter food name');
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
      setShowManualForm(false);
      resetManualForm();
      fetchData();
    } catch (err) {
      console.error('Error creating log:', err);
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
      console.error('Error deleting log:', err);
      toast.error('Failed to delete log');
    }
  };

  const resetManualForm = () => {
    setManualFood('');
    setManualMealType('LUNCH');
    setManualCalories('');
    setManualProtein('');
    setManualCarb('');
    setManualFat('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success" className="flex items-center gap-1"><Check className="w-3 h-3" /> Approved</Badge>;
      case 'PENDING_AI':
      case 'PT_REVIEWING':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="flex items-center gap-1"><X className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateProgress = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min(100, (current / target) * 100);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Diet Tracker</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Card */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Log Your Meal</h3>
          
          {!showManualForm ? (
            <>
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Upload a photo of your meal</p>
                <p className="text-sm text-gray-400 mt-1">Image should be less than 500KB</p>
                {selectedFile && (
                  <p className="mt-2 text-sm text-green-600 font-medium">{selectedFile.name}</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleAnalyze}
                  disabled={!selectedFile || analyzing}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowManualForm(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Manual Entry
                </Button>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-700">Having trouble estimating? Create an SOS ticket and your PT will help.</p>
              </div>
            </>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
                <select
                  value={manualMealType}
                  onChange={(e) => setManualMealType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                  <option value="SNACK">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Name</label>
                <input
                  type="text"
                  value={manualFood}
                  onChange={(e) => setManualFood(e.target.value)}
                  placeholder="e.g., Grilled chicken salad"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                  <input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="kcal"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value)}
                    placeholder="g"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={manualCarb}
                    onChange={(e) => setManualCarb(e.target.value)}
                    placeholder="g"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={manualFat}
                    onChange={(e) => setManualFat(e.target.value)}
                    placeholder="g"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Saving...' : 'Save Entry'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowManualForm(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Summary Card */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Today's Summary</h3>
          <div className="space-y-4">
            {[
              { label: 'Calories', current: summary?.totalCalories || 0, target: summary?.targetCalories || 2000, color: 'bg-orange-500', unit: 'kcal' },
              { label: 'Protein', current: summary?.totalProtein || 0, target: summary?.targetProtein || 120, color: 'bg-red-500', unit: 'g' },
              { label: 'Carbs', current: summary?.totalCarbs || 0, target: summary?.targetCarbs || 200, color: 'bg-yellow-500', unit: 'g' },
              { label: 'Fat', current: summary?.totalFat || 0, target: summary?.targetFat || 65, color: 'bg-green-500', unit: 'g' },
            ].map((macro) => (
              <div key={macro.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{macro.label}</span>
                  <span className="text-gray-500">{macro.current}{macro.unit} / {macro.target}{macro.unit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${macro.color} h-2 rounded-full transition-all`}
                    style={{ width: `${calculateProgress(macro.current, macro.target)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Logs</h3>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No diet logs yet. Start by logging a meal!</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge>{log.mealType}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {log.foods?.map(f => f.name).join(', ') || 'Meal'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime(log.loggedAt)} - {log.totalCalories || 0} kcal
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(log.status)}
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
