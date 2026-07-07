// src/pages/pt/PtMealPlanPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowLeft, Utensils } from 'lucide-react';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const MEAL_LABEL = { BREAKFAST: 'Sáng', LUNCH: 'Trưa', DINNER: 'Tối', SNACK: 'Phụ' };
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const emptyItem = (date, mealType = 'LUNCH') => ({
  planDate: date,
  mealType,
  foodCode: '',
  freeText: '',
  portionGrams: 350,
  note: '',
});

function weekDays(weekStart) {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function PtMealPlanPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [prefWarnCodes, setPrefWarnCodes] = useState(new Set());
  const [pendingSuggestions, setPendingSuggestions] = useState([]);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  useEffect(() => {
    (async () => {
      try {
        const res = await workspaceService.getClientMealPlan(clientId);
        const data = res.data.data;
        if (data?.plan) {
          setWeekStart(data.plan.weekStart || weekStart);
          setNotes(data.plan.notes || '');
        }
        if (data?.items?.length) {
          setItems(data.items.map((i) => ({
            planDate: i.planDate,
            mealType: i.mealType,
            foodCode: i.foodCode || '',
            freeText: i.freeText || '',
            portionGrams: i.portionGrams || 350,
            note: i.note || '',
          })));
        }
        if (data?.dietPrefWarnings?.length) {
          setPrefWarnCodes(new Set(data.dietPrefWarnings.map((w) => w.foodCode).filter(Boolean)));
        } else {
          setPrefWarnCodes(new Set());
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    workspaceService.getPendingMealPlanSuggestions(clientId)
      .then((res) => setPendingSuggestions(res.data.data || []))
      .catch(() => setPendingSuggestions([]));
  }, [clientId]);

  const refreshSuggestions = async () => {
    try {
      const res = await workspaceService.getPendingMealPlanSuggestions(clientId);
      setPendingSuggestions(res.data.data || []);
    } catch {
      setPendingSuggestions([]);
    }
  };

  const cellKey = (date, mealType) => `${date}|${mealType}`;

  const itemsForCell = (date, mealType) =>
    items.filter((it) => it.planDate === date && it.mealType === mealType);

  const addToCell = (date, mealType) => {
    const key = cellKey(date, mealType);
    setEditingKey(key);
    const existing = itemsForCell(date, mealType);
    if (existing.length === 0) {
      setItems((prev) => [...prev, emptyItem(date, mealType)]);
    }
  };

  const updateItemAt = (globalIdx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === globalIdx ? { ...it, [field]: value } : it)));
  };

  const removeItemAt = (globalIdx) => {
    setItems((prev) => prev.filter((_, i) => i !== globalIdx));
    setEditingKey(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        clientId,
        weekStart,
        notes,
        items: items.filter((i) => i.foodCode || i.freeText),
      };
      let res;
      try {
        res = await workspaceService.updateMealPlan(clientId, payload);
      } catch {
        res = await workspaceService.createMealPlan(payload);
      }
      const result = res.data.data;
      if (result?.allergyWarnings?.length) {
        toast.warning(`Cảnh báo dị ứng: ${result.allergyWarnings.length} món`);
      }
      if (result?.dietPrefWarnings?.length) {
        setPrefWarnCodes(new Set(result.dietPrefWarnings.map((w) => w.foodCode).filter(Boolean)));
        toast.warning(`!PREF: ${result.dietPrefWarnings.length} món không khớp chế độ ăn client`);
      } else {
        setPrefWarnCodes(new Set());
      }
      if (result?.macroWarning) {
        toast.warning(result.macroWarning);
      }
      toast.success('Đã lưu thực đơn tuần');
      setEditingKey(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu thực đơn');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      <button type="button" onClick={() => navigate('/pt/clients')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      <div className="flex items-center gap-3">
        <Utensils className="w-8 h-8 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thực đơn tuần</h1>
          <p className="text-sm text-slate-500">Lưới 7 ngày — UI-11</p>
        </div>
      </div>

      {pendingSuggestions.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <p className="text-sm font-bold text-slate-600">Đề nghị thay món chờ duyệt</p>
            {pendingSuggestions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-violet-50 border border-violet-100">
                <span>{s.suggestedFoodName} {s.suggestedGram ? `(${s.suggestedGram}g)` : ''}</span>
                <div className="flex gap-1">
                  <Button size="sm" onClick={async () => {
                    try {
                      await workspaceService.reviewMealPlanSuggestion(s.id, { action: 'APPROVE' });
                      toast.success('Đã duyệt');
                      refreshSuggestions();
                      const res = await workspaceService.getClientMealPlan(clientId);
                      const data = res.data.data;
                      if (data?.items?.length) {
                        setItems(data.items.map((i) => ({
                          planDate: i.planDate,
                          mealType: i.mealType,
                          foodCode: i.foodCode || '',
                          freeText: i.freeText || '',
                          portionGrams: i.portionGrams || 350,
                          note: i.note || '',
                        })));
                      }
                    } catch { toast.error('Lỗi duyệt'); }
                  }}>Duyệt</Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      await workspaceService.reviewMealPlanSuggestion(s.id, { action: 'REJECT' });
                      toast.success('Đã từ chối');
                      refreshSuggestions();
                    } catch { toast.error('Lỗi'); }
                  }}>Từ chối</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tuần bắt đầu</label>
              <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Ghi chú</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-2 text-left text-xs font-bold text-slate-500 w-20">Bữa</th>
                  {days.map((d, i) => (
                    <th key={d} className="p-2 text-center text-xs font-bold text-slate-600">
                      <div>{DAY_LABELS[i]}</div>
                      <div className="text-[10px] font-normal text-slate-400">{d.slice(5)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map((mealType) => (
                  <tr key={mealType} className="border-t border-slate-100">
                    <td className="p-2 align-top font-semibold text-slate-700 text-xs">{MEAL_LABEL[mealType]}</td>
                    {days.map((date) => {
                      const cellItems = itemsForCell(date, mealType);
                      const key = cellKey(date, mealType);
                      const isEditing = editingKey === key;
                      return (
                        <td key={key} className="p-1 align-top border-l border-slate-50 min-w-[100px]">
                          <div className="space-y-1 min-h-[64px]">
                            {cellItems.map((item) => {
                              const globalIdx = items.indexOf(item);
                              return (
                                <div key={globalIdx} className="rounded-lg bg-emerald-50/80 border border-emerald-100 p-1.5 text-[10px]">
                                  {isEditing ? (
                                    <div className="space-y-1">
                                      <input placeholder="foodCode" value={item.foodCode}
                                        onChange={(e) => updateItemAt(globalIdx, 'foodCode', e.target.value)}
                                        className="w-full rounded border border-slate-200 px-1 py-0.5" />
                                      <input placeholder="Tên món" value={item.freeText}
                                        onChange={(e) => updateItemAt(globalIdx, 'freeText', e.target.value)}
                                        className="w-full rounded border border-slate-200 px-1 py-0.5" />
                                      <input type="number" value={item.portionGrams}
                                        onChange={(e) => updateItemAt(globalIdx, 'portionGrams', Number(e.target.value))}
                                        className="w-full rounded border border-slate-200 px-1 py-0.5" />
                                      <button type="button" onClick={() => removeItemAt(globalIdx)}
                                        className="text-red-500 flex items-center gap-0.5">
                                        <Trash2 className="w-3 h-3" /> Xóa
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setEditingKey(key)} className="text-left w-full">
                                      <p className="font-semibold text-slate-800 truncate">
                                        {item.freeText || item.foodCode || 'Món'}
                                        {item.foodCode && prefWarnCodes.has(item.foodCode) && (
                                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.5 rounded ml-1">!PREF</span>
                                        )}
                                      </p>
                                      <p className="text-slate-500">{item.portionGrams}g</p>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <button type="button" onClick={() => addToCell(date, mealType)}
                              className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 text-[10px]">
                              <Plus className="w-3 h-3" /> Thêm
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="button" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu thực đơn'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
