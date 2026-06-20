// src/pages/customer/DietTrackerPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { dietService } from '../../services/dietService';
import { toast } from 'sonner';
import { Upload, Camera, FileText, AlertTriangle, RefreshCw, Trash2, CheckCircle2, Clock, XCircle, Activity, Sparkles, Keyboard, Star, X, MessageSquare, Send } from 'lucide-react';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const FOOD_CODE_LABELS = {
  banh_chung: 'Bánh Chưng',
  banh_khot: 'Bánh Khọt',
  banh_mi: 'Bánh Mì',
  banh_trang_nuong: 'Bánh Tráng Nướng',
  banh_xeo: 'Bánh Xèo',
  bun_dau_mam_tom: 'Bún Đậu Mắm Tôm',
  ca_kho_to: 'Cá Kho Tộ',
  com_tam: 'Cơm Tấm (Cơm sườn)',
  goi_cuon: 'Gỏi Cuốn',
  pho: 'Phở',
};

function getLogFoodTitle(log) {
  if (log.foodDescription?.trim()) return log.foodDescription.trim();
  if (log.matchedFoodName?.trim()) return log.matchedFoodName.trim();
  if (log.aiFoodCode && FOOD_CODE_LABELS[log.aiFoodCode]) return FOOD_CODE_LABELS[log.aiFoodCode];
  if (log.aiFoodCode) return log.aiFoodCode.replace(/_/g, ' ');
  return 'Chưa nhận diện tên món';
}

function formatAiConfidence(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  return `${Math.round(Number(score) * 100)}%`;
}

function formatPredictionConfidence(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const pct = Number(score) <= 1 ? Math.round(Number(score) * 100) : Math.round(Number(score));
  return `${pct}%`;
}

function formatPortionRatio(ratio) {
  if (ratio == null || Number.isNaN(Number(ratio))) return null;
  const value = Number(ratio);
  if (value >= 0.95 && value <= 1.05) return '1 suất chuẩn';
  if (value < 1) return `${Math.round(value * 100)}% suất`;
  return `${value.toFixed(1)}× suất`;
}

const RESNET_FOOD_CODES = Object.keys(FOOD_CODE_LABELS);

const RESNET_MACRO_ESTIMATES = {
  banh_chung: { calories: 408, protein: 15, carb: 75, fat: 6, servingG: 200 },
  banh_khot: { calories: 154, protein: 6, carb: 17, fat: 7, servingG: 150 },
  banh_mi: { calories: 240, protein: 8, carb: 51, fat: 1, servingG: 250 },
  banh_trang_nuong: { calories: 300, protein: 5, carb: 33, fat: 16, servingG: 200 },
  banh_xeo: { calories: 517, protein: 15, carb: 71, fat: 19, servingG: 180 },
  bun_dau_mam_tom: { calories: 760, protein: 58, carb: 49, fat: 45, servingG: 400 },
  ca_kho_to: { calories: 330, protein: 39, carb: 22, fat: 10, servingG: 350 },
  com_tam: { calories: 529, protein: 21, carb: 82, fat: 13, servingG: 350 },
  goi_cuon: { calories: 116, protein: 10, carb: 11, fat: 4, servingG: 120 },
  pho: { calories: 414, protein: 18, carb: 59, fat: 12, servingG: 500 },
};

function resolveResnetFoodCode(dish) {
  if (!dish) return null;
  const alias = dish.aliases?.find((a) => RESNET_FOOD_CODES.includes(a));
  if (alias) return alias;
  if (dish.nameEn) return dish.nameEn.replace(/ /g, '_');
  return null;
}

function getManualDishOptions(resnetDishes) {
  if (resnetDishes?.length > 0) return resnetDishes;
  return RESNET_FOOD_CODES.map((code) => ({
    nameVi: FOOD_CODE_LABELS[code],
    aliases: [code],
    ...RESNET_MACRO_ESTIMATES[code],
  }));
}

