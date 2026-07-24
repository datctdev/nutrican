import { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import ProgressTimelineCard from './components/ProgressTimelineCard';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
    Loader2, ArrowLeft, Target, Beef, Wheat, Droplet,
    Upload, CheckCircle2, Zap, Scale, Heart, TrendingUp,
    Pencil, X, Activity, AlertTriangle, RefreshCw, ArrowDown
} from 'lucide-react';
import {
    ACTIVITY_LEVEL_OPTIONS,
    DEFAULT_ACTIVITY_LEVEL,
    ActivityLevelInfoTooltip,
    ActivityLoadInputs,
    deriveActivityLevel,
} from './components/activityLevelOptions';
import { validateInbodyFile } from '../../utils/inbodyUpload';

export default function MacroTargetsPage() {
    const fileInputRef = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [macros, setMacros] = useState({ dailyCalories: 0, protein: 0, carb: 0, fat: 0 });
    const [nutritionGoal, setNutritionGoal] = useState('MAINTAIN');
    const [dietPreference, setDietPreference] = useState(null);
    const [pregnancyTrimester, setPregnancyTrimester] = useState(1);
    const [activityLevel, setActivityLevel] = useState(DEFAULT_ACTIVITY_LEVEL);
    const [sessionsPerWeek, setSessionsPerWeek] = useState('');
    const [minutesPerSession, setMinutesPerSession] = useState('');
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [hasActivePt, setHasActivePt] = useState(false);
    const [progressGoals, setProgressGoals] = useState(null);
    const [bodyMetricHistory, setBodyMetricHistory] = useState([]);
    const [milestones, setMilestones] = useState([]);

    const [isAnalyzingInbody, setIsAnalyzingInbody] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [updateForm, setUpdateForm] = useState({
        weight: '',
        bodyFatPercent: '',
        muscleMass: '',
        lbm: ''
    });
    const [inBodyPreview, setInBodyPreview] = useState(null);

    const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);
    const [previewMacros, setPreviewMacros] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [recalcMenuOpen, setRecalcMenuOpen] = useState(false);

    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editGoalForm, setEditGoalForm] = useState({
        nutritionGoal: 'MAINTAIN',
        targetWeight: '',
        targetDate: ''
    });

    const activityPayload = () => {
        const derived = deriveActivityLevel(sessionsPerWeek, minutesPerSession);
        if (derived != null) {
            return {
                sessionsPerWeek: Number(sessionsPerWeek),
                minutesPerSession: Number(minutesPerSession),
                activityLevel: derived,
            };
        }
        return { activityLevel };
    };

    useEffect(() => {
        if (!recalcMenuOpen || hasActivePt) return;
        let cancelled = false;
        (async () => {
            try {
                const suggestionRes = await userService.getMacroSuggestion({
                    nutritionGoal,
                    pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
                    ...activityPayload(),
                });
                const m = suggestionRes.data?.data;
                if (!cancelled && m) {
                    setPreviewMacros({
                        dailyCalories: m.dailyCalories || 0,
                        protein: m.protein || 0,
                        carb: m.carb || m.carbs || 0,
                        fat: m.fat || 0,
                    });
                }
            } catch {
                if (!cancelled) setPreviewMacros(null);
            }
        })();
        return () => { cancelled = true; };
    }, [activityLevel, sessionsPerWeek, minutesPerSession, recalcMenuOpen, hasActivePt, nutritionGoal, pregnancyTrimester]);

    const openGoalModal = () => {
        setEditGoalForm({
            nutritionGoal: progressGoals?.nutritionGoal || nutritionGoal || 'MAINTAIN',
            targetWeight: progressGoals?.targetWeight || '',
            targetDate: progressGoals?.targetDate || ''
        });
        setShowGoalModal(true);
    };

    const handleSaveGoal = async () => {
        const currentWeight = bodyMetricHistory[0]?.weight || 0;
        const target = Number(editGoalForm.targetWeight);
        const previousGoal = progressGoals?.nutritionGoal || nutritionGoal;

        if (editGoalForm.nutritionGoal === 'WEIGHT_LOSS' && currentWeight && target >= currentWeight) {
            return toast.error('Lỗi: Cân nặng mục tiêu (Giảm cân) phải NHỎ HƠN cân nặng hiện tại!');
        }
        if (editGoalForm.nutritionGoal === 'WEIGHT_GAIN' && currentWeight && target <= currentWeight) {
            return toast.error('Lỗi: Cân nặng mục tiêu (Tăng cân) phải LỚN HƠN cân nặng hiện tại!');
        }

        setIsSaving(true);
        try {
            await profileExtensionsService.saveGoals({
                nutritionGoal: editGoalForm.nutritionGoal,
                targetWeight: target || null,
                targetDate: editGoalForm.targetDate || null
            });

            await userService.updatePreferences({
                nutritionGoal: editGoalForm.nutritionGoal
            });

            const goalsRes = await profileExtensionsService.getGoals();
            setProgressGoals(goalsRes.data.data);
            setNutritionGoal(editGoalForm.nutritionGoal);

            if (!hasActivePt && editGoalForm.nutritionGoal !== previousGoal) {
                try {
                    const res = await userService.recalculateMacros({
                        ...activityPayload(),
                        nutritionGoal: editGoalForm.nutritionGoal,
                        pregnancyTrimester: editGoalForm.nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
                    });
                    const data = res.data?.data;
                    if (data?.macros) {
                        setMacros({
                            dailyCalories: data.macros.dailyCalories || 0,
                            protein: data.macros.protein || 0,
                            carb: data.macros.carb || data.macros.carbs || 0,
                            fat: data.macros.fat || 0,
                        });
                    }
                    window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
                    toast.success('Đã cập nhật mục tiêu và tính lại macro');
                } catch (e) {
                    toast.warning('Đã lưu mục tiêu, nhưng chưa cập nhật lại macro — vui lòng thử lại');
                }
            } else {
                toast.success('Đã cập nhật mục tiêu thành công');
            }
            setShowGoalModal(false);
        } catch (err) {
            toast.error('Lỗi khi lưu mục tiêu');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [macrosRes, profileRes, goalsRes, metricsRes, milestonesRes, ptRes] = await Promise.all([
                userService.getMacroTarget().catch(() => ({ data: { data: null } })),
                userService.getProfile().catch(() => ({ data: { data: null } })),
                profileExtensionsService.getGoals().catch(() => ({ data: { data: null } })),
                profileExtensionsService.getBodyMetrics({ page: 0, size: 20 }).catch(() => ({ data: { data: [] } })),
                profileExtensionsService.getMilestones().catch(() => ({ data: { data: [] } })),
                profileExtensionsService.hasActivePt().catch(() => ({ data: { data: { hasActivePt: false } } })),
            ]);

            if (macrosRes.data?.data) {
                setMacros({
                    dailyCalories: macrosRes.data.data.dailyCalories || 0,
                    protein: macrosRes.data.data.protein || 0,
                    carb: macrosRes.data.data.carb || macrosRes.data.data.carbs || 0,
                    fat: macrosRes.data.data.fat || 0,
                });
            }

            if (profileRes.data?.data) {
                setNutritionGoal(profileRes.data.data.nutritionGoal || 'MAINTAIN');
                setDietPreference(profileRes.data.data.dietPreference || null);
                setPregnancyTrimester(profileRes.data.data.pregnancyTrimester || 1);
                setActivityLevel(profileRes.data.data.activityLevel || DEFAULT_ACTIVITY_LEVEL);
                setSessionsPerWeek(profileRes.data.data.exerciseSessionsPerWeek ?? '');
                setMinutesPerSession(profileRes.data.data.exerciseMinutesPerSession ?? '');
            }

            if (goalsRes.data?.data) {
                setProgressGoals(goalsRes.data.data);
            }

            setBodyMetricHistory(metricsRes.data?.data?.content || metricsRes.data?.data || []);
            setMilestones(milestonesRes.data?.data || []);
            setHasActivePt(Boolean(ptRes.data?.data?.hasActivePt));

        } catch (error) {
            toast.error('Không thể tải dữ liệu tiến độ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInbodyUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const check = validateInbodyFile(file);
        if (!check.ok) {
            toast.error(check.message);
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => setInBodyPreview(ev.target.result);
        reader.readAsDataURL(file);

        setIsAnalyzingInbody(true);
        toast.loading('Đang phân tích phiếu InBody...', { id: 'inbody-ocr' });
        try {
            const res = await profileExtensionsService.analyzeInbody(file);
            const data = res.data.data;
            if (data) {
                setUpdateForm({
                    weight: data.weight ? data.weight.toString() : '',
                    bodyFatPercent: data.bodyFatPercent ? data.bodyFatPercent.toString() : '',
                    muscleMass: data.muscleMass ? data.muscleMass.toString() : '',
                    lbm: data.lbm ? data.lbm.toString() : ''
                });
                toast.success('Phân tích thành công! Kiểm tra lại số liệu.', { id: 'inbody-ocr' });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể phân tích ảnh InBody.', { id: 'inbody-ocr' });
            setInBodyPreview(null);
        } finally {
            setIsAnalyzingInbody(false);
            e.target.value = '';
        }
    };

    const handleUpdateProgressAndMacros = async () => {
        if (!updateForm.weight) {
            toast.error('Vui lòng nhập cân nặng để ghi nhận tiến độ');
            return;
        }

        setIsSaving(true);
        try {
            await profileExtensionsService.recordBodyMetric({
                weight: Number(updateForm.weight),
                bodyFatPercent: updateForm.bodyFatPercent ? Number(updateForm.bodyFatPercent) : null,
                muscleMass: updateForm.muscleMass ? Number(updateForm.muscleMass) : null,
                lbm: updateForm.lbm ? Number(updateForm.lbm) : null,
            });

            if (!hasActivePt) {
                const suggestionRes = await userService.getMacroSuggestion({
                    nutritionGoal,
                    pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
                    ...activityPayload(),
                });

                const newMacros = suggestionRes.data?.data;
                if (newMacros) {
                    const payload = {
                        dailyCalories: newMacros.dailyCalories,
                        protein: newMacros.protein,
                        carb: newMacros.carb || newMacros.carbs,
                        fat: newMacros.fat
                    };
                    await userService.setMacroTarget(payload);
                    setMacros(payload);
                    window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
                }
            }

            const metricsRes = await profileExtensionsService.getBodyMetrics({ page: 0, size: 20 });
            setBodyMetricHistory(metricsRes.data?.data?.content || metricsRes.data?.data || []);

            toast.success(hasActivePt
                ? 'Đã ghi nhận tiến độ cơ thể'
                : 'Tiến độ và Mục tiêu Dinh dưỡng đã được cập nhật!');
            setUpdateForm({ weight: '', bodyFatPercent: '', muscleMass: '', lbm: '' });
            setInBodyPreview(null);

        } catch (error) {
            toast.error('Có lỗi xảy ra khi cập nhật tiến độ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecalculateMacros = async () => {
        const payload = activityPayload();
        if (sessionsPerWeek !== '' || minutesPerSession !== '') {
            if (deriveActivityLevel(sessionsPerWeek, minutesPerSession) == null) {
                toast.error('Nhập đủ buổi/tuần và phút/buổi hợp lệ (0 buổi thì phút = 0)');
                return;
            }
        }
        setShowRecalcConfirm(false);
        setRecalcMenuOpen(false);
        setIsRecalculating(true);
        try {
            const res = await userService.recalculateMacros({
                ...payload,
                nutritionGoal,
                pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
            });
            const data = res.data?.data;
            if (data?.activityLevel) setActivityLevel(data.activityLevel);
            if (data?.macros) {
                setMacros({
                    dailyCalories: data.macros.dailyCalories || 0,
                    protein: data.macros.protein || 0,
                    carb: data.macros.carb || data.macros.carbs || 0,
                    fat: data.macros.fat || 0,
                });
            }
            toast.success('Đã cập nhật mức vận động và tính lại macro');
            window.dispatchEvent(new CustomEvent('MACRO_TARGET_UPDATED'));
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không tính lại được macro');
        } finally {
            setIsRecalculating(false);
        }
    };

    const openRecalcConfirm = async () => {
        setRecalcMenuOpen(false);
        setLoadingPreview(true);
        setShowRecalcConfirm(true);
        try {
            const suggestionRes = await userService.getMacroSuggestion({
                nutritionGoal,
                pregnancyTrimester: nutritionGoal === 'PREGNANT' ? pregnancyTrimester : null,
                ...activityPayload(),
            });
            const m = suggestionRes.data?.data;
            if (m) {
                setPreviewMacros({
                    dailyCalories: m.dailyCalories || 0,
                    protein: m.protein || 0,
                    carb: m.carb || m.carbs || 0,
                    fat: m.fat || 0,
                });
            }
        } catch {
            setPreviewMacros(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const macroDiffRows = [
        { key: 'dailyCalories', label: 'Calo', shortLabel: 'Calo', unit: 'kcal' },
        { key: 'protein', label: 'Đạm', shortLabel: 'Đạm', unit: 'g' },
        { key: 'carb', label: 'Tinh bột', shortLabel: 'Tinh bột', unit: 'g' },
        { key: 'fat', label: 'Chất béo', shortLabel: 'Béo', unit: 'g' },
    ];

    const macroCardStyles = {
        dailyCalories: {
            box: 'bg-slate-50 border border-slate-200',
            label: 'text-slate-400',
            value: 'text-slate-800',
        },
        protein: {
            box: 'bg-rose-50 border border-rose-100',
            label: 'text-rose-400',
            value: 'text-rose-600',
        },
        carb: {
            box: 'bg-amber-50 border border-amber-100',
            label: 'text-amber-400',
            value: 'text-amber-600',
        },
        fat: {
            box: 'bg-indigo-50 border border-indigo-100',
            label: 'text-indigo-400',
            value: 'text-indigo-600',
        },
    };

    const fmtMacroValue = (key, value) => (
        key === 'dailyCalories' ? Number(value ?? 0).toLocaleString() : (value ?? 0)
    );

    const renderMacroCompare = (compact = false) => (
        <div className={`space-y-2 ${compact ? '' : 'space-y-3'}`}>
            <div className={`grid grid-cols-4 text-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
                {macroDiffRows.map(({ key, shortLabel, unit }) => {
                    const style = macroCardStyles[key];
                    return (
                        <div key={`old-${key}`} className={`rounded-xl ${compact ? 'py-2 px-1' : 'py-2.5'} ${style.box}`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${style.label}`}>{shortLabel}</p>
                            <p className={`font-bold ${compact ? 'text-xs' : 'text-sm'} ${style.value}`}>
                                {loadingPreview ? '…' : fmtMacroValue(key, macros[key])}
                                {!loadingPreview && unit !== 'kcal' ? unit : ''}
                            </p>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-center">
                <ArrowDown className={`text-slate-400 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} strokeWidth={2.5} />
            </div>
            <div className={`grid grid-cols-4 text-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
                {macroDiffRows.map(({ key, shortLabel, unit }) => {
                    const style = macroCardStyles[key];
                    const current = macros[key] ?? 0;
                    const next = previewMacros?.[key];
                    const changed = next != null && next !== current;
                    return (
                        <div
                            key={`new-${key}`}
                            className={`rounded-xl ${compact ? 'py-2 px-1' : 'py-2.5'} ${style.box} ${
                                changed ? 'ring-2 ring-indigo-300/60' : ''
                            }`}
                        >
                            <p className={`text-[10px] font-black uppercase tracking-wider ${style.label}`}>{shortLabel}</p>
                            <p className={`font-extrabold ${compact ? 'text-xs' : 'text-sm'} ${style.value}`}>
                                {loadingPreview ? '…' : next != null
                                    ? `${fmtMacroValue(key, next)}${unit !== 'kcal' ? unit : ''}`
                                    : '—'}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const getDeltaString = () => {
        if (bodyMetricHistory.length < 2) return null;
        const current = bodyMetricHistory[0].weight;
        const previous = bodyMetricHistory[1].weight;
        const diff = (current - previous).toFixed(1);
        if (diff > 0) return { text: `Tăng ${Math.abs(diff)}kg so với lần trước`, type: 'gain' };
        if (diff < 0) return { text: `Giảm ${Math.abs(diff)}kg so với lần trước`, type: 'loss' };
        return { text: 'Không thay đổi so với lần trước', type: 'maintain' };
    };

    const delta = getDeltaString();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        );
    }

    const goalLabels = {
        'WEIGHT_LOSS': 'Giảm cân',
        'WEIGHT_GAIN': 'Tăng cân',
        'MAINTAIN': 'Duy trì',
        'PREGNANT': 'Mang thai',
        'RECOVERY': 'Phục hồi'
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <Link to="/profile" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-semibold mb-2">
                        <ArrowLeft className="w-4 h-4" /> Quay lại Hồ sơ
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Tiến độ & Mục tiêu Dinh dưỡng</h1>
                    <p className="text-slate-500 font-medium text-sm sm:text-base mt-1">Theo dõi sự thay đổi cơ thể và tự động tối ưu hóa khẩu phần ăn hằng ngày.</p>
                </div>
            </div>

            {/* ĐÃ SỬA LỖI UI: KHUNG CẢNH BÁO MÀU VÀNG KHÔNG CÒN BỊ ÉP NGHẸT CHỮ */}
            {hasActivePt && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 text-sm text-amber-900 font-semibold shadow-sm leading-relaxed">
                    <div className="flex items-start gap-3.5 flex-1">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
                        <span>Mục tiêu / vận động do PT quản lý — bạn vẫn ghi cân nặng. Muốn chỉnh mục tiêu hãy nhắn PT.</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const draft = `PT ơi, mình muốn điều chỉnh mục tiêu dinh dưỡng / mức vận động. PT hỗ trợ mình nhé!`;
                            sessionStorage.setItem('nutrican_chat_draft', draft);
                            window.location.href = '/chat?draft=1';
                        }}
                        className="shrink-0 text-xs font-extrabold px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
                    >
                        Nhắn PT chỉnh mục tiêu
                    </button>
                </div>
            )}

            {/* ĐÃ SỬA LỖI UI: GRID SỬ DỤNG items-stretch ĐỂ 2 CỘT LUÔNG BẰNG CHIỀU CAO */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">

                {/* CỘT TRÁI (5 PHẦN): MỤC TIÊU MACRO & MỨC VẬN ĐỘNG */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:space-y-0 gap-6">

                    {/* 1. THẺ HERO MACRO TARGET */}
                    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-0 text-white shadow-xl overflow-hidden rounded-3xl relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Target className="w-56 h-56 -mr-10 -mt-10" />
                        </div>
                        <CardContent className="p-6 sm:p-7 relative z-10 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold uppercase tracking-wider text-[11px] mb-2 border border-blue-400/20">
                    Mục tiêu hiện tại
                  </span>
                                    <h2 className="text-3xl font-black tracking-tight">{goalLabels[nutritionGoal] || 'Chưa xác định'}</h2>
                                    {delta && (
                                        <div className={`mt-2.5 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                            delta.type === 'loss' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                                delta.type === 'gain' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                                    'bg-slate-700/80 text-slate-300'
                                        }`}>
                                            <TrendingUp className={`w-3.5 h-3.5 mr-1.5 ${delta.type === 'loss' ? 'rotate-180' : ''}`} />
                                            {delta.text}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-md">
                                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-0.5">Tổng Calories</p>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-4xl font-black text-amber-400">{macros.dailyCalories.toLocaleString()}</span>
                                        <span className="text-slate-300 font-bold text-xs">kcal</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3 Khối Macro nhỏ */}
                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1 text-rose-400">
                                        <Beef className="w-4 h-4" /> <span className="font-extrabold text-xs uppercase">Đạm</span>
                                    </div>
                                    <p className="text-xl sm:text-2xl font-black">{macros.protein}<span className="text-xs font-normal text-slate-400 ml-0.5">g</span></p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1 text-amber-400">
                                        <Wheat className="w-4 h-4" /> <span className="font-extrabold text-xs uppercase">Tinh bột</span>
                                    </div>
                                    <p className="text-xl sm:text-2xl font-black">{macros.carb}<span className="text-xs font-normal text-slate-400 ml-0.5">g</span></p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1 text-indigo-400">
                                        <Droplet className="w-4 h-4" /> <span className="font-extrabold text-xs uppercase">Chất béo</span>
                                    </div>
                                    <p className="text-xl sm:text-2xl font-black">{macros.fat}<span className="text-xs font-normal text-slate-400 ml-0.5">g</span></p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. THẺ MỨC ĐỘ VẬN ĐỘNG (Đồng bộ chiều cao nút bấm h-12 sm:h-14) */}
                    <Card className="bg-white border-slate-200/80 shadow-sm rounded-3xl overflow-hidden flex-1 flex flex-col justify-between">
                        <CardContent className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">Mức độ vận động</h3>
                                        <p className="text-xs text-slate-500 font-medium">TDEE = BMR × R — Áp dụng sẽ tự động tính lại Macro</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Buổi × phút / tuần</label>
                                        <ActivityLevelInfoTooltip />
                                    </div>
                                    {(nutritionGoal || dietPreference) && (
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Mục tiêu: <span className="font-bold text-slate-700">{nutritionGoal}</span>
                                            {dietPreference ? <> · Chế độ ăn: <span className="font-bold text-slate-700">{dietPreference}</span></> : null}
                                        </p>
                                    )}
                                    {hasActivePt && (
                                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 font-semibold">
                                            Mục tiêu / vận động do PT quản lý — nhắn PT nếu cần chỉnh.
                                        </p>
                                    )}
                                    <ActivityLoadInputs
                                        sessionsPerWeek={sessionsPerWeek}
                                        minutesPerSession={minutesPerSession}
                                        onSessionsChange={(v) => {
                                            setSessionsPerWeek(v);
                                            const d = deriveActivityLevel(v, minutesPerSession);
                                            if (d) setActivityLevel(d);
                                        }}
                                        onMinutesChange={(v) => {
                                            setMinutesPerSession(v);
                                            const d = deriveActivityLevel(sessionsPerWeek, v);
                                            if (d) setActivityLevel(d);
                                        }}
                                        disabled={hasActivePt}
                                    />
                                </div>
                            </div>

                            <div className="relative flex pt-4">
                                <Button
                                    onClick={openRecalcConfirm}
                                    disabled={hasActivePt || isRecalculating || isSaving}
                                    className="flex-1 rounded-r-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-2xl h-12 sm:h-14 font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-60 transition-all"
                                >
                                    {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                    Áp dụng & tính lại macro
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setRecalcMenuOpen((v) => !v)}
                                    disabled={hasActivePt || isRecalculating || isSaving}
                                    aria-label="Xem 4 chỉ số sẽ thay đổi"
                                    className="rounded-l-none border-l border-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-2xl px-4 h-12 sm:h-14 disabled:opacity-60 transition-all"
                                >
                                    ▾
                                </Button>

                                {recalcMenuOpen && !hasActivePt && (
                                    <div className="absolute left-0 right-0 bottom-full z-20 mb-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                                            {ACTIVITY_LEVEL_OPTIONS.find((o) => o.value === activityLevel)?.shortLabel || 'Mức mới'} — So sánh thay đổi
                                        </p>
                                        {renderMacroCompare(true)}
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="mt-3 w-full text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl py-2"
                                            onClick={openRecalcConfirm}
                                        >
                                            Xác nhận áp dụng
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* CỘT PHẢI (7 PHẦN): CẬP NHẬT TRẠNG THÁI CƠ THỂ */}
                <div className="lg:col-span-7 flex flex-col">
                    <Card className="bg-white border-slate-200/80 shadow-sm rounded-3xl overflow-hidden flex-1 flex flex-col justify-between">
                        <CardContent className="p-6 sm:p-7 space-y-6 flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                                        <Zap className="w-5 h-5 fill-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">Cập nhật Trạng thái Cơ thể</h3>
                                        <p className="text-xs text-slate-500 font-medium">Ghi nhận số liệu mới để hệ thống theo dõi tiến độ chính xác nhất</p>
                                    </div>
                                </div>

                                {/* KHU VỰC UPLOAD INBODY */}
                                <div className="mb-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] group ${
                                            inBodyPreview ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                                        }`}
                                    >
                                        {inBodyPreview ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                                                <div className="text-left">
                                                    <p className="text-emerald-800 font-extrabold text-sm">Đã tải ảnh InBody thành công!</p>
                                                    <p className="text-xs text-emerald-600 font-medium">Bấm vào đây nếu bạn muốn chọn ảnh khác</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 mb-2.5 transition-colors">
                                                    <Upload className="w-5 h-5" />
                                                </div>
                                                <p className="text-slate-800 font-bold text-sm">Tải Lên Ảnh Phiếu InBody</p>
                                                <p className="text-xs text-slate-400 mt-1 font-medium">AI sẽ tự động đọc số liệu · Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB)</p>
                                            </>
                                        )}
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={handleInbodyUpload} className="hidden" />
                                </div>

                                {/* 4 Ô INPUT NHẬP SỐ LIỆU */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField
                                        label="Cân nặng (kg)"
                                        icon={Scale}
                                        placeholder="vd. 65.5"
                                        value={updateForm.weight}
                                        onChange={(e) => setUpdateForm(f => ({...f, weight: e.target.value.replace(/[^0-9.]/g, '')}))}
                                    />
                                    <InputField
                                        label="Tỷ lệ mỡ (%)"
                                        icon={Heart}
                                        placeholder="vd. 18.5"
                                        value={updateForm.bodyFatPercent}
                                        onChange={(e) => setUpdateForm(f => ({...f, bodyFatPercent: e.target.value.replace(/[^0-9.]/g, '')}))}
                                    />
                                    <InputField
                                        label="Khối lượng cơ (kg)"
                                        placeholder="vd. 32.0"
                                        value={updateForm.muscleMass}
                                        onChange={(e) => setUpdateForm(f => ({...f, muscleMass: e.target.value.replace(/[^0-9.]/g, '')}))}
                                    />
                                    <InputField
                                        label="Khối lượng nạc (kg)"
                                        placeholder="vd. 53.5"
                                        value={updateForm.lbm}
                                        onChange={(e) => setUpdateForm(f => ({...f, lbm: e.target.value.replace(/[^0-9.]/g, '')}))}
                                    />
                                </div>
                            </div>

                            {/* ĐÃ SỬA LỖI UI: ĐỒNG BỘ CHIỀU CAO NÚT SUBMIT h-12 sm:h-14 BẰNG VỚI NÚT BÊN CỘT TRÁI */}
                            <div className="pt-4 border-t border-slate-100">
                                <Button
                                    onClick={handleUpdateProgressAndMacros}
                                    disabled={isSaving || isAnalyzingInbody}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 sm:h-14 font-bold text-base shadow-lg shadow-blue-500/25 transition-all"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                                    {hasActivePt ? 'Ghi nhận tiến độ cơ thể' : 'Ghi nhận Tiến độ & Tự động Tính Macro'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* FULL-WIDTH TIMELINE CHART SECTION */}
            <div className="pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg">
                    <div>
                        <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400">Lịch sử thay đổi</span>
                        <h3 className="text-2xl font-black tracking-tight mt-1">Biểu Đồ Theo Dõi Tiến Độ</h3>
                        <p className="text-slate-400 text-sm font-medium mt-0.5">Quan sát hành trình thay đổi các chỉ số cơ thể qua từng giai đoạn</p>
                    </div>
                    <Button
                        onClick={openGoalModal}
                        variant="outline"
                        disabled={hasActivePt}
                        className="text-xs font-bold border-white/20 text-white bg-white/10 hover:bg-white/20 h-11 px-5 rounded-xl backdrop-blur-md disabled:opacity-50 shrink-0"
                    >
                        <Pencil className="w-4 h-4 mr-2" /> Điều chỉnh Mục Tiêu
                    </Button>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <ProgressTimelineCard
                        goals={progressGoals}
                        milestones={milestones}
                        bodyMetrics={bodyMetricHistory}
                        compact={false}
                    />
                </div>
            </div>

            {/* MODAL 1: XÁC NHẬN TÍNH LẠI MACRO */}
            {showRecalcConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up relative border border-slate-100">
                        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 text-white relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 opacity-20 pointer-events-none">
                                <RefreshCw className="w-28 h-28" />
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black">Tính lại mục tiêu macro?</h3>
                                    <p className="text-indigo-100 text-xs font-medium mt-0.5">
                                        {ACTIVITY_LEVEL_OPTIONS.find((o) => o.value === activityLevel)?.label || 'Mức vận động mới'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                    Áp dụng mức vận động mới sẽ <span className="font-bold">ghi đè</span> mục tiêu Calo / Đạm / Tinh bột / Chất béo hiện tại của bạn.
                                </p>
                            </div>

                            {renderMacroCompare(false)}
                            <p className="text-xs text-slate-400 text-center font-medium">
                                Các giá trị ở trên sẽ được thay bằng hàng bên dưới sau khi áp dụng.
                            </p>
                        </div>

                        <div className="p-6 pt-0 flex gap-3">
                            <Button
                                onClick={() => { setShowRecalcConfirm(false); setPreviewMacros(null); }}
                                variant="ghost"
                                className="flex-1 font-bold text-slate-600 hover:bg-slate-100 rounded-xl py-5"
                            >
                                Huỷ
                            </Button>
                            <Button
                                onClick={handleRecalculateMacros}
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl py-5 shadow-lg shadow-indigo-500/30"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Áp dụng ngay
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: CẬP NHẬT MỤC TIÊU */}
            {showGoalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up relative border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Cập nhật Mục tiêu</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Thiết lập lộ trình mới cho cơ thể</p>
                            </div>
                            <button onClick={() => setShowGoalModal(false)} className="p-2 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">Loại Mục tiêu</label>
                                <select
                                    value={editGoalForm.nutritionGoal}
                                    onChange={(e) => setEditGoalForm(f => ({ ...f, nutritionGoal: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                >
                                    <option value="WEIGHT_LOSS">Giảm cân</option>
                                    <option value="WEIGHT_GAIN">Tăng cân</option>
                                    <option value="MAINTAIN">Duy trì</option>
                                    <option value="PREGNANT">Mang thai</option>
                                    <option value="RECOVERY">Phục hồi</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">
                                    Cân nặng hướng đến (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={editGoalForm.targetWeight}
                                    onChange={(e) => setEditGoalForm(f => ({ ...f, targetWeight: e.target.value }))}
                                    placeholder="Ví dụ: 65.5"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">
                                    Ngày dự kiến đạt được
                                </label>
                                <input
                                    type="date"
                                    value={editGoalForm.targetDate}
                                    onChange={(e) => setEditGoalForm(f => ({ ...f, targetDate: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
                            <Button onClick={() => setShowGoalModal(false)} variant="ghost" className="font-bold text-slate-600 hover:bg-slate-200 rounded-xl px-5 py-5">
                                Hủy
                            </Button>
                            <Button onClick={handleSaveGoal} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-5 shadow-md shadow-blue-500/20">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Lưu Mục tiêu'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component InputField được tối ưu lại kiểu dáng hiện đại hơn
const InputField = ({ icon: Icon, label, className = "", ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>
        <div className="relative flex items-center">
            {Icon && <Icon className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />}
            <input
                className={`w-full py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all ${Icon ? 'pl-10 pr-3' : 'px-4'} ${className}`}
                {...props}
            />
        </div>
    </div>
);