// src/pages/customer/DietTrackerPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { dietService } from '../../services/dietService';
import { recipeService } from '../../services/recipeService';
import PostMealRatingSheet from './components/PostMealRatingSheet';
import { toast } from 'sonner';
import { RefreshCw, AlertTriangle, X, Send, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useWebSocket from '../../hooks/useWebSocket';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { chatService } from '../../services/chatService';

// Import subcomponents
import NutritionProgress from './components/NutritionProgress';
import MealSection from './components/MealSection';
import FoodInputCard from './components/FoodInputCard';
import ConfirmFoodModal from './components/ConfirmFoodModal';

import { initialAdjustedGrams } from './components/dietUtils';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const POST_MEAL_PROMPT_KEY = 'nutrican_post_meal_prompt';

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

    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const [inputMode, setInputMode] = useState('ai');
    const fileInputRef = useRef(null);

    const [manualMealType, setManualMealType] = useState('LUNCH');
    const [ingredientItems, setIngredientItems] = useState([]);

    const [aiMealType, setAiMealType] = useState('LUNCH');
    const [foodSearchQuery, setFoodSearchQuery] = useState('');
    const [foodSearchResults, setFoodSearchResults] = useState([]);

    const [isSosModalOpen, setIsSosModalOpen] = useState(false);
    const [sosMessage, setSosMessage] = useState('');
    const [sosSubmitting, setSosSubmitting] = useState(false);
    const [sosTickets, setSosTickets] = useState([]);
    const [sosDietLogId, setSosDietLogId] = useState(null);

    const [confirmModal, setConfirmModal] = useState(null);
    const [confirmingFood, setConfirmingFood] = useState(false);
    const [resnetDishes, setResnetDishes] = useState([]);
    const [hasActivePt, setHasActivePt] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const [logsRes, summaryRes, sosRes, threadsRes] = await Promise.all([
                dietService.getLogs({ page: 0, size: 10, startDate: todayStr, endDate: todayStr }),
                dietService.getSummary({ date: todayStr }),
                dietService.getSosTickets().catch(() => ({ data: { data: [] } })),
                chatService.getThreads().catch(() => ({ data: { data: [] } })),
            ]);
            setLogs(logsRes.data.data.content || []);
            const rawData = summaryRes.data.data || {};
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
                intakeStatus: rawData.intakeStatus || 'OK',
                controlLoopMessage: rawData.controlLoopMessage || null,
            };
            setSummary(summaryData);
            setSosTickets(sosRes.data.data || []);
            setHasActivePt((threadsRes.data?.data || []).some(t => t.status === 'ACTIVE'));
        } catch (err) {
            console.error('Error fetching diet data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadResNetDishes = useCallback(async () => {
        try {
            const res = await dietService.getResNetDishes();
            setResnetDishes(res.data.data || []);
        } catch (err) {
            console.error('Failed to load ResNet dishes', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const init = async () => {
            await Promise.all([fetchData(), loadResNetDishes()]);
        };

        if (isMounted) {
            init();
        }

        profileExtensionsService.getOnboardingStatus()
            .then((res) => setOnboardingBanner(!!res.data?.data?.showBanner))
            .catch(() => setOnboardingBanner(false));

        const handleRealtimeUpdate = (e) => {
            console.log("🔄 Lệnh Reload đã được gọi từ WebSocket (Phía Học Viên)!", e.type);

            if (e.type === 'SOS_RESOLVED' && e.detail) {
                setSosTickets(prev => prev.map(t =>
                    t.id === e.detail.ticketId
                        ? { ...t, status: 'RESOLVED', note: e.detail.note || t.note }
                        : t
                ));
            }

            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (isMounted) fetchData();
            }, 1000);
        };

        window.addEventListener('realtime_update', handleRealtimeUpdate);
        window.addEventListener('realtime_update_client', handleRealtimeUpdate);
        window.addEventListener('DIET_LOG_REVIEWED', handleRealtimeUpdate);
        window.addEventListener('SOS_RESOLVED', handleRealtimeUpdate);

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener('realtime_update', handleRealtimeUpdate);
            window.removeEventListener('realtime_update_client', handleRealtimeUpdate);
            window.removeEventListener('DIET_LOG_REVIEWED', handleRealtimeUpdate);
            window.removeEventListener('SOS_RESOLVED', handleRealtimeUpdate);
        };
    }, [fetchData, loadResNetDishes]);

    const [dietFilterOn, setDietFilterOn] = useState(true);
    const [manualSendToPt, setManualSendToPt] = useState(false);
    const [pendingSubmitPrompt, setPendingSubmitPrompt] = useState(null);
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [recipeName, setRecipeName] = useState('');
    const [postMealPrompt, setPostMealPrompt] = useState(null);
    const [onboardingBanner, setOnboardingBanner] = useState(false);

    const loadSavedRecipes = useCallback(async () => {
        try {
            const res = await recipeService.list();
            setSavedRecipes(res.data.data || []);
        } catch {
            setSavedRecipes([]);
        }
    }, []);

    useEffect(() => {
        if (inputMode === 'recipe') {
            loadSavedRecipes();
        }
    }, [inputMode, loadSavedRecipes]);

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
        if (foodSearchQuery && foodSearchQuery.length >= 2) {
            searchFoods(foodSearchQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dietFilterOn]);

    const searchFoods = async (q) => {
        setFoodSearchQuery(q);
        if (!q || q.length < 2) {
            setFoodSearchResults([]);
            return;
        }
        try {
            const res = await dietService.searchFoods(q, { dietFilter: dietFilterOn });
            setFoodSearchResults(res.data.data || []);
        } catch (err) {
            console.error('Food search failed', err);
        }
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
        setFoodSearchQuery('');
        setFoodSearchResults([]);
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
            formData.append('meal_type', aiMealType);
            formData.append('mealSource', 'HOME_COOKED');

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
                selectedFoodCode: selectedCode,
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
                sendToPt: false,
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

        let currentGrams = 350;
        try {
            const res = raw.userAdjustedGrams || raw.portionSize || raw.estimatedTotalGrams || 350;
            currentGrams = Number(res) || 350;
        } catch {
            currentGrams = 350;
        }

        setConfirmModal({
            logId: log.id,
            confirmed: false,
            isEditing: true,
            topPredictions: safeTopPredictions,
            selectedFoodCode: selectedCode,
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
                mealSource: 'HOME_COOKED',
                sendToPt: manualSendToPt,
                items: ingredientItems.map((it) => ({
                    foodItemId: it.foodItemId,
                    quantityG: it.quantityG,
                })),
            });
            toast.success(manualSendToPt ? 'Đã lưu và gửi PT kiểm tra!' : 'Đã lưu bữa ăn!');
            const logsRes = await dietService.getLogs({ page: 0, size: 1 });
            const newLogId = logsRes.data.data?.content?.[0]?.id;
            if (newLogId && hasActivePt) schedulePostMealPrompt(newLogId);
            setManualSendToPt(false);
            setIngredientItems([]);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lưu thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveRecipe = async () => {
        if (!recipeName?.trim() || ingredientItems.length === 0) {
            toast.error('Nhập tên và ít nhất 1 nguyên liệu');
            return;
        }
        try {
            setUploading(true);
            await recipeService.create({
                name: recipeName.trim(),
                ingredients: ingredientItems.map((it) => ({
                    foodItemId: it.foodItemId,
                    gram: it.quantityG,
                })),
            });
            toast.success('Đã lưu công thức!');
            setRecipeName('');
            loadSavedRecipes();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không lưu được công thức');
        } finally {
            setUploading(false);
        }
    };

    const handleLogFromRecipe = async (e) => {
        e.preventDefault();
        if (ingredientItems.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 nguyên liệu');
            return;
        }
        try {
            setUploading(true);
            let recipeId = null;
            if (recipeName?.trim()) {
                const saved = await recipeService.create({
                    name: recipeName.trim(),
                    ingredients: ingredientItems.map((it) => ({
                        foodItemId: it.foodItemId,
                        gram: it.quantityG,
                    })),
                });
                recipeId = saved.data.data?.id;
                loadSavedRecipes();
            }
            const res = await dietService.createLog({
                mealType: manualMealType,
                mealSource: 'HOME_COOKED',
                sendToPt: manualSendToPt,
                recipeId,
                items: recipeId ? undefined : ingredientItems.map((it) => ({
                    foodItemId: it.foodItemId,
                    quantityG: it.quantityG,
                })),
            });
            toast.success('Đã ghi nhật ký từ công thức!');
            const logId = res.data.data?.id;
            if (logId && hasActivePt) schedulePostMealPrompt(logId);
            setManualSendToPt(false);
            setIngredientItems([]);
            setRecipeName('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lưu thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleLogFromSavedRecipe = async (recipeId) => {
        try {
            setUploading(true);
            const res = await dietService.createLog({
                mealType: manualMealType,
                mealSource: 'HOME_COOKED',
                sendToPt: manualSendToPt,
                recipeId,
            });
            toast.success('Đã ghi nhật ký từ công thức đã lưu!');
            const logId = res.data.data?.id;
            if (logId && hasActivePt) schedulePostMealPrompt(logId);
            setManualSendToPt(false);
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
            toast.success('Đã xóa bữa ăn thành công');
            fetchData();
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
        if (!confirmModal?.logId || !confirmModal?.selectedFoodCode) return;
        try {
            setConfirmingFood(true);

            const res = await dietService.confirmRecognition(
                confirmModal.logId,
                confirmModal.selectedFoodCode,
                confirmModal.adjustedGrams,
                confirmModal.sendToPt ?? false
            );

            const data = res.data?.data;
            const warnings = data?.allergyWarnings;
            toast.success('Xác nhận & lưu thành công');
            if (confirmModal.logId && hasActivePt) schedulePostMealPrompt(confirmModal.logId);
            if (data?.dietPrefWarning) {
                toast.warning(data.dietPrefWarning);
                setConfirmModal((prev) => prev ? { ...prev, dietPrefWarning: data.dietPrefWarning } : prev);
            }
            if (data?.controlLoopMessage && data?.intakeStatus && data.intakeStatus !== 'OK') {
                toast.info(data.controlLoopMessage);
            }
            if (data?.suggestSubmitToPt) {
                setPendingSubmitPrompt({ logId: confirmModal.logId, message: data.controlLoopMessage });
            }
            if (warnings?.length) {
                setConfirmModal((prev) => ({ ...prev, allergyWarnings: warnings }));
                setTimeout(() => {
                    setConfirmModal(null);
                    fetchData();
                }, 2500);
            } else {
                setConfirmModal(null);
                fetchData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xác nhận món ăn');
        } finally {
            setConfirmingFood(false);
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
                if (file.size > MAX_IMAGE_SIZE) {
                    toast.error(`${file.name} quá lớn. Tối đa 5MB.`);
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
                toast.success('Đã tải hình ảnh lên thành công!');
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Không thể tải hình ảnh lên');
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const handleSetPrimary = async (logId, imageId) => {
        try {
            await dietService.setPrimaryImage(logId, imageId);
            toast.success('Đã cập nhật ảnh chính');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể cập nhật');
        }
    };

    const handleDeleteImage = async (logId, imageId) => {
        try {
            await dietService.deleteImage(logId, imageId);
            toast.success('Đã xóa hình ảnh');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa hình ảnh');
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
            fetchData();
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
                </div>
                <Button onClick={fetchData} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Đồng bộ dữ liệu
                </Button>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Cột trái: Nhập liệu & Nhật ký hành trình */}
                <div className="lg:col-span-8 space-y-8">
                    <FoodInputCard
                        inputMode={inputMode}
                        setInputMode={setInputMode}
                        aiMealType={aiMealType}
                        setAiMealType={setAiMealType}
                        dragActive={dragActive}
                        setDragActive={setDragActive}
                        selectedFile={selectedFile}
                        setSelectedFile={setSelectedFile}
                        analyzing={analyzing}
                        handleAnalyze={handleAnalyze}
                        fileInputRef={fileInputRef}
                        handleFileSelect={handleFileSelect}
                        manualMealType={manualMealType}
                        setManualMealType={setManualMealType}
                        foodSearchQuery={foodSearchQuery}
                        setFoodSearchQuery={setFoodSearchQuery}
                        foodSearchResults={foodSearchResults}
                        searchFoods={searchFoods}
                        addIngredientFromSearch={addIngredientFromSearch}
                        ingredientItems={ingredientItems}
                        updateIngredientQty={updateIngredientQty}
                        removeIngredient={removeIngredient}
                        ingredientTotals={ingredientTotals}
                        handleManualSubmit={handleManualSubmit}
                        uploading={uploading}
                        dietFilterOn={dietFilterOn}
                        setDietFilterOn={setDietFilterOn}
                        manualSendToPt={manualSendToPt}
                        setManualSendToPt={setManualSendToPt}
                        savedRecipes={savedRecipes}
                        recipeName={recipeName}
                        setRecipeName={setRecipeName}
                        handleSaveRecipe={handleSaveRecipe}
                        handleLogFromRecipe={handleLogFromRecipe}
                        handleLogFromSavedRecipe={handleLogFromSavedRecipe}
                    />

                    {pendingSubmitPrompt && hasActivePt && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-violet-900">Gửi PT kiểm tra?</p>
                                <p className="text-sm text-violet-700">{pendingSubmitPrompt.message || 'Bữa này lệch macro — PT có thể hỗ trợ điều chỉnh.'}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setPendingSubmitPrompt(null)}>Không</Button>
                                <Button size="sm" onClick={async () => {
                                    try {
                                        await dietService.submitForReview(pendingSubmitPrompt.logId);
                                        toast.success('Đã gửi PT kiểm tra');
                                        setPendingSubmitPrompt(null);
                                        fetchData();
                                    } catch (e) {
                                        toast.error(e.response?.data?.message || 'Không gửi được');
                                    }
                                }}>Gửi PT</Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-5">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" /> Nhật ký hôm nay
                        </h3>
                        <MealSection
                            logs={logs}
                            loading={loading}
                            fetchData={fetchData}
                            handleEditLog={handleEditLog}
                            handleUploadAdditionalImages={handleUploadAdditionalImages}
                            handleDelete={handleDelete}
                            handleSetPrimary={handleSetPrimary}
                            handleDeleteImage={handleDeleteImage}
                            setSosDietLogId={setSosDietLogId}
                            setSosMessage={setSosMessage}
                            setIsSosModalOpen={setIsSosModalOpen}
                            hasActivePt={hasActivePt}
                        />
                    </div>
                </div>

                {/* Cột phải: Thống kê calo & Yêu cầu SOS */}
                <div className="lg:col-span-4 space-y-6">
                    <NutritionProgress summary={summary} />

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
            />

            <PostMealRatingSheet
                logId={postMealPrompt}
                open={!!postMealPrompt}
                onClose={() => setPostMealPrompt(null)}
            />
        </div>
    );
}