function getServingGForCode(foodCode, resnetDishes) {
  if (!foodCode) return 350;
  const dish = getManualDishOptions(resnetDishes).find((d) => resolveResnetFoodCode(d) === foodCode);
  return Math.round(
    Number(dish?.servingSizeG || dish?.servingG || RESNET_MACRO_ESTIMATES[foodCode]?.servingG || 350)
  );
}

function scaleMacrosByGrams(dish, grams, servingG) {
  if (!dish) return null;
  const base = Number(servingG) || Number(dish.servingSizeG || dish.servingG) || 100;
  const g = Number(grams) || base;
  const ratio = g / base;
  return {
    calories: Math.round(Number(dish.calories || 0) * ratio),
    protein: Math.round(Number(dish.protein || 0) * ratio),
    carb: Math.round(Number(dish.carb || 0) * ratio),
    fat: Math.round(Number(dish.fat || 0) * ratio),
  };
}

function scaleDishMacros(dish, portionRatio = 1) {
  if (!dish) return null;
  const servingG = Number(dish.servingSizeG || dish.servingG || 100);
  return scaleMacrosByGrams(dish, servingG * (Number(portionRatio) || 1), servingG);
}

function getPreviewForSelection(selectedFoodCode, topPredictions, resnetDishes, adjustedGrams) {
  if (!selectedFoodCode) return null;
  const servingG = getServingGForCode(selectedFoodCode, resnetDishes);
  const grams = Math.round(Number(adjustedGrams) || servingG);
  const dish = getManualDishOptions(resnetDishes).find((d) => resolveResnetFoodCode(d) === selectedFoodCode);
  if (dish) {
    const scaled = scaleMacrosByGrams(dish, grams, servingG);
    return {
      foodCode: selectedFoodCode,
      foodName: dish.nameVi,
      servingG,
      ...scaled,
    };
  }
  const est = RESNET_MACRO_ESTIMATES[selectedFoodCode];
  if (est) {
    const scaled = scaleMacrosByGrams(est, grams, servingG);
    return {
      foodCode: selectedFoodCode,
      foodName: FOOD_CODE_LABELS[selectedFoodCode],
      servingG,
      ...scaled,
    };
  }
  const fromTop = topPredictions?.find((p) => p.foodCode === selectedFoodCode);
  return fromTop ? { ...fromTop, servingG } : null;
}

