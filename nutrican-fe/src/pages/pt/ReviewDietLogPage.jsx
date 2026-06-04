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

  return (
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
