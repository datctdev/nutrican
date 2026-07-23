import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceService } from '../../services/workspaceService';
import { dietService } from '../../services/dietService';
import {
  getPendingSelfPeriodsForDate,
  pickEffectivePlanItemsByPeriod,
  computePlanProgressBreakdown,
  MEAL_PERIOD_LABELS,
  formatMacroDisplay,
} from '../customer/components/dietUtils';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Save, Calendar as CalendarIcon, Copy, Loader2, AlertCircle, FileText, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import MealPlanDayView from '../../components/pt/meal-plan/MealPlanDayView';
import FoodSearchModal from '../../components/pt/meal-plan/FoodSearchModal';
import MealPlanSuggestionReviewList from '../../components/pt/meal-plan/MealPlanSuggestionReviewList';
import SelfPlanSubmissionReviewList from '../../components/pt/meal-plan/SelfPlanSubmissionReviewList';
import TemplateModal from '../../components/pt/meal-plan/TemplateModal';
import GroceryListModal from '../../components/pt/meal-plan/GroceryListModal';
import ClientDayTimelinePanel from '../../components/pt/ClientDayTimelinePanel';
import { preferMealPlanWeekStart, shiftCoachingOrMondayWeek } from '../../utils/coachingWeeks';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Thứ 2' },
  { id: 2, name: 'Thứ 3' },
  { id: 3, name: 'Thứ 4' },
  { id: 4, name: 'Thứ 5' },
  { id: 5, name: 'Thứ 6' },
  { id: 6, name: 'Thứ 7' },
  { id: 0, name: 'Chủ Nhật' },
];

function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toUiMealPlanItem(item, idx, foodsByCode) {
  const food = foodsByCode.get(String(item.foodCode || '').trim().toLowerCase());
  const baseServingSizeG = Number(food?.servingSizeG) || 100;
  const portionGrams = Number(item.portionGrams) || baseServingSizeG;
  const portionRatio = portionGrams / baseServingSizeG;
  const apiCal = Number(item.calories);
  const hasApiMacros = apiCal > 0 || Number(item.protein) > 0 || Number(item.carb) > 0 || Number(item.fat) > 0;
  const baseCalories = Number(food?.calories) || 0;
  const baseProtein = Number(food?.protein) || 0;
  const baseCarb = Number(food?.carb) || 0;
  const baseFat = Number(food?.fat) || 0;

  return {
    id: item.id,
    tempId: `api-${item.id || idx}-${Date.now()}`,
    planDate: item.planDate,
    mealType: item.mealType,
    foodCode: item.foodCode || '',
    freeText: item.freeText || '',
    nameVi: item.freeText || food?.nameVi || item.foodCode || 'Món ăn',
    portionGrams,
    baseServingSizeG,
    baseCalories: hasApiMacros ? apiCal / (portionRatio || 1) : baseCalories,
    baseProtein: hasApiMacros ? Number(item.protein) / (portionRatio || 1) : baseProtein,
    baseCarb: hasApiMacros ? Number(item.carb) / (portionRatio || 1) : baseCarb,
    baseFat: hasApiMacros ? Number(item.fat) / (portionRatio || 1) : baseFat,
    calcCalories: hasApiMacros ? Math.round(apiCal) : Math.round(baseCalories * portionRatio),
    calcProtein: hasApiMacros ? Math.round(Number(item.protein) || 0) : Math.round(baseProtein * portionRatio),
    calcCarb: hasApiMacros ? Math.round(Number(item.carb) || 0) : Math.round(baseCarb * portionRatio),
    calcFat: hasApiMacros ? Math.round(Number(item.fat) || 0) : Math.round(baseFat * portionRatio),
    note: item.note || '',
    eaten: item.eaten || false,
    lateTickReason: item.lateTickReason || '',
    mealPeriod: item.mealPeriod || null,
    sourceType: item.sourceType || 'PT_ORIGINAL',
  };
}

