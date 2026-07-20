// src/pages/customer/DietTrackerPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { dietService } from '../../services/dietService';
import PostMealRatingSheet from './components/PostMealRatingSheet';
import ImageLightbox from '../../components/common/ImageLightbox';
import { toast } from 'sonner';
import { RefreshCw, AlertTriangle, X, Send, Clock, CheckCircle2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import useWebSocket from '../../hooks/useWebSocket';
import { profileExtensionsService } from '../../services/profileExtensionsService';

// Import subcomponents
import NutritionProgress from './components/NutritionProgress';
import MealSection from './components/MealSection';
import FoodInputCard from './components/FoodInputCard';
import DayPlanCard from './components/DayPlanCard';
import ConfirmFoodModal from './components/ConfirmFoodModal';
import DietDateCalendar from './components/DietDateCalendar';

import {
    getPreviewForSelection,
    initialAdjustedGrams,
    getCurrentMealPeriod,
    getLockedMealPeriods,
    periodToMealType,
    todayLocalIso,
    isFutureIso,
    isTodayIso,
    isPastIso,
    formatDisplayDate,
    addDaysIso,
    monthKeyFromIso,
    fetchAllDietLogsForRange,
} from './components/dietUtils';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const POST_MEAL_PROMPT_KEY = 'nutrican_post_meal_prompt';

function maxPlanDateIso() {
    return addDaysIso(todayLocalIso(), 14);
}

/** Past + today + near future (day-plan). Invalid → today. */
function clampDateParam(raw) {
    const today = todayLocalIso();
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
    const max = maxPlanDateIso();
    if (raw > max) return max;
    return raw;
}

function schedulePostMealPrompt(logId) {
    try {
        const raw = localStorage.getItem('nutrican_post_meal_opt_in');
        if (raw === 'false' || raw === JSON.stringify(false)) return;
        localStorage.setItem(POST_MEAL_PROMPT_KEY, JSON.stringify({
            logId,
            at: Date.now() + 30 * 60 * 1000,
        }));
    } catch { /* ignore */ }
}

export default function DietTrackerPage() {
    useWebSocket();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialDate = clampDateParam(searchParams.get('date'));
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [viewingMonth, setViewingMonth] = useState(monthKeyFromIso(initialDate));
    const [dottedDates, setDottedDates] = useState(() => new Set());
    const [dotsLoading, setDotsLoading] = useState(false);

    const selectedDateRef = useRef(selectedDate);
    const viewingMonthRef = useRef(viewingMonth);
    const calendarOpenRef = useRef(false);
    const dayFetchSeq = useRef(0);
    const monthFetchSeq = useRef(0);

    useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
    useEffect(() => { viewingMonthRef.current = viewingMonth; }, [viewingMonth]);
    useEffect(() => { calendarOpenRef.current = calendarOpen; }, [calendarOpen]);

    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const [inputMode, setInputMode] = useState('ai');
    const fileInputRef = useRef(null);

    const suggestedPeriod = getCurrentMealPeriod();
    const [manualMealPeriod, setManualMealPeriod] = useState(suggestedPeriod);
    const [ingredientItems, setIngredientItems] = useState([]);
    const [mealImages, setMealImages] = useState([]);
    const mealImageInputRef = useRef(null);
    const mealImagesRef = useRef([]);

    const [aiMealPeriod, setAiMealPeriod] = useState(suggestedPeriod);

    const [isSosModalOpen, setIsSosModalOpen] = useState(false);
    const [sosMessage, setSosMessage] = useState('');
    const [sosSubmitting, setSosSubmitting] = useState(false);
    const [sosTickets, setSosTickets] = useState([]);
    const [sosDietLogId, setSosDietLogId] = useState(null);

    const [confirmModal, setConfirmModal] = useState(null);
    const [confirmingFood, setConfirmingFood] = useState(false);
    const [resnetDishes, setResnetDishes] = useState([]);
    const [hasActivePt, setHasActivePt] = useState(false);
    const [dietFilterOn, setDietFilterOn] = useState(true);
    const [postMealPrompt, setPostMealPrompt] = useState(null);
    const [onboardingBanner, setOnboardingBanner] = useState(false);
    const [lightboxImage, setLightboxImage] = useState('');

    const isToday = isTodayIso(selectedDate);
    const isFuture = isFutureIso(selectedDate);
    const isPast = isPastIso(selectedDate);
    // AI + Manual: hôm nay chỉ khung hiện tại
    const applyAiPeriodLock = isToday;
    const [makeupForPeriod, setMakeupForPeriod] = useState(null);

    useEffect(() => {
        if (!isToday) {
            setMakeupForPeriod(null);
            return;
        }
        const current = getCurrentMealPeriod();
        setAiMealPeriod(current);
        setManualMealPeriod(current);
        setMakeupForPeriod(null);
    }, [isToday, selectedDate]);

    useEffect(() => {
        if (!isToday) return;
        const locked = getLockedMealPeriods();
        if (locked.has(aiMealPeriod)) {
            setAiMealPeriod(getCurrentMealPeriod());
        }
        if (locked.has(manualMealPeriod)) {
            setManualMealPeriod(getCurrentMealPeriod());
        }
    }, [isToday, aiMealPeriod, manualMealPeriod]);

    const [plannedTotals, setPlannedTotals] = useState(null);
    const changeSelectedDate = useCallback((nextIso) => {
        const clamped = clampDateParam(nextIso);
        setConfirmModal(null);
        setSelectedFile(null);
        setLogs([]);
        setSummary(null);
        setSelectedDate(clamped);
        setViewingMonth(monthKeyFromIso(clamped));
        setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            const today = todayLocalIso();
            if (clamped === today) p.delete('date');
            else p.set('date', clamped);
            return p;
        }, { replace: true });
        if (isTodayIso(clamped)) {
            const period = getCurrentMealPeriod();
            setAiMealPeriod(period);
            setManualMealPeriod(period);
        }
    }, [setSearchParams]);

    const fetchMonthDots = useCallback(async (ym) => {
        const seq = ++monthFetchSeq.current;
        viewingMonthRef.current = ym;
        const [y, m] = ym.split('-').map(Number);
        const startDate = `${ym}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const endDate = `${ym}-${String(lastDay).padStart(2, '0')}`;
        setDotsLoading(true);
        try {
            const logsInMonth = await fetchAllDietLogsForRange(dietService, { startDate, endDate });
            if (seq !== monthFetchSeq.current || viewingMonthRef.current !== ym) return;
            const set = new Set();
            logsInMonth.forEach((log) => {
                if (log.logDate) set.add(String(log.logDate).slice(0, 10));
            });
            setDottedDates(set);
        } catch (err) {
            console.error('Error fetching month dots', err);
        } finally {
            if (seq === monthFetchSeq.current) setDotsLoading(false);
        }
    }, []);

    const fetchDay = useCallback(async (dateIso, { withMeta = false } = {}) => {
        const seq = ++dayFetchSeq.current;
        selectedDateRef.current = dateIso;
        setLoading(true);
        try {
            const tasks = [
                fetchAllDietLogsForRange(dietService, { startDate: dateIso, endDate: dateIso }),
                dietService.getSummary({ date: dateIso }),
            ];
            if (withMeta) {
                tasks.push(dietService.getSosTickets().catch(() => ({ data: { data: [] } })));
                tasks.push(profileExtensionsService.hasActivePt().catch(() => ({ data: { data: { hasActivePt: false } } })));
            }
            const results = await Promise.all(tasks);
            if (seq !== dayFetchSeq.current || selectedDateRef.current !== dateIso) return;

            const dayLogs = results[0];
            const summaryRes = results[1];
            setLogs(dayLogs);
            const rawData = summaryRes.data?.data || {};
            setSummary({
                date: rawData.date,
                totalCalories: Number(rawData.totalCalories) || 0,
                totalProtein: Number(rawData.totalProtein) || 0,
                totalCarbs: Number(rawData.totalCarbs || rawData.totalCarb) || 0,
                totalFat: Number(rawData.totalFat) || 0,
                targetCalories: Number(rawData.targetCalories) || 2000,
                targetProtein: Number(rawData.targetProtein) || 120,
                targetCarbs: Number(rawData.targetCarbs || rawData.targetCarb) || 200,
                targetFat: Number(rawData.targetFat) || 65,
                intakeStatus: rawData.intakeStatus || 'OK',
                controlLoopMessage: rawData.controlLoopMessage || null,
            });
            if (withMeta) {
                setSosTickets(results[2]?.data?.data || []);
                setHasActivePt(Boolean(results[3]?.data?.data?.hasActivePt));
            }
        } catch (err) {
            console.error('Error fetching diet data:', err);
        } finally {
            if (seq === dayFetchSeq.current) setLoading(false);
        }
    }, []);

    const syncAll = useCallback(() => {
        fetchDay(selectedDateRef.current);
        if (calendarOpenRef.current) {
            fetchMonthDots(viewingMonthRef.current);
        }
    }, [fetchDay, fetchMonthDots]);

    const loadResNetDishes = useCallback(async () => {
        try {
            const res = await dietService.getResNetDishes();
            setResnetDishes(res.data.data || []);
        } catch (err) {
            console.error('Failed to load ResNet dishes', err);
        }
    }, []);

    useEffect(() => {
        fetchDay(selectedDate, { withMeta: true });
    }, [selectedDate, fetchDay]);

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        loadResNetDishes();

        profileExtensionsService.getOnboardingStatus()
            .then((res) => setOnboardingBanner(!!res.data?.data?.showBanner))
            .catch(() => setOnboardingBanner(false));

        const handleRealtimeUpdate = (e) => {
            if (e.type === 'SOS_RESOLVED' && e.detail) {
                setSosTickets((prev) => prev.map((t) =>
                    t.id === e.detail.ticketId
                        ? { ...t, status: 'RESOLVED', note: e.detail.note || t.note }
                        : t
                ));
            }
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (isMounted) syncAll();
            }, 1000);
        };

        window.addEventListener('realtime_update', handleRealtimeUpdate);
        window.addEventListener('realtime_update_client', handleRealtimeUpdate);
        window.addEventListener('DIET_LOG_REVIEWED', handleRealtimeUpdate);
        window.addEventListener('SOS_RESOLVED', handleRealtimeUpdate);
        window.addEventListener('MACRO_TARGET_UPDATED', handleRealtimeUpdate);

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener('realtime_update', handleRealtimeUpdate);
            window.removeEventListener('realtime_update_client', handleRealtimeUpdate);
            window.removeEventListener('DIET_LOG_REVIEWED', handleRealtimeUpdate);
            window.removeEventListener('SOS_RESOLVED', handleRealtimeUpdate);
            window.removeEventListener('MACRO_TARGET_UPDATED', handleRealtimeUpdate);
        };
    }, [loadResNetDishes, syncAll]);

    useEffect(() => {
        if (calendarOpen) {
            fetchMonthDots(viewingMonth);
        }
    }, [calendarOpen, viewingMonth, fetchMonthDots]);

    useEffect(() => {
        const checkPrompt = () => {
            try {
                const raw = localStorage.getItem(POST_MEAL_PROMPT_KEY);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (parsed?.logId && parsed.at && Date.now() >= parsed.at) {
                    setPostMealPrompt(parsed.logId);
                    localStorage.removeItem(POST_MEAL_PROMPT_KEY);
                }
            } catch { /* ignore */ }
        };
        checkPrompt();
        const id = setInterval(checkPrompt, 60000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        mealImagesRef.current = mealImages;
    }, [mealImages]);

    useEffect(() => () => {
        mealImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    }, []);

    const clearMealImages = useCallback(() => {
        setMealImages((currentImages) => {
            currentImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
            return [];
        });
        if (mealImageInputRef.current) mealImageInputRef.current.value = '';
    }, []);

    const handleMealImageSelect = (event) => {
        const files = Array.from(event.target.files || []);
        const validFiles = files.filter((file) => {
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} không phải là hình ảnh.`);
                return false;
            }
            if (file.size > MAX_IMAGE_SIZE) {
                toast.error(`${file.name} quá lớn. Tối đa 5MB.`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            setMealImages((currentImages) => [
                ...currentImages,
                ...validFiles.map((file, index) => ({
                    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${index}-${file.name}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    isPrimary: currentImages.length === 0 && index === 0,
                })),
            ]);
        }

        event.target.value = '';
    };

    const handleRemoveMealImage = (imageId) => {
        setMealImages((currentImages) => {
            const removedImage = currentImages.find((image) => image.id === imageId);
            if (removedImage) URL.revokeObjectURL(removedImage.previewUrl);

            const remainingImages = currentImages.filter((image) => image.id !== imageId);
            if (removedImage?.isPrimary && remainingImages.length > 0) {
                return remainingImages.map((image, index) => ({
                    ...image,
                    isPrimary: index === 0,
                }));
            }
            return remainingImages;
        });
    };

    const handleSetPrimaryMealImage = (imageId) => {
        setMealImages((currentImages) => currentImages.map((image) => ({
            ...image,
            isPrimary: image.id === imageId,
        })));
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
                _caloriesPer100g: baseCalories,
                _proteinPer100g: baseProtein,
                _carbPer100g: baseCarb,
                _fatPer100g: baseFat,
                calories: baseCalories * ratio,
                protein: baseProtein * ratio,
                carb: baseCarb * ratio,
                fat: baseFat * ratio,
            },
        ]);
    };

    const updateIngredientQty = (idx, qty) => {
        setIngredientItems((prev) =>
            prev.map((it, i) => {
                if (i !== idx) return it;
                const qtyG = Number(qty) || 0;
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
        if (ingredientItems.length === 1) clearMealImages();
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
            toast.error(`${file.name} quá lớn. Tối đa 5MB.`);
            return;
        }
        setSelectedFile(file);
    };

    const handleAnalyze = async (e) => {
        e.stopPropagation();
        if (!selectedFile) {
            toast.error('Vui lòng chọn hình ảnh');
            return;
        }
        try {
            setAnalyzing(true);
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('meal_type', periodToMealType(aiMealPeriod));
            formData.append('meal_period', aiMealPeriod);
            if (makeupForPeriod) formData.append('makeup_for_period', makeupForPeriod);
            formData.append('mealSource', 'HOME_COOKED');
            formData.append('log_date', selectedDate);

            const res = await dietService.analyzeMeal(formData);
            const analyzed = res.data.data;

            if (analyzed?.manualRequired || analyzed?.gateResult === 'OUT_OF_CLASS') {
                toast.warning(analyzed?.message || 'Món này chưa được hỗ trợ. Vui lòng nhập tay.');
                if (analyzed?.logId) {
                    try { await dietService.deleteLog(analyzed.logId); } catch { /* orphan cleanup best-effort */ }
                }
                setInputMode('manual');
                setSelectedFile(null);
                return;
            }

            if (analyzed?.suggestSos) {
                toast.warning('Độ tin cậy thấp — hãy kiểm tra lại thông tin.');
            }

            const safeTopPredictions = analyzed?.topPredictions?.length
                ? analyzed.topPredictions
                : [{
                    foodCode: analyzed?.foodCode || 'unknown',
                    foodName: analyzed?.foodName || 'Chưa rõ',
                    confidence: analyzed?.confidenceScore || 0,
                }];

            const selectedCode = analyzed?.foodCode || safeTopPredictions[0]?.foodCode || 'unknown';

            let adjustedGramsSafe = 350;
            try {
                adjustedGramsSafe = initialAdjustedGrams(analyzed, selectedCode, resnetDishes) || 350;
            } catch (calcError) {
                console.warn("Lỗi tính toán grams, sử dụng mặc định", calcError);
            }

            setConfirmModal({
                logId: analyzed.logId,
                confirmed: false,
                topPredictions: safeTopPredictions,
                selectedFood: { type: 'code', value: selectedCode },
                selectedDish: null,
                portionRatio: analyzed?.portionRatio ?? 1,
                portionSize: analyzed?.portionSize,
                adjustedGrams: adjustedGramsSafe,
                calories: analyzed?.calories || 0,
                protein: analyzed?.protein || 0,
                carb: analyzed?.carb || 0,
                fat: analyzed?.fat || 0,
                needsConfirmation: analyzed?.needsConfirmation ?? true,
                foodName: analyzed?.foodName || 'Bữa ăn',
                llavaUsed: analyzed?.llavaUsed,
                llavaFoodName: analyzed?.llavaFoodName,
                macroSource: analyzed?.macroSource,
                estimatedTotalGrams: analyzed?.estimatedTotalGrams,
            });

            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error('API Error:', err);
            const msg = err.response?.data?.message || '';
            if (msg.includes('GATE_FAIL_NOT_FOOD') || msg.includes('không phải thực phẩm')) {
                toast.error('Ảnh không phải thực phẩm. Vui lòng chụp lại bữa ăn.');
            } else {
                toast.error(msg || 'Lỗi nhận diện ảnh');
            }
        } finally {
            setAnalyzing(false);
        }
    };

    const handleEditLog = (log) => {
        const raw = log.aiRawJson || {};

        const safeTopPredictions = raw.topPredictions?.length
            ? raw.topPredictions
            : [{
                foodCode: log.aiFoodCode || 'unknown',
                foodName: log.matchedFoodName || log.foodDescription || 'Chưa rõ',
                confidence: log.aiConfidenceScore || 0,
            }];

        const selectedCode = log.aiFoodCode || safeTopPredictions[0]?.foodCode || 'unknown';

        const currentGrams = Number(
            raw.userAdjustedGrams || raw.portionSize || raw.estimatedTotalGrams || 350
        ) || 350;

        setConfirmModal({
            logId: log.id,
            confirmed: false,
            isEditing: true,
            topPredictions: safeTopPredictions,
            selectedFood: { type: 'code', value: selectedCode },
            selectedDish: null,
            portionRatio: raw.portionRatio ?? 1,
            portionSize: raw.portionSize,
            adjustedGrams: currentGrams,
            calories: log.macrosJson?.calories || 0,
            protein: log.macrosJson?.protein || 0,
            carb: log.macrosJson?.carbs || log.macrosJson?.carb || 0,
            fat: log.macrosJson?.fat || 0,
            needsConfirmation: false,
            foodName: log.matchedFoodName || log.foodDescription,
            llavaUsed: raw.llavaUsed,
            llavaFoodName: raw.llavaFoodName,
            macroSource: raw.macroSource,
            estimatedTotalGrams: raw.estimatedTotalGrams,
        });
    };

    const createAndSendMeal = async (payload) => {
        const createResponse = await dietService.createLog({
            ...payload,
            sendToPt: false,
        });
        const logId = createResponse.data?.data?.id;
        if (!logId) throw new Error('Không nhận được mã bữa ăn sau khi tạo');

        try {
            if (mealImages.length > 0) {
                const orderedImages = [...mealImages].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
                const formData = new FormData();
                orderedImages.forEach((image) => formData.append('files', image.file));
                await dietService.uploadImages(logId, formData);
            }

            await dietService.updateLog(logId, { sendToPt: true });
            return logId;
        } catch (error) {
            await dietService.deleteLog(logId).catch(() => undefined);
            throw error;
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
            const newLogId = await createAndSendMeal({
                mealType: periodToMealType(manualMealPeriod),
                mealPeriod: manualMealPeriod,
                makeupForPeriod: makeupForPeriod || undefined,
                mealSource: 'HOME_COOKED',
                logDate: selectedDate,
                items: ingredientItems.map((it) => ({
                    foodItemId: it.foodItemId,
                    quantityG: it.quantityG,
                })),
            });
            toast.success('Đã gửi bữa ăn cho PT duyệt!');
            if (newLogId && hasActivePt) schedulePostMealPrompt(newLogId);
            setIngredientItems([]);
            setMakeupForPeriod(null);
            clearMealImages();
            syncAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gửi bữa ăn thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (logId) => {
        try {
            await dietService.deleteLog(logId);
            toast.success('Đã xóa bữa ăn thành công');
            syncAll();
        } catch (err) {
            console.error(err);
            toast.error('Không thể xóa bữa ăn');
        }
    };

    const handleCancelConfirmation = async () => {
        const logId = confirmModal?.logId;
        const wasConfirmed = confirmModal?.confirmed;
        const isEditing = confirmModal?.isEditing;

        setConfirmModal(null);

        if (logId && !wasConfirmed && !isEditing) {
            try {
                await dietService.deleteLog(logId);
                toast.info('Đã hủy — bữa ăn không được lưu');
            } catch {
                toast.error('Không thể hủy bữa ăn tạm');
            }
        }
    };

    const handleConfirmRecognition = async () => {
        const selected = confirmModal?.selectedFood;
        if (!confirmModal?.logId || !selected?.value) return;
        if (confirmingFood) return;
        try {
            setConfirmingFood(true);

            let res;
            if (confirmModal.isEditing) {
                const code = selected.type === 'code' ? selected.value : null;
                const preview = code
                    ? getPreviewForSelection(
                        code,
                        confirmModal.topPredictions,
                        resnetDishes,
                        confirmModal.adjustedGrams
                    )
                    : null;
                const dish = confirmModal.selectedDish;
                res = await dietService.updateLog(confirmModal.logId, {
                    foodDescription: preview?.foodName || dish?.nameVi || confirmModal.foodName,
                    foodCode: code || undefined,
                    foodItemId: selected.type === 'id' ? selected.value : undefined,
                    portionGrams: confirmModal.adjustedGrams,
                    calories: preview?.calories ?? dish?.calories ?? confirmModal.calories,
                    protein: preview?.protein ?? dish?.protein ?? confirmModal.protein,
                    carb: preview?.carb ?? dish?.carb ?? confirmModal.carb,
                    fat: preview?.fat ?? dish?.fat ?? confirmModal.fat,
                    sendToPt: true,
                });
            } else {
                res = await dietService.confirmRecognition(confirmModal.logId, {
                    foodCode: selected.type === 'code' ? selected.value : undefined,
                    foodItemId: selected.type === 'id' ? selected.value : undefined,
                    portionGrams: confirmModal.adjustedGrams,
                    sendToPt: true,
                });
            }

            const data = res.data?.data;
            const pending = data?.reviewStatus === 'PENDING';
            toast.success(pending ? 'Đã gửi bữa ăn cho PT duyệt!' : 'Đã lưu bữa ăn!');
            if (confirmModal.logId && hasActivePt) schedulePostMealPrompt(confirmModal.logId);
            if (data?.dietPrefWarning) {
                toast.warning(data.dietPrefWarning);
                setConfirmModal((prev) => prev ? { ...prev, dietPrefWarning: data.dietPrefWarning } : prev);
            }
            if (data?.controlLoopMessage && data?.intakeStatus && data.intakeStatus !== 'OK') {
                toast.info(data.controlLoopMessage);
            }
            setConfirmModal(null);
            syncAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể gửi bữa ăn');
        } finally {
            setConfirmingFood(false);
        }
    };

    const handleSwitchConfirmToManual = async () => {
        const logId = confirmModal?.logId;
        const isEditing = confirmModal?.isEditing;
        setConfirmModal(null);
        setInputMode('manual');
        if (logId && !isEditing) {
            try {
                await dietService.deleteLog(logId);
                toast.info('Đã chuyển sang nhập thủ công');
            } catch {
                toast.error('Không thể hủy bản nháp AI');
            }
        }
    };

    const handleSosSubmit = async (e) => {
        e.preventDefault();
        if (!sosMessage.trim()) return toast.error('Vui lòng nhập nội dung cần hỗ trợ');
        try {
            setSosSubmitting(true);
            await dietService.createSos({
                note: sosMessage,
                dietLogId: sosDietLogId || undefined,
                priority: 'HIGH',
                reasonCode: 'USER_REQUEST',
            });
            toast.success('Đã gửi yêu cầu SOS cho PT thành công!');
            setIsSosModalOpen(false);
            setSosMessage('');
            setSosDietLogId(null);
            syncAll();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi gửi yêu cầu SOS');
        } finally {
            setSosSubmitting(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in min-w-0 overflow-x-hidden">
            {onboardingBanner && (
                <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-amber-900 font-medium">
                        Hoàn thiện hồ sơ để theo dõi macro chính xác hơn.
                    </p>
                    <Link to="/onboarding" className="text-sm font-bold text-amber-800 hover:underline shrink-0">
                        Hoàn thiện ngay →
                    </Link>
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Nhật Ký Dinh Dưỡng</h1>
                    <p className="text-slate-500 mt-1 font-medium">Phân tích bữa ăn tức thì và đạt mục tiêu hàng ngày.</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => changeSelectedDate(addDaysIso(selectedDate, -1))}
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                            aria-label="Ngày trước"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewingMonth(monthKeyFromIso(selectedDate));
                                setCalendarOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-slate-800"
                        >
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                            {isToday ? 'Hôm nay' : formatDisplayDate(selectedDate)}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const next = addDaysIso(selectedDate, 1);
                                if (next <= maxPlanDateIso()) changeSelectedDate(next);
                            }}
                            disabled={selectedDate >= maxPlanDateIso()}
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Ngày sau"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        {!isToday && (
                            <button
                                type="button"
                                onClick={() => changeSelectedDate(todayLocalIso())}
                                className="text-xs font-bold text-blue-600 hover:underline px-2"
                            >
                                Về hôm nay
                            </button>
                        )}
                    </div>
                </div>
                <Button onClick={syncAll} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Đồng bộ dữ liệu
                </Button>
            </div>

            <DietDateCalendar
                open={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                selectedDate={selectedDate}
                onSelectDate={changeSelectedDate}
                viewingMonth={viewingMonth}
                onViewingMonthChange={setViewingMonth}
                dottedDates={dottedDates}
                dotsLoading={dotsLoading}
            />

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Cột trái: Nhập liệu & Nhật ký hành trình */}
                <div className="lg:col-span-8 space-y-8">
                    {!isFuture && (
                    <FoodInputCard
                        inputMode={inputMode}
                        setInputMode={setInputMode}
                        aiMealPeriod={aiMealPeriod}
                        setAiMealPeriod={setAiMealPeriod}
                        dragActive={dragActive}
                        setDragActive={setDragActive}
                        selectedFile={selectedFile}
                        analyzing={analyzing}
                        handleAnalyze={handleAnalyze}
                        fileInputRef={fileInputRef}
                        handleFileSelect={handleFileSelect}
                        manualMealPeriod={manualMealPeriod}
                        setManualMealPeriod={setManualMealPeriod}
                        makeupForPeriod={makeupForPeriod}
                        setMakeupForPeriod={setMakeupForPeriod}
                        addIngredientFromSearch={addIngredientFromSearch}
                        ingredientItems={ingredientItems}
                        updateIngredientQty={updateIngredientQty}
                        removeIngredient={removeIngredient}
                        ingredientTotals={ingredientTotals}
                        mealImages={mealImages}
                        mealImageInputRef={mealImageInputRef}
                        handleMealImageSelect={handleMealImageSelect}
                        handleRemoveMealImage={handleRemoveMealImage}
                        handleSetPrimaryMealImage={handleSetPrimaryMealImage}
                        onPreviewImage={setLightboxImage}
                        handleManualSubmit={handleManualSubmit}
                        uploading={uploading}
                        dietFilterOn={dietFilterOn}
                        setDietFilterOn={setDietFilterOn}
                        applyAiPeriodLock={applyAiPeriodLock}
                        hasActivePt={hasActivePt}
                    />
                    )}
                    {isFuture && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 font-medium">
                            Không thể ghi nhật ký cho ngày trong tương lai.
                        </div>
                    )}

                    <DayPlanCard
                        selectedDate={selectedDate}
                        dietFilterOn={dietFilterOn}
                        targetCalories={summary?.targetCalories}
                        summary={summary}
                        hasActivePt={hasActivePt}
                        isFuture={isFuture}
                        onLogged={() => fetchDay(selectedDate)}
                        onPlannedTotalsChange={setPlannedTotals}
                    />

                    <div className="space-y-5">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            {isToday ? 'Nhật ký hôm nay' : `Nhật ký ngày ${formatDisplayDate(selectedDate)}`}
                        </h3>
                        <MealSection
                            logs={logs}
                            loading={loading}
                            emptyMessage={isToday
                                ? 'Hôm nay chưa có bữa ăn nào được ghi nhận.'
                                : 'Ngày này chưa có bữa ăn nào được ghi nhận.'}
                            handleEditLog={handleEditLog}
                            handleDelete={handleDelete}
                            onPreviewImage={setLightboxImage}
                            setSosDietLogId={setSosDietLogId}
                            setSosMessage={setSosMessage}
                            setIsSosModalOpen={setIsSosModalOpen}
                            hasActivePt={hasActivePt}
                            isPast={isPast}
                        />
                    </div>
                </div>

                {/* Cột phải: Thống kê calo & Yêu cầu SOS */}
                <div className="lg:col-span-4 space-y-6">
                    <NutritionProgress
                        summary={summary}
                        plannedTotals={plannedTotals}
                        isToday={isToday}
                        isFuture={isFuture}
                        coachedMode={hasActivePt}
                    />

                    {sosTickets.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 mb-3">Lịch sử hỗ trợ SOS</h4>
                            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                                {sosTickets.map(ticket => (
                                    <button
                                        key={ticket.id}
                                        type="button"
                                        onClick={() => ticket.dietLogId && document.getElementById(`log-${ticket.dietLogId}`)?.scrollIntoView({ behavior: 'smooth' })}
                                        className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors border-none outline-none"
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-755' : 'bg-warning/10 text-warning border border-warning/15'}`}>
                                                {ticket.status === 'RESOLVED' ? 'Đã giải quyết' : 'Chưa giải quyết'}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('vi-VN') : ''}
                                            </span>
                                        </div>

                                        <div className="text-xs text-slate-600">
                                            {ticket.status === 'RESOLVED' ? (
                                                <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg mt-2">
                                                    <span className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        PT phản hồi:
                                                    </span>
                                                    <span className="italic leading-relaxed font-medium">"{ticket.resolutionNote || ticket.note}"</span>
                                                </div>
                                            ) : (
                                                <span className="truncate block font-medium">"{ticket.note}"</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal SOS */}
            {isSosModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-amber-800">
                                <AlertTriangle className="w-5 h-5" />
                                <h3 className="font-bold text-lg">Yêu cầu hỗ trợ (SOS)</h3>
                            </div>
                            <button onClick={() => setIsSosModalOpen(false)} className="text-amber-600 hover:bg-amber-100 p-1.5 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSosSubmit} className="p-6 space-y-4">
                            <p className="text-sm text-slate-650 font-medium leading-relaxed">
                                Hãy mô tả chi tiết vấn đề hoặc câu hỏi của bạn về bữa ăn này để Huấn luyện viên có thể hỗ trợ định lượng chính xác nhất.
                            </p>
                            <textarea
                                value={sosMessage}
                                onChange={(e) => setSosMessage(e.target.value)}
                                rows="4"
                                autoFocus
                                placeholder="Ví dụ: Anh ơi, món này em ăn ngoài tiệm, nước dùng khá béo..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 resize-none transition-all"
                            />
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsSosModalOpen(false)} className="flex-1 rounded-xl h-11 border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
                                    Hủy bỏ
                                </Button>
                                <Button type="submit" disabled={sosSubmitting} className="flex-1 rounded-xl h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20">
                                    {sosSubmitting ? 'Đang gửi...' : <><Send className="w-4 h-4 mr-2" /> Gửi yêu cầu</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xác nhận món ăn */}
            <ConfirmFoodModal
                confirmModal={confirmModal}
                resnetDishes={resnetDishes}
                confirmingFood={confirmingFood}
                handleCancelConfirmation={handleCancelConfirmation}
                handleConfirmRecognition={handleConfirmRecognition}
                setConfirmModal={setConfirmModal}
                onSwitchToManual={handleSwitchConfirmToManual}
            />

            <PostMealRatingSheet
                logId={postMealPrompt}
                open={!!postMealPrompt}
                onClose={() => setPostMealPrompt(null)}
            />

            <ImageLightbox
                isOpen={!!lightboxImage}
                imageUrl={lightboxImage}
                onClose={() => setLightboxImage('')}
            />
        </div>
    );
}