function initialAdjustedGrams(analyzed, foodCode, resnetDishes) {
  const servingG = getServingGForCode(foodCode, resnetDishes);
  const fromAi = analyzed?.estimatedTotalGrams ?? analyzed?.portionSize;
  if (fromAi != null && Number(fromAi) > 0) {
    return Math.round(Number(fromAi));
  }
  const ratio = Number(analyzed?.portionRatio) || 1;
  return Math.round(servingG * ratio);
}

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

  // Manual form state
  const [manualMealType, setManualMealType] = useState('LUNCH');
  // Ingredient-based manual entry (HOME_COOKED): pick raw ingredients + grams, app auto-calculates macros.
  // Backend already supports this via CreateDietLogRequest.items[] (DietLogItemRequest with foodItemId + quantityG).
  const [ingredientItems, setIngredientItems] = useState([]);
  // ingredientItems shape: [{ foodItemId, itemName, servingSizeG, quantityG, calories, protein, carb, fat }]
  // macros are pre-scaled to quantityG via scaleFoodMacros()

  // Meal context
  const [mealSource, setMealSource] = useState('HOME_COOKED');
  const [restaurantName, setRestaurantName] = useState('');
  const [isHotpot, setIsHotpot] = useState(false);
  const [aiMealType, setAiMealType] = useState('LUNCH');
  const [hotpotBroths, setHotpotBroths] = useState([]);
  const [hotpotItems, setHotpotItems] = useState([]);
  const [selectedBrothId, setSelectedBrothId] = useState('');
  const [selectedHotpotItems, setSelectedHotpotItems] = useState([]);
  const [isComposite, setIsComposite] = useState(false);
  const [selectedCompositeItems, setSelectedCompositeItems] = useState([]);
  const [compositeSearchQuery, setCompositeSearchQuery] = useState('');
  const [compositeSearchResults, setCompositeSearchResults] = useState([]);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [foodSearchResults, setFoodSearchResults] = useState([]);

  // SOS Ticket State
  const [showSosForm, setShowSosForm] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [sosTickets, setSosTickets] = useState([]);
  const [sosDietLogId, setSosDietLogId] = useState(null);

  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmingFood, setConfirmingFood] = useState(false);
  const [resnetDishes, setResnetDishes] = useState([]);

  useEffect(() => {
    fetchData();
    loadHotpotData();
    loadResNetDishes();
  }, []);

  const loadResNetDishes = async () => {
    try {
      const res = await dietService.getResNetDishes();
      setResnetDishes(res.data.data || []);
    } catch (err) {
      console.error('Failed to load ResNet dishes', err);
    }
  };

  const todayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadHotpotData = async () => {
    try {
      const [brothsRes, itemsRes] = await Promise.all([
        dietService.getHotpotBroths(),
        dietService.getHotpotItems(),
      ]);
      setHotpotBroths(brothsRes.data.data || []);
      setHotpotItems(itemsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load hotpot data', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = todayStr();
      const [logsRes, summaryRes, sosRes] = await Promise.all([
        dietService.getLogs({ page: 0, size: 10, startDate: today, endDate: today }),
        dietService.getSummary({ date: today }),
        dietService.getSosTickets().catch(() => ({ data: { data: [] } })),
      ]);
      setLogs(logsRes.data.data.content || []);
      const rawData = summaryRes.data.data || {};
      // Ensure all numeric values are properly converted (BigDecimal from Java)
      const summaryData = {
        date: rawData.date,
        totalCalories: Number(rawData.totalCalories) || 0,
        totalProtein: Number(rawData.totalProtein) || 0,
        totalCarbs: Number(rawData.totalCarbs || rawData.totalCarb) || 0,
        totalFat: Number(rawData.totalFat) || 0,
        targetCalories: Number(rawData.targetCalories) || 2000,
        targetProtein: Number(rawData.targetProtein) || 120,
        targetCarbs: Number(rawData.targetCarbs || rawData.targetCarb) || 200,
        targetFat: Number(rawData.targetFat) || 65,
      };
      setSummary(summaryData);
      setSosTickets(sosRes.data.data || []);
    } catch (err) {
      console.error('Error fetching diet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchFoods = async (q) => {
    setFoodSearchQuery(q);
    if (!q || q.length < 2) {
      setFoodSearchResults([]);
      return;
    }
    try {
      const res = await dietService.searchFoods(q);
      setFoodSearchResults(res.data.data || []);
    } catch (err) {
      console.error('Food search failed', err);
    }
  };

  const searchCompositeFoods = async (q) => {
    setCompositeSearchQuery(q);
    if (!q || q.length < 2) {
      setCompositeSearchResults([]);
      return;
    }
    try {
      const res = await dietService.searchFoods(q);
      setCompositeSearchResults(res.data.data || []);
    } catch (err) {
      console.error('Composite food search failed', err);
    }
  };

  const selectFoodFromDb = (food) => {
    addIngredientFromSearch(food);
  };

  const addIngredientFromSearch = (food) => {
    const defaultQty = parseFloat(food.servingSizeG) || 100;
    const baseCalories = parseFloat(food.calories) || 0;
    const baseProtein = parseFloat(food.protein) || 0;
    const baseCarb = parseFloat(food.carb) || 0;
    const baseFat = parseFloat(food.fat) || 0;
    const ratio = defaultQty / 100;
    setIngredientItems((prev) => [
      ...prev,
      {
        foodItemId: food.id,
        itemName: food.nameVi,
        servingSizeG: defaultQty,
        quantityG: defaultQty,
        // Store per-100g values for recalculation
        _caloriesPer100g: baseCalories,
        _proteinPer100g: baseProtein,
        _carbPer100g: baseCarb,
        _fatPer100g: baseFat,
        // Pre-scaled values for display
        calories: baseCalories * ratio,
        protein: baseProtein * ratio,
        carb: baseCarb * ratio,
        fat: baseFat * ratio,
      },
    ]);
    setFoodSearchQuery('');
    setFoodSearchResults([]);
  };

  const updateIngredientQty = (idx, qty) => {
    setIngredientItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const qtyG = Number(qty) || 0;
        // Use stored per-100g values for accurate recalculation
        const calPer100 = parseFloat(it._caloriesPer100g) || 0;
        const proPer100 = parseFloat(it._proteinPer100g) || 0;
        const carbPer100 = parseFloat(it._carbPer100g) || 0;
        const fatPer100 = parseFloat(it._fatPer100g) || 0;
        const ratio = qtyG / 100;
        return { 
          ...it, 
          quantityG: qtyG, 
          calories: calPer100 * ratio,
          protein: proPer100 * ratio,
          carb: carbPer100 * ratio,
          fat: fatPer100 * ratio,
        };
      })
    );
  };

  const removeIngredient = (idx) => {
    setIngredientItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const ingredientTotals = ingredientItems.reduce(
    (acc, it) => ({
      calories: acc.calories + (Number(it.calories) || 0),
      protein:  acc.protein  + (Number(it.protein)  || 0),
      carb:     acc.carb     + (Number(it.carb)     || 0),
      fat:      acc.fat      + (Number(it.fat)      || 0),
    }),
    { calories: 0, protein: 0, carb: 0, fat: 0 }
  );

  const handleFileSelect = (e) => {
    const file = (e.target.files || e.dataTransfer?.files)?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`${file.name} is too large. Maximum size is 5MB.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleAnalyze = async (e) => {
    e.stopPropagation();
    if (!selectedFile) {
      toast.error('Please select an image');
      return;
    }
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('meal_type', aiMealType);
      formData.append('mealSource', mealSource);
      if (restaurantName) formData.append('restaurantName', restaurantName);
      if (isHotpot && mealSource === 'RESTAURANT') {
        formData.append('mealComplexity', 'HOTPOT');
        if (selectedBrothId) formData.append('hotpotBrothId', selectedBrothId);
        selectedHotpotItems.forEach(id => formData.append('hotpotItemIds', id));
        const portions = selectedHotpotItems.map(() => '100').join(',');
        if (portions) formData.append('hotpotPortions', portions);
      } else if (isComposite && mealSource === 'RESTAURANT') {
        formData.append('mealComplexity', 'COMPOSITE');
        selectedCompositeItems.forEach(id => formData.append('compositeItemIds', id));
        const portions = selectedCompositeItems.map(() => '100').join(',');
        if (portions) formData.append('compositePortions', portions);
      }

      const res = await dietService.analyzeMeal(formData);
      const analyzed = res.data.data;
      if (analyzed?.suggestSos) {
        toast.warning('Low confidence — consider sending an SOS to your PT');
      }

      const topPredictions = analyzed?.topPredictions?.length
        ? analyzed.topPredictions
        : [{
            foodCode: analyzed?.foodCode,
            foodName: analyzed?.foodName,
            confidence: analyzed?.confidenceScore,
          }].filter((p) => p.foodCode);

      const selectedCode = analyzed?.foodCode || topPredictions[0]?.foodCode;
      setConfirmModal({
        logId: analyzed.logId,
        confirmed: false,
        topPredictions,
        selectedFoodCode: selectedCode,
        portionRatio: analyzed?.portionRatio ?? 1,
        portionSize: analyzed?.portionSize,
        adjustedGrams: initialAdjustedGrams(analyzed, selectedCode, resnetDishes),
        calories: analyzed?.calories,
        protein: analyzed?.protein,
        carb: analyzed?.carb,
        fat: analyzed?.fat,
        needsConfirmation: analyzed?.needsConfirmation ?? true,
        foodName: analyzed?.foodName,
        llavaUsed: analyzed?.llavaUsed,
        llavaFoodName: analyzed?.llavaFoodName,
        macroSource: analyzed?.macroSource,
        estimatedTotalGrams: analyzed?.estimatedTotalGrams,
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Chưa fetchData — log tạm chỉ hiện sau khi user xác nhận
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to analyze meal');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (ingredientItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 nguyên liệu');
      return;
    }
    try {
      setUploading(true);
      await dietService.createLog({
        mealType: manualMealType,
        mealSource,
        restaurantName: mealSource === 'RESTAURANT' ? restaurantName : undefined,
        items: ingredientItems.map((it) => ({
          foodItemId: it.foodItemId,
          quantityG: it.quantityG,
        })),
      });
      toast.success('Đã lưu bữa ăn!');
      setIngredientItems([]);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lưu thất bại');
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

  const handleCancelConfirmation = async () => {
    const logId = confirmModal?.logId;
    const wasConfirmed = confirmModal?.confirmed;
    setConfirmModal(null);
    if (logId && !wasConfirmed) {
      try {
        await dietService.deleteLog(logId);
        toast.info('Đã hủy — bữa ăn không được lưu');
      } catch {
        toast.error('Không thể hủy bữa ăn tạm');
      }
    }
    fetchData();
  };

  const handleConfirmRecognition = async () => {
    if (!confirmModal?.logId || !confirmModal?.selectedFoodCode) return;
    try {
      setConfirmingFood(true);
      await dietService.confirmRecognition(
        confirmModal.logId,
        confirmModal.selectedFoodCode,
        confirmModal.adjustedGrams
      );
      const selected = getPreviewForSelection(
        confirmModal.selectedFoodCode,
        confirmModal.topPredictions,
        resnetDishes,
        confirmModal.adjustedGrams
      );
      toast.success(`Đã lưu: ${selected?.foodName || FOOD_CODE_LABELS[confirmModal.selectedFoodCode] || confirmModal.selectedFoodCode}`);
      setConfirmModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xác nhận món ăn');
    } finally {
      setConfirmingFood(false);
    }
  };

  const selectedPrediction = getPreviewForSelection(
    confirmModal?.selectedFoodCode,
    confirmModal?.topPredictions,
    resnetDishes,
    confirmModal?.adjustedGrams
  );

  const selectFoodCode = (code) => {
    setConfirmModal((prev) => {
      if (!prev) return prev;
      const servingG = getServingGForCode(code, resnetDishes);
      return {
        ...prev,
        selectedFoodCode: code,
        adjustedGrams: Math.round(servingG * (Number(prev.portionRatio) || 1)),
      };
    });
  };

  const manualDishOptions = getManualDishOptions(resnetDishes);

  const handleUploadAdditionalImages = async (logId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      const validFiles = files.filter(file => {
        if (file.size > MAX_IMAGE_SIZE) {
          toast.error(`${file.name} is too large. Max 5MB.`);
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
      await dietService.createSos({
        note: sosMessage,
        dietLogId: sosDietLogId || undefined,
        priority: 'HIGH',
        mealSource: mealSource === 'RESTAURANT' ? 'RESTAURANT' : 'HOME_COOKED',
        reasonCode: 'USER_REQUEST',
      });
      toast.success('SOS Ticket Created!');
      setShowSosForm(false);
      setSosMessage('');
      setSosDietLogId(null);
      fetchData();
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
      'DRAFT': { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileText },
      'LOGGED': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
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
              
              <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-max mb-4 border border-slate-200/50">
                <button onClick={() => setMealSource('HOME_COOKED')} className={`flex-1 sm:w-36 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${mealSource === 'HOME_COOKED' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tự nấu</button>
                <button onClick={() => setMealSource('RESTAURANT')} className={`flex-1 sm:w-36 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${mealSource === 'RESTAURANT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ăn ngoài</button>
              </div>

              {mealSource === 'RESTAURANT' && (
                <div className="mb-4 space-y-3">
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Tên quán / nhà hàng"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={isHotpot} onChange={(e) => { setIsHotpot(e.target.checked); if (e.target.checked) setIsComposite(false); }} className="rounded" />
                    Đây là lẩu
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={isComposite} onChange={(e) => { setIsComposite(e.target.checked); if (e.target.checked) setIsHotpot(false); }} className="rounded" />
                    Buffet / nhiều món
                  </label>
                  {isComposite && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <input
                        type="text"
                        value={compositeSearchQuery}
                        onChange={(e) => searchCompositeFoods(e.target.value)}
                        placeholder="Tìm món buffet (≥2 ký tự)..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                      <select
                        multiple
                        value={selectedCompositeItems}
                        onChange={(e) => setSelectedCompositeItems(Array.from(e.target.selectedOptions, o => o.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm min-h-[100px]"
                      >
                        {compositeSearchResults.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.nameVi}{item.matchScore != null ? ` (score ${item.matchScore})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedCompositeItems.length > 0 && (
                        <p className="text-xs text-slate-500">{selectedCompositeItems.length} món đã chọn</p>
                      )}
                    </div>
                  )}
                  {isHotpot && (
                    <div className="grid sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <select value={selectedBrothId} onChange={(e) => setSelectedBrothId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm">
                        <option value="">Chọn nước lẩu...</option>
                        {hotpotBroths.map(b => <option key={b.id} value={b.id}>{b.nameVi}</option>)}
                      </select>
                      <select
                        multiple
                        value={selectedHotpotItems}
                        onChange={(e) => setSelectedHotpotItems(Array.from(e.target.selectedOptions, o => o.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm min-h-[80px]"
                      >
                        {hotpotItems.map(item => <option key={item.id} value={item.id}>{item.nameVi}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-max mb-8 border border-slate-200/50">
                <button onClick={() => setInputMode('ai')} className={`flex-1 sm:w-40 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Sparkles className="w-4 h-4" /> AI Snapshot</button>
                <button onClick={() => setInputMode('manual')} className={`flex-1 sm:w-40 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Keyboard className="w-4 h-4" /> Manual Entry</button>
              </div>

              {inputMode === 'ai' && (
                <div className="mb-4">
                  <select value={aiMealType} onChange={(e) => setAiMealType(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                    <option value="SNACK">Snack</option>
                  </select>
                </div>
              )}

              {inputMode === 'ai' ? (
                <div 
                  className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-100"><Camera className="w-8 h-8 text-blue-500" /></div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800">Upload Meal Photo</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">Drag & drop or click to browse. One image per AI analysis.</p>

                  {selectedFile ? (
                    <div className="flex flex-col items-center justify-center gap-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-bold border border-blue-100">{selectedFile.name}</span>
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
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Meal Type</label>
                    <select value={manualMealType} onChange={(e) => setManualMealType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
                      <option value="BREAKFAST">Breakfast</option>
                      <option value="LUNCH">Lunch</option>
                      <option value="DINNER">Dinner</option>
                      <option value="SNACK">Snack</option>
                    </select>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Tìm thực phẩm</label>
                    <input
                      type="text"
                      value={foodSearchQuery}
                      onChange={(e) => searchFoods(e.target.value)}
                      placeholder="Gạo, thịt bò, trứng, rau muống... (≥ 2 ký tự)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                    {foodSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                        {foodSearchResults.map((food) => (
                          <button
                            key={food.id}
                            type="button"
                            onClick={() => addIngredientFromSearch(food)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 text-slate-700 flex items-center justify-between gap-3"
                          >
                            <span className="font-semibold">{food.nameVi}</span>
                            <span className="text-slate-400 text-xs">
                              {parseFloat(food.calories || 0).toFixed(0)} kcal / {parseFloat(food.servingSizeG || 100).toFixed(0)}g
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {ingredientItems.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Nguyên liệu đã chọn</label>
                      <div className="space-y-2">
                        {ingredientItems.map((it, idx) => (
                          <div key={`${it.foodItemId}-${idx}`} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{it.itemName}</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={it.quantityG}
                              onChange={(e) => updateIngredientQty(idx, e.target.value)}
                              className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm font-semibold focus:border-blue-500 outline-none"
                            />
                            <span className="text-xs text-slate-400 w-3">g</span>
                            <span className="text-xs text-slate-500 w-16 text-right font-semibold">{Math.round(it.calories)} kcal</span>
                            <button
                              type="button"
                              onClick={() => removeIngredient(idx)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                              title="Xóa"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ingredientItems.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 p-4 bg-gradient-to-br from-blue-50 to-emerald-50/60 rounded-2xl border border-blue-100">
                      <div className="text-center">
                        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Calo</div>
                        <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.calories)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Pro</div>
                        <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.protein)}g</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Carb</div>
                        <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.carb)}g</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider">Fat</div>
                        <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.fat)}g</div>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={uploading || ingredientItems.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md px-8 h-12">
                    {uploading ? 'Đang lưu...' : 'Lưu bữa ăn'}
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
                  const logDate = new Date(log.createdAt || log.logDate);
                  const displayTime = isNaN(logDate) ? '--' : `${logDate.getHours()}h`;
                  const macros = log.macrosJson || {};
                  
                  return (
                  <div key={log.id} id={`log-${log.id}`} className="relative flex items-start gap-6 animate-slide-in" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="w-12 h-12 rounded-full bg-white border-[3px] border-blue-500 flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                      <span className="text-xs font-extrabold text-blue-600">{displayTime}</span>
                    </div>
                    
                    <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm group">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">{log.mealType}</span>
                            <StatusBadge status={log.status} />
                            {log.mealSource && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {log.mealSource === 'HOME_COOKED' ? 'Tự nấu' : 'Ăn ngoài'}
                              </span>
                            )}
                            {log.recognitionSource === 'HYBRID' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">DB match</span>
                            )}
                            {log.suggestSos && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Cần SOS?</span>
                            )}
                          </div>
                          <p className="text-lg font-bold text-slate-800">
                            {getLogFoodTitle(log)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {log.aiFoodCode && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                ResNet · {FOOD_CODE_LABELS[log.aiFoodCode] || log.aiFoodCode}
                              </span>
                            )}
                            {formatAiConfidence(log.aiConfidenceScore) && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                AI {formatAiConfidence(log.aiConfidenceScore)} tin cậy
                              </span>
                            )}
                            {log.matchedFoodName && log.recognitionSource === 'HYBRID' && (
                              <span className="text-[10px] font-semibold text-emerald-700">
                                DB: {log.matchedFoodName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2.5 text-sm font-semibold text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{macros.calories || 0} kcal</span>
                            <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                              từ ảnh · DB × khẩu phần
                            </span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{macros.protein || 0}g Pro</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{macros.carbs || macros.carb || 0}g Carb</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />{macros.fat || 0}g Fat</span>
                          </div>
                          {log.status === 'DRAFT' && (
                            <Button size="sm" onClick={async () => { await dietService.submitForReview(log.id); toast.success('Submitted for PT review'); fetchData(); }} className="mt-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs h-8">
                              Xác nhận & gửi PT
                            </Button>
                          )}
                          {log.suggestSos && (
                            <Button size="sm" variant="outline" onClick={() => { setSosDietLogId(log.id); setShowSosForm(true); }} className="mt-2 border-amber-300 text-amber-700 rounded-lg text-xs h-8">
                              Gửi SOS
                            </Button>
                          )}
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

          {sosTickets.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-3">My SOS Tickets</h4>
              <div className="space-y-2 max-h-40 overflow-auto">
                {sosTickets.map(ticket => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => ticket.dietLogId && document.getElementById(`log-${ticket.dietLogId}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">{ticket.status}</span>
                      <span className="text-[10px] text-slate-400">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">{ticket.note}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-in">
            {/* Header — luôn hiện */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-blue-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-600 flex-shrink-0" />
                    Xác nhận món ăn
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    ResNet Phase 2 + NutriHome · kéo gram → xác nhận để lưu
                  </p>
                  {confirmModal.llavaUsed && confirmModal.llavaFoodName && (
                    <p className="text-xs text-emerald-700 mt-1.5 font-medium truncate">
                      LLaVA: {confirmModal.llavaFoodName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCancelConfirmation}
                  disabled={confirmingFood}
                  aria-label="Đóng"
                  className="p-2 rounded-full hover:bg-white/90 text-slate-500 disabled:opacity-50 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {confirmModal.needsConfirmation && (
                <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Độ tin cậy thấp — chọn đúng món và chỉnh gram trước khi lưu.
                </p>
              )}
            </div>

            {/* Body — cuộn được */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Top 3 nhận diện</p>
                <div className="space-y-2">
                  {confirmModal.topPredictions.map((pred, idx) => {
                    const isSelected = pred.foodCode === confirmModal.selectedFoodCode;
                    return (
                      <button
                        key={pred.foodCode}
                        type="button"
                        onClick={() => selectFoodCode(pred.foodCode)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-200'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                            <p className="font-semibold text-slate-800 text-sm truncate">
                              {pred.foodName || FOOD_CODE_LABELS[pred.foodCode]}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            isSelected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {formatPredictionConfidence(pred.confidence)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {manualDishOptions.length > 0 && (
                <section className="pt-1 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Chọn món đúng (10 món)
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-0.5">
                    {manualDishOptions.map((dish) => {
                      const code = resolveResnetFoodCode(dish);
                      if (!code) return null;
                      const isSelected = code === confirmModal.selectedFoodCode;
                      const servingG = getServingGForCode(code, resnetDishes);
                      const scaled = scaleMacrosByGrams(dish, confirmModal.adjustedGrams ?? servingG, servingG);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => selectFoodCode(code)}
                          className={`text-left p-2.5 rounded-xl border-2 text-xs transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : code === 'com_tam'
                                ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                                : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className="font-bold text-slate-800 leading-tight line-clamp-2">
                            {dish.nameVi || FOOD_CODE_LABELS[code]}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            ~{scaled?.calories ?? '—'} kcal
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {confirmModal.selectedFoodCode && (() => {
                const servingG = selectedPrediction?.servingG
                  || getServingGForCode(confirmModal.selectedFoodCode, resnetDishes);
                const minG = Math.max(50, Math.round(servingG * 0.4));
                const maxG = Math.min(900, Math.round(servingG * 2.2));
                const grams = confirmModal.adjustedGrams ?? servingG;
                return (
                  <section className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/50 to-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">Khẩu phần</p>
                      <span className="text-xl font-bold text-violet-700 tabular-nums">{grams}g</span>
                    </div>
                    <input
                      type="range"
                      min={minG}
                      max={maxG}
                      step={5}
                      value={grams}
                      onChange={(e) => setConfirmModal((prev) => ({
                        ...prev,
                        adjustedGrams: Number(e.target.value),
                      }))}
                      className="w-full h-2.5 accent-violet-600 cursor-pointer rounded-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{minG}g</span>
                      <span className="font-medium text-violet-600">Chuẩn {servingG}g</span>
                      <span>{maxG}g</span>
                    </div>
                    {selectedPrediction && (
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: 'Kcal', value: selectedPrediction.calories, accent: 'text-emerald-700' },
                          { label: 'Protein', value: `${selectedPrediction.protein ?? '—'}g`, accent: 'text-slate-800' },
                          { label: 'Carb', value: `${selectedPrediction.carb ?? '—'}g`, accent: 'text-slate-800' },
                          { label: 'Fat', value: `${selectedPrediction.fat ?? '—'}g`, accent: 'text-slate-800' },
                        ].map(({ label, value, accent }) => (
                          <div key={label} className="rounded-xl bg-white border border-slate-100 py-2 text-center shadow-sm">
                            <p className="text-[10px] text-slate-500">{label}</p>
                            <p className={`text-sm font-bold ${accent}`}>{value ?? '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })()}
            </div>

            {/* Footer — luôn hiện, nút thao tác */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-pb">
              {selectedPrediction && (
                <p className="text-center text-sm font-semibold text-emerald-700 mb-3">
                  Tổng: {selectedPrediction.calories ?? '—'} kcal · {confirmModal.adjustedGrams ?? '—'}g
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-slate-300 text-slate-700 font-semibold"
                  disabled={confirmingFood}
                  onClick={handleCancelConfirmation}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md shadow-violet-200"
                  disabled={confirmingFood || !confirmModal.selectedFoodCode}
                  onClick={handleConfirmRecognition}
                >
                  {confirmingFood ? 'Đang lưu...' : 'Xác nhận & lưu'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}