export default function PtMealPlanPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState(null);
  const [coachingStartedAt, setCoachingStartedAt] = useState(null);
  const [weekAnchorReady, setWeekAnchorReady] = useState(false);

  const [weekStart, setWeekStart] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [planId, setPlanId] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [prefWarnCodes, setPrefWarnCodes] = useState(new Set());
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [pendingSelfPlans, setPendingSelfPlans] = useState([]);
  const [clientIntake, setClientIntake] = useState(null);
  const [clientIntakeLoading, setClientIntakeLoading] = useState(false);
  const [clientTimeline, setClientTimeline] = useState(null);
  
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [targetMealType, setTargetMealType] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [groceryModalOpen, setGroceryModalOpen] = useState(false);

  const [prevClientId, setPrevClientId] = useState(clientId);
  const [prevWeekStart, setPrevWeekStart] = useState(weekStart);

  if (clientId !== prevClientId || weekStart !== prevWeekStart) {
    setPrevClientId(clientId);
    setPrevWeekStart(weekStart);
    setItems([]);
    setProfile(null);
    setPlanId(null);
    setIsPublished(false);
    setPrefWarnCodes(new Set());
    setNotes('');
  }

  const loadData = useCallback(async () => {
    if (!clientId || !weekStart) return;
    setLoading(true);
    try {
      const profileRes = await workspaceService.getClientProfile(clientId);
      setProfile(profileRes.data.data);

      try {
        const planRes = await workspaceService.getClientMealPlan(clientId, formatDate(weekStart));
        const data = planRes.data.data;
        if (data?.plan) {
          setPlanId(data.plan.id);
          setIsPublished(data.plan.isPublished || false);
          setNotes(data.plan.notes || '');
          
          if (data.items?.length) {
            const foodCodes = [...new Set(data.items.map((item) => item.foodCode).filter(Boolean))];
            const foodsByCode = new Map();
            if (foodCodes.length > 0) {
              try {
                const foodsRes = await dietService.getFoodsByCodes(foodCodes);
                (foodsRes.data.data || []).forEach((food) => {
                  if (food.foodCode) {
                    foodsByCode.set(String(food.foodCode).trim().toLowerCase(), food);
                  }
                  (food.aliases || []).forEach((alias) => {
                    foodsByCode.set(String(alias).trim().toLowerCase(), food);
                  });
                });
              } catch (error) {
                console.error('Không thể tải dinh dưỡng cho thực đơn:', error);
              }
            }

            const uiItems = data.items.map((item, idx) => toUiMealPlanItem(item, idx, foodsByCode));
            setItems(uiItems);
          } else {
            setItems([]);
          }
        } else {
          setPlanId(null);
          setIsPublished(false);
          setItems([]);
          setNotes('');
        }
        if (data?.dietPrefWarnings?.length) {
          setPrefWarnCodes(new Set(data.dietPrefWarnings.map((w) => w.foodCode).filter(Boolean)));
        } else {
          setPrefWarnCodes(new Set());
        }
      } catch {
        setPlanId(null);
        setIsPublished(false);
        setItems([]);
        setNotes('');
        setPrefWarnCodes(new Set());
      }

      workspaceService.getPendingMealPlanSuggestions(clientId)
        .then((res) => setPendingSuggestions(res.data.data || []))
        .catch(() => setPendingSuggestions([]));
      workspaceService.listSelfPlanSubmissions()
        .then((res) => {
          const all = res.data?.data || [];
          setPendingSelfPlans(all.filter((s) => String(s.customerId) === String(clientId)));
        })
        .catch(() => setPendingSelfPlans([]));
        
    } catch {
      toast.error('Lỗi khi tải dữ liệu học viên');
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart]);

  useEffect(() => {
    if (!weekAnchorReady || !weekStart) return undefined;
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [clientId, weekStart, weekAnchorReady, loadData]);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    setWeekAnchorReady(false);
    setCoachingStartedAt(null);
    workspaceService.getClients({ page: 0, size: 100, status: 'ACTIVE' })
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data?.content || [];
        const c = list.find((x) => String(x.clientId) === String(clientId));
        const started = c?.coachingStartedAt || null;
        setCoachingStartedAt(started);
        const next = preferMealPlanWeekStart(started);
        setWeekStart(next);
        setSelectedDate(formatDate(next));
        setWeekAnchorReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        const next = preferMealPlanWeekStart(null);
        setCoachingStartedAt(null);
        setWeekStart(next);
        setSelectedDate(formatDate(next));
        setWeekAnchorReady(true);
      });
    return () => { cancelled = true; };
  }, [clientId]);

  const loadClientIntake = useCallback(async () => {
    if (!clientId || !selectedDate) return;
    setClientIntakeLoading(true);
    try {
      const [dayPlanRes, summaryRes, timelineRes] = await Promise.all([
        workspaceService.getClientDayPlan(clientId, selectedDate),
        workspaceService.getClientDietSummary(clientId, selectedDate),
        workspaceService.getClientDayTimeline(clientId, selectedDate),
      ]);
      const dayItems = dayPlanRes.data?.data?.items || [];
      const summary = summaryRes.data?.data || {};
      setClientTimeline(timelineRes.data?.data || null);
      const breakdown = computePlanProgressBreakdown(dayItems, {
        dateIso: selectedDate,
        coachedMode: true,
      });
      const logCal = Number(summary.totalCalories) || 0;
      const logPro = Number(summary.totalProtein) || 0;
      const logCarb = Number(summary.totalCarbs) || 0;
      const logFat = Number(summary.totalFat) || 0;
      setClientIntake({
        consumed: {
          calories: logCal + (breakdown.compliance?.calories || 0),
          protein: logPro + (breakdown.compliance?.protein || 0),
          carb: logCarb + (breakdown.compliance?.carb || 0),
          fat: logFat + (breakdown.compliance?.fat || 0),
        },
        pending: breakdown.pending || {},
        logs: summary.logs || [],
      });
    } catch {
      setClientIntake(null);
      setClientTimeline(null);
    } finally {
      setClientIntakeLoading(false);
    }
  }, [clientId, selectedDate]);

  useEffect(() => {
    loadClientIntake();
  }, [loadClientIntake, items, pendingSelfPlans]);

  const refreshSuggestions = async () => {
    try {
      const res = await workspaceService.getPendingMealPlanSuggestions(clientId);
      setPendingSuggestions(res.data.data || []);
    } catch {
      setPendingSuggestions([]);
    }
    try {
      const res = await workspaceService.listSelfPlanSubmissions();
      const all = res.data?.data || [];
      setPendingSelfPlans(all.filter((s) => String(s.customerId) === String(clientId)));
    } catch {
      setPendingSelfPlans([]);
    }
    await loadClientIntake();
  };

  const weekDates = useMemo(() => {
    if (!weekStart) return [];
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(formatDate(d));
    }
    return dates;
  }, [weekStart]);

  const currentDayItems = useMemo(
    () => items.filter((i) => i.planDate === selectedDate),
    [items, selectedDate],
  );
  const pendingSelfPeriods = useMemo(
    () => getPendingSelfPeriodsForDate(pendingSelfPlans, selectedDate),
    [pendingSelfPlans, selectedDate],
  );
  const effectiveDayItems = useMemo(
    () => pickEffectivePlanItemsByPeriod(currentDayItems, { pendingSelfPeriods }),
    [currentDayItems, pendingSelfPeriods],
  );

  const handlePrevWeek = () => {
    const d = shiftCoachingOrMondayWeek(weekStart, -1, coachingStartedAt);
    setWeekStart(d);
    setSelectedDate(formatDate(d));
  };
  const handleNextWeek = () => {
    const d = shiftCoachingOrMondayWeek(weekStart, 1, coachingStartedAt);
    setWeekStart(d);
    setSelectedDate(formatDate(d));
  };

  const handleOpenSearch = (mealType) => {
    setTargetMealType(mealType);
    setSearchModalOpen(true);
  };

  const handleSelectFood = (food) => {
    const portionGrams = Number(food.servingSizeG) || 100;
    const newItem = {
      tempId: `new-${Date.now()}`,
      planDate: selectedDate,
      mealType: targetMealType,
      foodCode: food.foodCode || food.aliases?.[0] || food.nameEn || food.nameVi,
      foodItemId: food.id || null,
      nameVi: food.nameVi,
      freeText: food.nameVi,
      portionGrams: portionGrams,
      baseServingSizeG: 100,
      baseCalories: (Number(food.calories) / portionGrams) * 100 || 0,
      baseProtein: (Number(food.protein) / portionGrams) * 100 || 0,
      baseCarb: (Number(food.carb) / portionGrams) * 100 || 0,
      baseFat: (Number(food.fat) / portionGrams) * 100 || 0,
      calcCalories: Number(food.calories) || 0,
      calcProtein: Number(food.protein) || 0,
      calcCarb: Number(food.carb) || 0,
      calcFat: Number(food.fat) || 0,
    };
    setItems([...items, newItem]);
    setSearchModalOpen(false);
    toast.success(`Đã thêm ${food.nameVi}`);
  };

  const handleCopyPrevDay = async () => {
    const parts = selectedDate.split('-');
    const curr = new Date(parts[0], parts[1] - 1, parts[2]);
    curr.setDate(curr.getDate() - 1);
    
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const prevDateStr = `${yyyy}-${mm}-${dd}`;
    
    const prevItems = items.filter(i => i.planDate === prevDateStr);
    if (prevItems.length > 0) {
      const newCopied = prevItems.map((item, idx) => ({
        ...item,
        id: undefined,
        tempId: `copy-${Date.now()}-${idx}`,
        planDate: selectedDate,
        eaten: false,
      }));
      
      setItems([...items.filter(i => i.planDate !== selectedDate), ...newCopied]);
      toast.success('Đã sao chép thực đơn hôm qua!');
      return;
    }

    const prevWeekStartStr = formatDate(preferMealPlanWeekStart(coachingStartedAt, curr));
    try {
      const planRes = await workspaceService.getClientMealPlan(clientId, prevWeekStartStr);
      const data = planRes.data.data;
      if (data?.items?.length) {
        const fetchedPrevItems = data.items.filter(i => i.planDate === prevDateStr);
        if (fetchedPrevItems.length > 0) {
          const newCopied = fetchedPrevItems.map((item, idx) => ({
            tempId: `copy-api-${item.id || idx}-${Date.now()}`,
            planDate: selectedDate,
            mealType: item.mealType,
            foodCode: item.foodCode || '',
            nameVi: item.freeText || item.foodCode || 'Món ăn',
            portionGrams: item.portionGrams || 100,
            baseServingSizeG: 100,
            baseCalories: 0,
            baseProtein: 0,
            baseCarb: 0,
            baseFat: 0,
            calcCalories: 0,
            calcProtein: 0,
            calcCarb: 0,
            calcFat: 0,
            eaten: false,
          }));
          setItems([...items.filter(i => i.planDate !== selectedDate), ...newCopied]);
          toast.success('Đã sao chép thực đơn hôm qua từ tuần trước!');
          return;
        }
      }
      toast.error(`Ngày ${dd}/${mm}/${yyyy} không có thực đơn để sao chép!`);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải thực đơn ngày hôm qua.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        clientId,
        weekStart: formatDate(weekStart),
        notes,
        items: items.filter(i => i.foodCode || i.freeText).map(i => ({
          id: i.id,
          planDate: i.planDate,
          mealType: i.mealType,
          foodCode: i.foodCode,
          freeText: i.freeText ?? i.nameVi,
          portionGrams: i.portionGrams,
          note: i.note || ''
        }))
      };

      let res;
      if (planId) {
        res = await workspaceService.updateMealPlan(clientId, payload);
      } else {
        res = await workspaceService.createMealPlan(payload);
      }
      
      const result = res.data.data;

      if (result?.dietPrefWarnings?.length) {
        setPrefWarnCodes(new Set(result.dietPrefWarnings.map((w) => w.foodCode).filter(Boolean)));
        toast.warning(`Lưu ý: Có món không khớp chế độ ăn của học viên.`);
      } else {
        setPrefWarnCodes(new Set());
      }
      if (result?.macroWarning) {
        toast.warning(result.macroWarning);
      }
      
      toast.success('Đã lưu thực đơn thành công!');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi lưu thực đơn');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!planId) return;
    setSaving(true);
    try {
      await workspaceService.publishMealPlan(planId);
      toast.success('Đã gửi thực đơn cho học viên!');
      setIsPublished(true);
    } catch {
      toast.error('Lỗi khi chốt thực đơn');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async (templateId) => {
    await workspaceService.applyTemplateToClient(clientId, templateId, {
      weekStart: formatDate(weekStart)
    });
    loadData();
  };

  const handleSaveAsTemplate = async (templateData) => {
    const transformedItems = items.filter(i => i.foodCode || i.freeText).map(i => {
      const pDate = new Date(i.planDate);
      const wStart = new Date(weekStart);
      const diffTime = Math.abs(pDate - wStart);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        dayOffset: diffDays,
        mealType: i.mealType,
        foodCode: i.foodCode,
        freeText: i.freeText || i.nameVi,
        portionGrams: i.portionGrams
      };
    });

    await workspaceService.saveAsTemplate({
      name: templateData.name,
      description: templateData.description,
      items: transformedItems
    });
  };

  if (loading || !weekAnchorReady || !weekStart) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const dayCals = effectiveDayItems.reduce((acc, i) => acc + (i.calcCalories || 0), 0);
  const dayPro = effectiveDayItems.reduce((acc, i) => acc + (i.calcProtein || 0), 0);
  const dayCarb = effectiveDayItems.reduce((acc, i) => acc + (i.calcCarb || 0), 0);
  const dayFat = effectiveDayItems.reduce((acc, i) => acc + (i.calcFat || 0), 0);
  const consumedCals = clientIntake?.consumed?.calories ?? 0;
  const consumedPro = clientIntake?.consumed?.protein ?? 0;
  const consumedCarb = clientIntake?.consumed?.carb ?? 0;
  const consumedFat = clientIntake?.consumed?.fat ?? 0;
  const pendingPlanCals = clientIntake?.pending?.calories ?? 0;
  const pendingPeriodLabels = [...pendingSelfPeriods].map((p) => MEAL_PERIOD_LABELS[p] || p);
  
  const targetCals = profile?.tdee || 0;
  const targetPro = profile?.protein || 0;
  const targetCarb = profile?.carb || 0;
  const targetFat = profile?.fat || 0;

  const isOverCal = targetCals > 0 && consumedCals > targetCals * 1.1;

  const itemsWithWarnings = items.map(i => ({
    ...i,
    warning: prefWarnCodes.has(i.foodCode) ? true : false
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate('/pt/clients')} className="gap-2 mb-2 -ml-2 text-slate-500">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">Xây Dựng Thực Đơn</h1>
            {isPublished ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">Đã chốt</span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">Bản nháp</span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Học viên: <span className="text-blue-600 font-bold">{profile?.fullName}</span></p>
          {profile?.allergyNotes && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg max-w-lg">
              <p className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1">Cảnh báo dị ứng</p>
              <p className="text-sm text-red-700">{profile.allergyNotes}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateModalOpen(true)} className="rounded-xl border-slate-200 text-slate-700 bg-white shadow-sm hover:bg-slate-50 gap-2">
            <FileText className="w-4 h-4" /> Mẫu
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md gap-2 font-bold px-6">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={saving || !planId || isPublished} 
            className={`${isPublished ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded-xl shadow-md gap-2 font-bold px-6`}
          >
            Gửi cho học viên
          </Button>
        </div>
      </div>

      {pendingSelfPlans.length > 0 ? (
        <Card>
          <CardContent className="p-5">
            <SelfPlanSubmissionReviewList
              submissions={pendingSelfPlans}
              onUpdated={async () => {
                await refreshSuggestions();
                await loadData();
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-extrabold text-slate-800">Kế hoạch ngày đặc biệt chờ duyệt</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Chưa có buổi nào chờ duyệt — chỉ hiện khi học viên gửi đề xuất cho buổi <strong>chưa ăn</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {pendingSuggestions.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <MealPlanSuggestionReviewList
              suggestions={pendingSuggestions}
              onUpdated={async () => {
                await refreshSuggestions();
                await loadData();
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePrevWeek} className="rounded-xl border-slate-200 text-slate-600">&larr; Tuần trước</Button>
          <div className="flex items-center gap-2 text-slate-800 font-black">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            {coachingStartedAt ? 'Tuần coaching' : 'Tuần lịch'} {formatDate(weekStart)}
            {coachingStartedAt && (
              <span className="text-xs font-medium text-slate-400 ml-1">(neo ngày bắt đầu PT)</span>
            )}
          </div>
          <Button variant="outline" onClick={handleNextWeek} className="rounded-xl border-slate-200 text-slate-600">Tuần tới &rarr;</Button>
        </div>
        <div className="flex items-center gap-2">
          {isOverCal && (
             <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
               <AlertCircle className="w-4 h-4" /> Cảnh báo: Vượt 110% Calo mục tiêu
             </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setGroceryModalOpen(true)} 
            className="gap-2 rounded-xl text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold ml-2"
          >
            <ShoppingCart className="w-4 h-4" /> Danh sách đi chợ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 align-start items-start">
        <div className="lg:col-span-1 space-y-2">
          {weekDates.map((dObj) => {
            const dateStr = dObj;
            const dateLabel = new Date(dObj).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            const isSelected = selectedDate === dateStr;
            const hasItems = items.some(i => i.planDate === dateStr);
            const dayOfWeek = DAYS_OF_WEEK.find(dw => dw.id === new Date(dObj).getDay())?.name;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all font-bold ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div>
                  <div className="text-xs opacity-80">{dayOfWeek}</div>
                  <div className="text-base">{dateLabel}</div>
                </div>
                {hasItems && <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />}
              </button>
            );
          })}
          
          <div className="mt-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ghi chú chung cho tuần</label>
            <textarea
              className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú về chế độ ăn, tập luyện tuần này..."
            />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <UtensilsIcon className="w-32 h-32" />
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800">Thực đơn ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  <strong className="text-emerald-700">Học viên đã nạp</strong> đồng bộ với màn Diet — gồm nhật ký + tick tuân thủ PT.
                  {clientIntakeLoading && <span className="ml-1 text-slate-400">(đang tải…)</span>}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Kế hoạch PT còn lại (nếu ăn đúng thực đơn): <strong>{Math.round(dayCals)} kcal</strong>
                  {pendingPlanCals > 0 && (
                    <span> · học viên có thể nạp thêm <strong>{Math.round(pendingPlanCals)} kcal</strong> từ plan chưa tick</span>
                  )}
                </p>
                {pendingPeriodLabels.length > 0 && (
                  <p className="text-xs text-amber-700 font-semibold mt-1">
                    {pendingPeriodLabels.join(', ')}: có đề xuất chờ duyệt — PT gốc buổi đó chưa tính vào tổng.
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyPrevDay} className="gap-2 rounded-xl text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100">
                <Copy className="w-4 h-4" /> Sao chép hôm qua
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MacroProgressCard label="kcal" current={consumedCals} target={targetCals} unit="kcal" color="emerald" />
              <MacroProgressCard label="Protein" current={consumedPro} target={targetPro} unit="g" color="rose" />
              <MacroProgressCard label="Carb" current={consumedCarb} target={targetCarb} unit="g" color="amber" />
              <MacroProgressCard label="Fat" current={consumedFat} target={targetFat} unit="g" color="indigo" />
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium">
              Tham chiếu kế hoạch đầy đủ 5 buổi: {Math.round(dayCals)} kcal · P {Math.round(dayPro)}g · C {Math.round(dayCarb)}g · F {Math.round(dayFat)}g
            </p>
          </div>

          <MealPlanDayView
            date={selectedDate}
            items={itemsWithWarnings}
            onUpdateItems={(newItems) => {
              const cleanItems = newItems.map((item) => {
                const clean = { ...item };
                delete clean.warning;
                return clean;
              });
              setItems(cleanItems);
            }}
            onOpenSearch={handleOpenSearch}
          />

          <ClientDayTimelinePanel
            timeline={clientTimeline}
            loading={clientIntakeLoading}
            clientId={clientId}
            clientName={profile?.fullName || profile?.name}
            onReviewLog={({ log, clientId: cid, clientName }) => {
              const params = new URLSearchParams({
                clientId: cid,
                ...(clientName ? { clientName } : {}),
                ...(log?.id ? { logId: log.id } : {}),
              });
              navigate(`/pt/reviews?${params.toString()}`);
            }}
          />
        </div>
      </div>

      <FoodSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelect={handleSelectFood}
      />

      <TemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onApply={handleApplyTemplate}
        onSaveAsTemplate={handleSaveAsTemplate}
        items={items}
        weekStart={weekStart}
      />

      <GroceryListModal
        isOpen={groceryModalOpen}
        onClose={() => setGroceryModalOpen(false)}
        items={items}
        weekStart={weekStart}
      />
    </div>
  );
}

function UtensilsIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
    </svg>
  );
}

function MacroProgressCard({ label, current, target, unit, color }) {
  const p = target > 0 ? Math.min((Number(current) / Number(target)) * 100, 100) : 0;

  const colors = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        <div className="text-right">
          <span className="text-lg font-black text-slate-800">{formatMacroDisplay(current)}</span>
          <span className="text-xs font-semibold text-slate-400 ml-1">/ {formatMacroDisplay(target || 0)} {unit}</span>
        </div>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div className={`h-full ${colors[color] || 'bg-slate-500'} transition-all`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
