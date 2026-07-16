import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceService } from '../../services/workspaceService';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Save, Calendar as CalendarIcon, Copy, Loader2, AlertCircle, FileText, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import MealPlanDayView from '../../components/pt/meal-plan/MealPlanDayView';
import FoodSearchModal from '../../components/pt/meal-plan/FoodSearchModal';
import TemplateModal from '../../components/pt/meal-plan/TemplateModal';
import GroceryListModal from '../../components/pt/meal-plan/GroceryListModal';

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

export default function PtMealPlanPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState(null);
  
  // Week state
  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  
  // Plan state
  const [planId, setPlanId] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [prefWarnCodes, setPrefWarnCodes] = useState(new Set());
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  
  // Modal state
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
            const uiItems = data.items.map((item, idx) => ({
              tempId: `api-${item.id || idx}-${Date.now()}`,
              planDate: item.planDate,
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
              eaten: item.eaten || false,
            }));
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

      // Suggestions
      workspaceService.getPendingMealPlanSuggestions(clientId)
        .then((res) => setPendingSuggestions(res.data.data || []))
        .catch(() => setPendingSuggestions([]));
        
    } catch {
      toast.error('Lỗi khi tải dữ liệu học viên');
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [clientId, weekStart, loadData]);

  const refreshSuggestions = async () => {
    try {
      const res = await workspaceService.getPendingMealPlanSuggestions(clientId);
      setPendingSuggestions(res.data.data || []);
    } catch {
      setPendingSuggestions([]);
    }
  };

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(formatDate(d));
    }
    return dates;
  }, [weekStart]);

  const handlePrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setSelectedDate(formatDate(d));
  };
  const handleNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
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
      foodCode: food.aliases?.[0] || food.nameEn || food.nameVi,
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
        tempId: `copy-${Date.now()}-${idx}`,
        planDate: selectedDate,
      }));
      
      setItems([...items.filter(i => i.planDate !== selectedDate), ...newCopied]);
      toast.success('Đã sao chép thực đơn hôm qua!');
      return;
    }

    // Try to fetch from previous week
    const prevWeekStartStr = formatDate(getStartOfWeek(curr));
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
          planDate: i.planDate,
          mealType: i.mealType,
          foodCode: i.foodCode,
          freeText: i.freeText || i.nameVi,
          portionGrams: i.portionGrams,
          note: ''
        }))
      };

      let res;
      if (planId) {
        res = await workspaceService.updateMealPlan(clientId, payload);
      } else {
        res = await workspaceService.createMealPlan(payload);
      }
      
      const result = res.data.data;
      if (result?.allergyWarnings?.length) {
        toast.warning(`Cảnh báo dị ứng: ${result.allergyWarnings.length} món`);
      }
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
    // Refresh
    loadData();
  };

  const handleSaveAsTemplate = async (templateData) => {
    // Transform items to dayOffset format
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const currentDayItems = items.filter(i => i.planDate === selectedDate);
  const dayCals = currentDayItems.reduce((acc, i) => acc + (i.calcCalories || 0), 0);
  const dayPro = currentDayItems.reduce((acc, i) => acc + (i.calcProtein || 0), 0);
  const dayCarb = currentDayItems.reduce((acc, i) => acc + (i.calcCarb || 0), 0);
  const dayFat = currentDayItems.reduce((acc, i) => acc + (i.calcFat || 0), 0);
  
  const targetCals = profile?.tdee || 0;
  const targetPro = profile?.protein || 0;
  const targetCarb = profile?.carb || 0;
  const targetFat = profile?.fat || 0;

  const isOverCal = targetCals > 0 && dayCals > targetCals * 1.1;

  // Render items with warnings injected
  const itemsWithWarnings = items.map(i => ({
    ...i,
    warning: prefWarnCodes.has(i.foodCode) ? true : false
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate(`/pt/clients/${clientId}`)} className="gap-2 mb-2 -ml-2 text-slate-500">
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
                      loadData();
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePrevWeek} className="rounded-xl border-slate-200 text-slate-600">&larr; Tuần trước</Button>
          <div className="flex items-center gap-2 text-slate-800 font-black">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            Tuần {formatDate(weekStart)}
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
                <p className="text-sm text-slate-500 font-medium mt-1">Theo dõi tiến độ và cân đối dinh dưỡng.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyPrevDay} className="gap-2 rounded-xl text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100">
                <Copy className="w-4 h-4" /> Sao chép hôm qua
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MacroProgressCard label="Calories" current={dayCals} target={targetCals} unit="kcal" color="blue" />
              <MacroProgressCard label="Protein" current={dayPro} target={targetPro} unit="g" color="rose" />
              <MacroProgressCard label="Carb" current={dayCarb} target={targetCarb} unit="g" color="amber" />
              <MacroProgressCard label="Fat" current={dayFat} target={targetFat} unit="g" color="indigo" />
            </div>
          </div>

          <MealPlanDayView
            date={selectedDate}
            items={itemsWithWarnings}
            onUpdateItems={(newItems) => {
              // Strip warning property before saving to state
              const cleanItems = newItems.map((item) => {
                const clean = { ...item };
                delete clean.warning;
                return clean;
              });
              setItems(cleanItems);
            }}
            onOpenSearch={handleOpenSearch}
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
  const p = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  
  const colors = {
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        <div className="text-right">
          <span className="text-lg font-black text-slate-800">{current}</span>
          <span className="text-xs font-semibold text-slate-400 ml-1">/ {target || 0} {unit}</span>
        </div>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div className={`h-full ${colors[color] || 'bg-slate-500'} transition-all`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
