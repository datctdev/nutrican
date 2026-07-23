// src/pages/customer/OnboardingPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { userService } from '../../services/userService';
import { toast } from 'sonner';
import {
    Loader2, ChevronRight, Sparkles, Ruler, Weight, Calendar,
    User, Target, Flame, Heart, Users, ArrowRight, ShieldCheck,
    CheckCircle2, Zap, Trophy, AlertCircle
} from 'lucide-react';
import {
    ACTIVITY_LEVEL_OPTIONS,
    DEFAULT_ACTIVITY_LEVEL,
    ActivityLevelInfoTooltip,
} from './components/activityLevelOptions';
import logo from '../../assets/nutrican_logo.png';
import AllergySelector from './components/AllergySelector';

const getGoalsByGender = (gender) => {
    const base = [
        { value: 'WEIGHT_LOSS', label: 'Giảm cân / Giảm mỡ' },
        { value: 'WEIGHT_GAIN', label: 'Tăng cân / Tăng cơ' },
        { value: 'MAINTAIN', label: 'Duy trì cân nặng hiện tại' },
    ];
    if (gender === 'female') {
        return [
            ...base,
            { value: 'PREGNANT', label: 'Dinh dưỡng thai kỳ (Mang thai)' },
            { value: 'RECOVERY', label: 'Phục hồi thể chất sau mang thai' },
        ];
    }
    return base;
};

const DIET_PREFS = [
    { value: 'NORMAL', label: 'Ăn uống bình thường (Đầy đủ chất)' },
    { value: 'VEGETARIAN', label: 'Ăn chay (Có trứng & sữa - Vegetarian)' },
    { value: 'VEGAN', label: 'Thuần chay (100% thực vật - Vegan)' },
    { value: 'KETO', label: 'Chế độ Keto (Giàu béo, Rất ít Carb)' },
    { value: 'EAT_CLEAN', label: 'Eat Clean (Thực phẩm tươi, Ít chế biến)' },
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // State quản lý lỗi của từng ô Input
    const [errors, setErrors] = useState({});

    // State Bước 1
    const [step1, setStep1] = useState({
        heightCm: '',
        weightKg: '',
        dateOfBirth: '',
        gender: 'male',
    });
    const [dobDisplay, setDobDisplay] = useState('');

    // Handler xử lý định dạng ngày sinh DD/MM/YYYY & xóa lỗi khi đang gõ
    const handleDobChange = (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 8);
        let formatted = val;
        if (val.length > 4) {
            formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
        } else if (val.length > 2) {
            formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
        }
        setDobDisplay(formatted);

        if (errors.dob) setErrors((prev) => ({ ...prev, dob: null }));

        if (val.length === 8) {
            const day = val.slice(0, 2);
            const month = val.slice(2, 4);
            const year = val.slice(4);
            setStep1((s) => ({ ...s, dateOfBirth: `${year}-${month}-${day}` }));
        } else {
            setStep1((s) => ({ ...s, dateOfBirth: '' }));
        }
    };

    // State Bước 2
    const [step2, setStep2] = useState({
        nutritionGoal: 'MAINTAIN',
        dietPreference: 'NORMAL',
        allergyNotes: '',
        activityLevel: DEFAULT_ACTIVITY_LEVEL,
        pregnancyTrimester: 1,
    });

    useEffect(() => {
        profileExtensionsService.getOnboardingStatus()
            .then((res) => {
                const s = res.data?.data;
                if (s?.completed) {
                    navigate('/diet', { replace: true });
                    return;
                }
                if (s?.step) setStep(s.step);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [navigate]);

    const handleSkip = async () => {
        try {
            await profileExtensionsService.skipOnboarding();
            navigate('/diet');
        } catch {
            toast.error('Không thể bỏ qua bước khảo sát');
        }
    };

    // --- HÀM VALIDATION BƯỚC 1 CHẶT CHẼ TRUYỆT ĐỐI ---
    const validateStep1 = () => {
        const newErrors = {};

        // 1. Kiểm tra Chiều cao
        const heightVal = Number(step1.heightCm);
        if (!step1.heightCm || isNaN(heightVal)) {
            newErrors.heightCm = 'Vui lòng nhập chiều cao (chỉ nhập số)';
        } else if (heightVal < 100 || heightVal > 250) {
            newErrors.heightCm = 'Chiều cao thực tế phải từ 100cm đến 250cm';
        }

        // 2. Kiểm tra Cân nặng (Chặn lỗi nhập chữ 'e' ở Ảnh 1)
        const weightVal = Number(step1.weightKg);
        if (!step1.weightKg || isNaN(weightVal)) {
            newErrors.weightKg = 'Vui lòng nhập cân nặng (chỉ nhập số)';
        } else if (weightVal < 30 || weightVal > 300) {
            newErrors.weightKg = 'Cân nặng thực tế phải từ 30kg đến 300kg';
        }

        // 3. Kiểm tra Ngày sinh (Chặn triệt để lỗi 31/02 và năm 5001 ở Ảnh 1 & 2)
        if (dobDisplay) {
            const cleanDigits = dobDisplay.replace(/\D/g, '');
            if (cleanDigits.length !== 8) {
                newErrors.dob = 'Vui lòng nhập đủ 8 chữ số ngày sinh (DD/MM/YYYY)';
            } else {
                const day = parseInt(cleanDigits.slice(0, 2), 10);
                const month = parseInt(cleanDigits.slice(2, 4), 10);
                const year = parseInt(cleanDigits.slice(4, 8), 10);

                const dateObj = new Date(year, month - 1, day);
                const now = new Date();
                const currentYear = now.getFullYear();

                // Kiểm tra tính hợp lệ của lịch (Chặn 31/02, 31/04, 29/02 năm không nhuận)
                if (
                    dateObj.getFullYear() !== year ||
                    dateObj.getMonth() !== month - 1 ||
                    dateObj.getDate() !== day
                ) {
                    newErrors.dob = `Ngày ${day}/${month}/${year} không tồn tại theo lịch thực tế!`;
                } else if (year < 1900 || year > currentYear) {
                    newErrors.dob = `Năm sinh hợp lệ phải từ 1900 đến ${currentYear}`;
                } else if (dateObj > now) {
                    newErrors.dob = 'Ngày sinh không được ở thì tương lai!';
                } else {
                    // Kiểm tra độ tuổi hợp lý (Tối thiểu 10 tuổi)
                    let age = currentYear - year;
                    if (now < new Date(now.getFullYear(), month - 1, day)) age--;
                    if (age < 10) {
                        newErrors.dob = 'Bạn phải từ 10 tuổi trở lên để sử dụng dịch vụ Nutrican';
                    }
                }
            }
        }

        // 4. Kiểm tra Giới tính
        if (!['male', 'female'].includes(step1.gender)) {
            newErrors.gender = 'Giới tính sinh học không hợp lệ';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submitStep1 = async () => {
        if (!validateStep1()) {
            toast.error('Dữ liệu nhập vào chưa hợp lệ!', {
                description: 'Vui lòng kiểm tra lại các thông báo lỗi màu đỏ trên màn hình.'
            });
            return;
        }

        setSubmitting(true);
        try {
            const res = await profileExtensionsService.submitOnboarding({
                step: 1,
                heightCm: Number(step1.heightCm),
                weightKg: Number(step1.weightKg),
                dateOfBirth: step1.dateOfBirth || undefined,
                gender: step1.gender,
            });
            setStep(res.data.data?.step || 2);
            toast.success('Đã lưu chỉ số cơ thể cơ bản!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không thể lưu dữ liệu Bước 1');
        } finally {
            setSubmitting(false);
        }
    };

    const submitStep2 = async () => {
        setSubmitting(true);
        try {
            const res = await profileExtensionsService.submitOnboarding({
                step: 2,
                nutritionGoal: step2.nutritionGoal,
                dietPreference: step2.dietPreference,
                activityLevel: step2.activityLevel,
                pregnancyTrimester: step2.nutritionGoal === 'PREGNANT' ? step2.pregnancyTrimester : null,
                weightKg: Number(step1.weightKg) || undefined,
            });
            await userService.updateAllergies({ allergyNotes: step2.allergyNotes });
            setStep(res.data.data?.step || 3);
            toast.success('Đã tính toán xong chỉ số TDEE & mục tiêu Macro!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không thể lưu dữ liệu Bước 2');
        } finally {
            setSubmitting(false);
        }
    };

    const finishWithPt = async (wantsPt) => {
        setSubmitting(true);
        try {
            await profileExtensionsService.submitOnboarding({ step: 3, wantsPt });
            navigate(wantsPt ? '/marketplace' : '/diet');
        } catch {
            toast.error('Có lỗi khi hoàn tất khảo sát');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="text-sm font-extrabold text-slate-400 uppercase tracking-widest animate-pulse">Đang tải hồ sơ thể chất...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 font-sans selection:bg-emerald-500 selection:text-white overflow-hidden relative">

            {/* CỘT TRÁI: DYNAMIC BRANDING & VALUE SHOWCASE (5 COLS) */}
            <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-bl from-slate-900 via-slate-900 to-emerald-950 text-white border-r border-slate-800/80">
                <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-3 group inline-flex">
                        <img src={logo} alt="Nutrican Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover group-hover:scale-105 transition-transform duration-300 border border-white/10" />
                        <span className="font-black text-2xl tracking-tight text-white">Nutrican<span className="text-emerald-500">.</span></span>
                    </Link>
                </div>

                <div className="relative z-10 my-auto space-y-6 py-8">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Khảo sát thể trạng cá nhân
          </span>

                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
                                Chỉ số cơ thể, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
                  Nền tảng của sự thay đổi.
                </span>
                            </h2>
                            <p className="text-slate-400 text-sm xl:text-base font-medium leading-relaxed">
                                Chiều cao, cân nặng và độ tuổi giúp AI tính toán chính xác chỉ số BMR (năng lượng nền) và khối lượng cơ thể bạn đang có.
                            </p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
                                Mục tiêu rõ ràng, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Phân bổ Macro tối ưu.
                </span>
                            </h2>
                            <p className="text-slate-400 text-sm xl:text-base font-medium leading-relaxed">
                                Tùy thuộc vào mục tiêu Giảm mỡ hay Tăng cơ, hệ thống sẽ chia tỷ lệ chuẩn Protein, Carb và Fat dành riêng cho thực đơn hàng ngày của bạn.
                            </p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
                                Đồng hành cùng PT, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400">
                  Tăng gấp 3 lần tỷ lệ thành công.
                </span>
                            </h2>
                            <p className="text-slate-400 text-sm xl:text-base font-medium leading-relaxed">
                                Huấn luyện viên cá nhân sẽ giúp bạn kiểm duyệt nhật ký ăn uống mỗi ngày, điều chỉnh thực đơn và giữ cho động lực tập luyện luôn ở mức cao nhất.
                            </p>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-800/80 space-y-2">
                        <div className="flex justify-between text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                            <span>Tiến độ khảo sát</span>
                            <span className="text-emerald-400">Bước {step} / 3</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full flex gap-1.5 overflow-hidden">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`h-full flex-1 rounded-full transition-all duration-500 ${
                                        i <= step ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_#10b981]' : 'bg-slate-800'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-2xl backdrop-blur-sm">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 p-1 bg-emerald-400/10 rounded-lg" />
                    <div className="text-xs">
                        <p className="font-bold text-slate-200">Bảo mật thông tin sức khỏe tuyệt đối</p>
                        <p className="text-slate-400 text-[11px]">Dữ liệu của bạn được mã hóa và chỉ dùng để cá nhân hóa lộ trình tập luyện.</p>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: INTERACTIVE WIZARD FORM (7 COLS) */}
            <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-white min-h-screen relative overflow-y-auto">
                <div className="w-full max-w-[500px] space-y-8 animate-fade-in py-8">

                    {/* Mobile Header Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-2.5 mb-2">
                        <img src={logo} alt="Nutrican Logo" className="w-9 h-9 rounded-xl shadow-md object-cover" />
                        <span className="font-black text-2xl tracking-tight text-slate-900">Nutrican<span className="text-emerald-600">.</span></span>
                    </div>

                    {/* Form Header */}
                    <div className="space-y-2 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Bước {step} trên 3
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {step === 1 && 'Chỉ số thể chất cơ bản'}
                            {step === 2 && 'Mục tiêu & Thói quen dinh dưỡng'}
                            {step === 3 && 'Lựa chọn phương thức đồng hành'}
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            {step === 1 && 'Hãy cung cấp các thông số chính xác để AI xây dựng phác đồ nền tảng'}
                            {step === 2 && 'Chúng tôi cần hiểu rõ chế độ ăn và vận động hiện tại của bạn'}
                            {step === 3 && 'Chọn cách bạn muốn thực hiện kế hoạch dinh dưỡng này'}
                        </p>
                    </div>

                    {/* --- BƯỚC 1: THÔNG TIN CƠ BẢN (CÓ VALIDATION CHẶT CHẼ) --- */}
                    {step === 1 && (
                        <div className="space-y-5 animate-slide-in" noValidate>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Chiều cao */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                        Chiều cao (cm) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                                        <Input
                                            placeholder="Ví dụ: 170"
                                            type="number"
                                            value={step1.heightCm}
                                            onChange={(e) => {
                                                setStep1((s) => ({ ...s, heightCm: e.target.value }));
                                                if (errors.heightCm) setErrors((prev) => ({ ...prev, heightCm: null }));
                                            }}
                                            className={`pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-sm shadow-sm transition-all ${errors.heightCm ? 'border-red-500 bg-red-50/30 focus:border-red-500' : ''}`}
                                        />
                                    </div>
                                    {errors.heightCm && (
                                        <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-1 animate-slide-in">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.heightCm}
                                        </p>
                                    )}
                                </div>

                                {/* Cân nặng */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                        Cân nặng hiện tại (kg) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Weight className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                                        <Input
                                            placeholder="Ví dụ: 65.5"
                                            type="number"
                                            step="0.1"
                                            value={step1.weightKg}
                                            onChange={(e) => {
                                                setStep1((s) => ({ ...s, weightKg: e.target.value }));
                                                if (errors.weightKg) setErrors((prev) => ({ ...prev, weightKg: null }));
                                            }}
                                            className={`pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-sm shadow-sm transition-all ${errors.weightKg ? 'border-red-500 bg-red-50/30 focus:border-red-500' : ''}`}
                                        />
                                    </div>
                                    {errors.weightKg && (
                                        <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-1 animate-slide-in">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.weightKg}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Ngày sinh */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                    Ngày sinh (DD/MM/YYYY) <span className="text-slate-400 font-normal">(8 chữ số)</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                                    <Input
                                        placeholder="Ví dụ: 13/02/2004"
                                        type="text"
                                        value={dobDisplay}
                                        onChange={handleDobChange}
                                        className={`pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-sm shadow-sm transition-all ${errors.dob ? 'border-red-500 bg-red-50/30 focus:border-red-500' : ''}`}
                                    />
                                </div>
                                {errors.dob ? (
                                    <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-1 animate-slide-in">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.dob}
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-slate-400 font-medium">Giúp AI xác định độ tuổi và tỷ lệ trao đổi chất BMR chính xác hơn.</p>
                                )}
                            </div>

                            {/* Giới tính */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                    Giới tính sinh học <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                                    <select
                                        value={step1.gender}
                                        onChange={(e) => {
                                            const nextGender = e.target.value;
                                            setStep1((s) => ({ ...s, gender: nextGender }));
                                            if (errors.gender) setErrors((prev) => ({ ...prev, gender: null }));
                                            if (nextGender === 'male' && (step2.nutritionGoal === 'PREGNANT' || step2.nutritionGoal === 'RECOVERY')) {
                                                setStep2((s) => ({ ...s, nutritionGoal: 'MAINTAIN' }));
                                            }
                                        }}
                                        className={`w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-sm text-slate-800 shadow-sm outline-none cursor-pointer transition-all ${errors.gender ? 'border-red-500 bg-red-50/30' : ''}`}
                                    >
                                        <option value="male">Nam giới (Male)</option>
                                        <option value="female">Nữ giới (Female)</option>
                                    </select>
                                </div>
                                {errors.gender && (
                                    <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-1 animate-slide-in">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.gender}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="button"
                                onClick={submitStep1}
                                disabled={submitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 font-extrabold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-300 hover:-translate-y-0.5 mt-4"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <>Tiếp tục sang Bước 2 <ArrowRight className="w-4 h-4 ml-2" /></>}
                            </Button>
                        </div>
                    )}

                    {/* --- BƯỚC 2: MỤC TIÊU DINH DƯỠNG --- */}
                    {step === 2 && (
                        <div className="space-y-5 animate-slide-in">
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                                    <Target className="w-4 h-4 text-emerald-600" /> Mục tiêu cân nặng / sức khỏe
                                </label>
                                <select
                                    value={step2.nutritionGoal}
                                    onChange={(e) => setStep2((s) => ({ ...s, nutritionGoal: e.target.value }))}
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-sm text-slate-800 shadow-sm outline-none cursor-pointer"
                                >
                                    {getGoalsByGender(step1.gender).map((g) => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>

                            {step2.nutritionGoal === 'PREGNANT' && (
                                <div className="space-y-1.5 animate-fade-in p-4 bg-purple-50/60 rounded-2xl border border-purple-200">
                                    <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider block">
                                        Giai đoạn thai kỳ (Tam cá nguyệt)
                                    </label>
                                    <select
                                        value={step2.pregnancyTrimester}
                                        onChange={(e) => setStep2((s) => ({ ...s, pregnancyTrimester: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:ring-2 focus:ring-purple-500 font-bold text-sm text-purple-950 outline-none cursor-pointer"
                                    >
                                        {[1, 2, 3].map((t) => (
                                            <option key={t} value={t}>Tam cá nguyệt thứ {t} (3 tháng {t === 1 ? 'đầu' : t === 2 ? 'giữa' : 'cuối'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                                    <Flame className="w-4 h-4 text-amber-500" /> Chế độ ăn uống ưa thích
                                </label>
                                <select
                                    value={step2.dietPreference}
                                    onChange={(e) => setStep2((s) => ({ ...s, dietPreference: e.target.value }))}
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-sm text-slate-800 shadow-sm outline-none cursor-pointer"
                                >
                                    {DIET_PREFS.map((d) => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Heart className="w-4 h-4 text-rose-500" /> Mức độ vận động
                                    </label>
                                    <ActivityLevelInfoTooltip />
                                </div>
                                <select
                                    value={step2.activityLevel}
                                    onChange={(e) => setStep2((s) => ({ ...s, activityLevel: e.target.value }))}
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 font-bold text-sm text-slate-800 shadow-sm outline-none cursor-pointer"
                                >
                                    {ACTIVITY_LEVEL_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            <AllergySelector
                                value={step2.allergyNotes}
                                onChange={(val) => setStep2((s) => ({ ...s, allergyNotes: val }))}
                            />

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    disabled={submitting}
                                    className="rounded-xl py-6 px-5 font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                    Quay lại
                                </Button>
                                <Button
                                    type="button"
                                    onClick={submitStep2}
                                    disabled={submitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 font-extrabold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <>Tạo mục tiêu Macro & Tiếp tục <ArrowRight className="w-4 h-4 ml-2" /></>}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* --- BƯỚC 3: QUYẾT ĐỊNH ĐỒNG HÀNH --- */}
                    {step === 3 && (
                        <div className="space-y-6 animate-slide-in">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center space-y-1">
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Hoàn tất 99%</p>
                                <p className="text-sm font-semibold text-slate-600">Bạn muốn đạt mục tiêu này bằng phương thức nào?</p>
                            </div>

                            <div
                                onClick={() => !submitting && finishWithPt(true)}
                                className="group relative bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer flex items-start gap-4"
                            >
                                <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                                    <Trophy className="w-3 h-3" /> Khuyên dùng
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center justify-between">
                                        <span>Kết nối Huấn luyện viên (PT)</span>
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                                        PT chuyên nghiệp sẽ kiểm duyệt nhật ký bữa ăn mỗi ngày, lập thực đơn cá nhân hóa và theo dõi sát sao tiến độ giúp bạn.
                                    </p>
                                </div>
                            </div>

                            <div
                                onClick={() => !submitting && finishWithPt(false)}
                                className="group bg-white border-2 border-slate-200 hover:border-blue-500 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer flex items-start gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                                        <span>Tự theo dõi với Máy quét AI</span>
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                                        Sử dụng công cụ chụp ảnh nhận diện món ăn AI để tự tính calo và kiểm soát chỉ số Macro hàng ngày của mình.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-center">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep(2)}
                                    disabled={submitting}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                                >
                                    ← Quay lại chỉnh sửa Mục tiêu
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Footer Skip Link - Chỉ hiển thị ở Bước 1 và Bước 2 */}
                    {step < 3 && (
                        <div className="pt-4 border-t border-slate-100 text-center animate-fade-in">
                            <button
                                type="button"
                                onClick={handleSkip}
                                disabled={submitting}
                                className="text-xs font-bold text-slate-400 hover:text-slate-700 hover:underline transition-all cursor-pointer"
                            >
                                Bỏ qua bước khảo sát — Tôi sẽ thiết lập sau
                            </button>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}