// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
    Loader2, Mail, Lock, User, Eye, EyeOff, Phone,
    ArrowRight, Check, X, Shield, Sparkles, Trophy, Star,
    Scale, FileText, ShieldCheck
} from 'lucide-react';
import logo from '../../assets/nutrican_logo.png';

const PASSWORD_RULES = [
    { key: 'length', label: 'Tối thiểu 8 ký tự', test: (p) => p.length >= 8 },
    { key: 'upper', label: 'Ít nhất 01 chữ hoa (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { key: 'lower', label: 'Ít nhất 01 chữ thường (a-z)', test: (p) => /[a-z]/.test(p) },
    { key: 'number', label: 'Ít nhất 01 chữ số (0-9)', test: (p) => /\d/.test(p) },
];

const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-400' };
    const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
    if (passed <= 1) return { score: 1, label: 'Rất yếu', color: 'bg-red-500', textColor: 'text-red-600' };
    if (passed <= 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500', textColor: 'text-amber-600' };
    if (passed <= 3) return { score: 3, label: 'Khá tốt', color: 'bg-blue-500', textColor: 'text-blue-600' };
    return { score: 4, label: 'Tuyệt đối an toàn', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
};

export default function RegisterPage() {
    const { register, isLoading } = useAuthStore();
    const navigate = useNavigate();

    // State quản lý Form & Lỗi
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        phoneNumber: ''
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const strength = getPasswordStrength(formData.password);

    // State quản lý Modal Pháp lý ngay tại trang Register ('terms' | 'privacy' | null)
    const [activePolicyModal, setActivePolicyModal] = useState(null);

    const validate = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên của bạn';

        if (!formData.email) {
            newErrors.email = 'Vui lòng nhập địa chỉ Email';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Định dạng Email không hợp lệ';
        }

        if (formData.phoneNumber && !/^[0-9]{9,11}$/.test(formData.phoneNumber.trim())) {
            newErrors.phoneNumber = 'Số điện thoại từ 9 đến 11 chữ số';
        }

        if (!formData.password) {
            newErrors.password = 'Vui lòng tạo mật khẩu';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Mật khẩu phải từ 8 ký tự trở lên';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Mật khẩu chưa đạt đủ các quy tắc bảo mật';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            const payload = {
                email: formData.email.trim(),
                password: formData.password,
                fullName: formData.fullName.trim(),
                phoneNumber: formData.phoneNumber.trim() || undefined
            };
            await register(payload);
            try {
                sessionStorage.setItem('pendingVerificationEmail', formData.email.trim());
            } catch {
                // ignore
            }
            toast.success('Đăng ký thành công!', {
                description: 'Vui lòng kiểm tra email để xác nhận tài khoản.',
            });
            navigate('/check-email', { state: { email: formData.email.trim() } });
        } catch (error) {
            toast.error('Đăng ký không thành công', {
                description: error.response?.data?.message || 'Email này có thể đã được sử dụng trong hệ thống.'
            });
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 font-sans selection:bg-blue-500 selection:text-white overflow-hidden relative">

            {/* MODAL TÀI LIỆU PHÁP LÝ NGAY TẠI TRANG REGISTER */}
            {activePolicyModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setActivePolicyModal(null)}
                >
                    <div
                        className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                    {activePolicyModal === 'terms' ? <Scale className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg sm:text-xl tracking-tight">
                                        {activePolicyModal === 'terms' ? 'Điều Khoản Dịch Vụ Nutrican' : 'Chính Sách Bảo Mật Dữ Liệu'}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">Cập nhật lần cuối: Tháng 07/2026</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActivePolicyModal(null)}
                                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Tab Switcher */}
                        <div className="flex border-b border-slate-200 bg-slate-50 px-6 sm:px-8 shrink-0">
                            <button
                                type="button"
                                onClick={() => setActivePolicyModal('terms')}
                                className={`py-3.5 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activePolicyModal === 'terms' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <FileText className="w-4 h-4" /> Điều khoản dịch vụ
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivePolicyModal('privacy')}
                                className={`py-3.5 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activePolicyModal === 'privacy' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <ShieldCheck className="w-4 h-4" /> Chính sách bảo mật
                            </button>
                        </div>

                        {/* Modal Body - Content */}
                        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-600 text-sm leading-relaxed">
                            {activePolicyModal === 'terms' ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-900 text-xs font-semibold leading-relaxed">
                                        <strong>Lưu ý quan trọng:</strong> Nutrican là nền tảng công nghệ hỗ trợ theo dõi dinh dưỡng và kết nối huấn luyện viên cá nhân (PT). Dịch vụ AI và các gợi ý từ PT không thay thế cho chẩn đoán y khoa chuyên nghiệp.
                                    </div>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">1</span>
                                            Chấp Nhận Điều Khoản
                                        </h4>
                                        <p>Khi đăng ký tài khoản và sử dụng nền tảng Nutrican (bao gồm ứng dụng web và hệ thống nhận diện AI), bạn đồng ý tuân thủ toàn bộ các điều khoản và quy định được nêu tại đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.</p>
                                    </section>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">2</span>
                                            Dịch Vụ AI & Nhận Diện Món Ăn
                                        </h4>
                                        <p>Hệ thống AI Scanner của Nutrican sử dụng thị giác máy tính để phân tích hình ảnh bữa ăn và ước tính lượng calo, macronutrients (Protein, Carb, Fat). Mặc dù mô hình đạt độ chính xác cao (~98%), kết quả chỉ mang tính chất tham khảo. Người dùng chịu trách nhiệm kiểm tra và xác nhận khẩu phần thực tế.</p>
                                    </section>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">3</span>
                                            Kết Nối Huấn Luyện Viên (PT Coaching)
                                        </h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Xác thực PT:</strong> Toàn bộ Huấn luyện viên (Certified PT/Freelance PT) trên hệ thống đều phải trải qua quy trình xác thực định danh (eKYC) và kiểm duyệt chứng chỉ chuyên môn bởi Admin.</li>
                                            <li><strong>Thanh toán Ký quỹ (Escrow):</strong> Khi thuê PT, học phí của bạn sẽ được bảo giữ an toàn trong hệ thống ví Nutrican cho đến khi buổi tập hoặc lộ trình hoàn tất đúng thỏa thuận.</li>
                                            <li><strong>Khiếu nại & Hoàn tiền:</strong> Người dùng có quyền gửi yêu cầu khiếu nại (Dispute/Refund) nếu HLV không tuân thủ cam kết chuyên môn. Quyết định của Ban quản trị Nutrican là quyết định cuối cùng.</li>
                                        </ul>
                                    </section>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">4</span>
                                            Trách Nhiệm Của Tài Khoản
                                        </h4>
                                        <p>Bạn có trách nhiệm bảo mật thông tin đăng nhập của mình. Cấm tuyệt đối mọi hành vi tải lên hình ảnh vi phạm pháp luật, sử dụng từ ngữ xúc phạm HLV/Học viên, hoặc gian lận hệ thống ví tín dụng.</p>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs font-semibold leading-relaxed">
                                        <strong>Cam kết bảo mật:</strong> Dữ liệu thể chất và nhật ký ăn uống của bạn là tài sản cá nhân tuyệt mật. Chúng tôi áp dụng mã hóa đầu cuối và không bao giờ bán dữ liệu cho bên thứ ba.
                                    </div>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">1</span>
                                            Dữ Liệu Chúng Tôi Thu Thập
                                        </h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Thông tin định danh:</strong> Họ tên, Địa chỉ Email, Số điện thoại (tùy chọn), Giới tính, Ngày sinh.</li>
                                            <li><strong>Dữ liệu sức khỏe & Thể chất:</strong> Chiều cao, cân nặng, tỷ lệ mỡ (PBF), mục tiêu dinh dưỡng (Giảm cân, Tăng cơ...), hình ảnh phiếu đo InBody và hình ảnh bữa ăn bạn tải lên.</li>
                                        </ul>
                                    </section>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">2</span>
                                            Cách Thức Sử Dụng Dữ Liệu
                                        </h4>
                                        <p>Dữ liệu của bạn được sử dụng duy nhất để: (a) Tính toán TDEE và chỉ số Macro mục tiêu; (b) Phục vụ mô hình AI nhận diện thực phẩm; (c) Cung cấp cho Huấn luyện viên cá nhân <em>(chỉ khi bạn đã đồng ý thuê/kết nối với HLV đó)</em> để họ lập thực đơn và theo dõi tiến độ cho bạn.</p>
                                    </section>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">3</span>
                                            Quyền Riêng Tư & Kiểm Soát Của Bạn
                                        </h4>
                                        <p>Bạn có đầy đủ quyền: Chỉnh sửa hoặc xóa các nhật ký ăn uống; Ngắt kết nối với Huấn luyện viên bất kỳ lúc nào; và Yêu cầu xóa vĩnh viễn toàn bộ dữ liệu tài khoản khỏi máy chủ Nutrican thông qua phần Cài đặt hệ thống.</p>
                                    </section>

                                    <section className="space-y-2">
                                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">4</span>
                                            Bảo Mật Lưu Trữ (MinIO & Cloud)
                                        </h4>
                                        <p>Toàn bộ hình ảnh bữa ăn và chứng chỉ của PT được lưu trữ trên nền tảng đám mây bảo mật cao với cơ chế tạo URL truy cập tạm thời (Presigned URL), ngăn chặn việc truy cập trái phép từ bên ngoài.</p>
                                    </section>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 sm:px-8 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" /> Bạn có thể quay lại tiếp tục điền Form
              </span>
                            <Button type="button" onClick={() => setActivePolicyModal(null)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 font-bold text-xs">
                                Đã hiểu & Quay lại Đăng ký
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* CỘT TRÁI: BRANDING & VALUE PROPOSITION (5 COLS) */}
            <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-bl from-slate-900 via-slate-900 to-blue-950 text-white border-r border-slate-800/80">

                {/* Ambient Glows */}
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
                <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

                {/* Logo */}
                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-3 group inline-flex">
                        <img src={logo} alt="Nutrican Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover group-hover:scale-105 transition-transform duration-300 border border-white/10" />
                        <span className="font-black text-2xl tracking-tight text-white">Nutrican<span className="text-blue-500">.</span></span>
                    </Link>
                </div>

                {/* Content Showcase */}
                <div className="relative z-10 my-auto space-y-6 py-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Bắt đầu hành trình lột xác
          </span>
                    <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
                        Một tài khoản, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Toàn quyền truy cập AI & Huấn luyện viên.
            </span>
                    </h2>

                    <div className="space-y-4 pt-4 border-t border-slate-800/80">
                        <div className="flex items-start gap-3.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 text-blue-400 font-bold text-sm">✓</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200">AI Nhận diện món ăn Việt Nam</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Tự động phân tích calo và macronutrients từ hình ảnh bữa ăn hàng ngày.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400 font-bold text-sm">✓</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200">Huấn luyện viên thực chiến</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Kết nối PT chuyên nghiệp, kiểm tra thực đơn và điều chỉnh lộ trình hàng tuần.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Trust Badge */}
                <div className="relative z-10 flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-2xl backdrop-blur-sm">
                    <Trophy className="w-8 h-8 text-amber-400 shrink-0 p-1 bg-amber-400/10 rounded-lg" />
                    <div className="text-xs">
                        <p className="font-bold text-slate-200">Xác thực KYC & Bằng cấp minh bạch</p>
                        <p className="text-slate-400 text-[11px]">100% Huấn luyện viên đều được kiểm duyệt chứng chỉ chuyên môn.</p>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: REGISTER FORM INTERACTIVE (7 COLS) */}
            <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-white min-h-screen relative overflow-y-auto">
                <div className="w-full max-w-[480px] space-y-8 animate-fade-in py-8">

                    {/* Mobile Header Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-2.5 mb-2">
                        <img src={logo} alt="Nutrican Logo" className="w-9 h-9 rounded-xl shadow-md object-cover" />
                        <span className="font-black text-2xl tracking-tight text-slate-900">Nutrican<span className="text-blue-600">.</span></span>
                    </div>

                    {/* Form Header */}
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Tạo tài khoản mới
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            Điền thông tin bên dưới để đăng ký tài khoản thành viên Nutrican
                        </p>
                    </div>

                    {/* Form Đăng ký */}
                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                        {/* Họ và tên & SĐT (Grid 2 cột trên màn hình lớn) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                    Họ và tên <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        type="text"
                                        placeholder="Nguyễn Văn A"
                                        className={`pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-semibold text-sm transition-all ${errors.fullName ? 'border-red-500 bg-red-50/30' : ''}`}
                                        value={formData.fullName}
                                        onChange={(e) => {
                                            setFormData({ ...formData, fullName: e.target.value });
                                            if (errors.fullName) setErrors({ ...errors, fullName: null });
                                        }}
                                    />
                                </div>
                                {errors.fullName && <p className="text-xs text-red-500 font-bold">{errors.fullName}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                    Số điện thoại <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        type="tel"
                                        placeholder="0901234567"
                                        className={`pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-semibold text-sm transition-all ${errors.phoneNumber ? 'border-red-500 bg-red-50/30' : ''}`}
                                        value={formData.phoneNumber}
                                        onChange={(e) => {
                                            setFormData({ ...formData, phoneNumber: e.target.value });
                                            if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: null });
                                        }}
                                    />
                                </div>
                                {errors.phoneNumber && <p className="text-xs text-red-500 font-bold">{errors.phoneNumber}</p>}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                Địa chỉ Email <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    className={`pl-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-semibold text-sm transition-all ${errors.email ? 'border-red-500 bg-red-50/30' : ''}`}
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        if (errors.email) setErrors({ ...errors, email: null });
                                    }}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500 font-bold">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                Mật khẩu bảo mật <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Tạo mật khẩu từ 8 ký tự..."
                                    className={`pl-10 pr-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-semibold text-sm transition-all ${errors.password ? 'border-red-500 bg-red-50/30' : ''}`}
                                    value={formData.password}
                                    onChange={(e) => {
                                        setFormData({ ...formData, password: e.target.value });
                                        if (errors.password) setErrors({ ...errors, password: null });
                                    }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 font-bold">{errors.password}</p>}

                            {/* Password Strength Meter & Interactive Rules Checklist */}
                            {formData.password && (
                                <div className="space-y-2.5 mt-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Độ mạnh mật khẩu:</span>
                                        <span className={`text-xs font-black uppercase tracking-wider ${strength.textColor}`}>{strength.label}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full flex gap-1 overflow-hidden">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div key={level} className={`h-full flex-1 transition-all duration-300 ${level <= strength.score ? strength.color : 'bg-transparent'}`} />
                                        ))}
                                    </div>

                                    {/* Checklist quy tắc theo thời gian thực */}
                                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/60">
                                        {PASSWORD_RULES.map((rule) => {
                                            const isPassed = rule.test(formData.password);
                                            return (
                                                <div key={rule.key} className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${isPassed ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {isPassed ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                                                    <span>{rule.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                                Xác nhận mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Nhập lại mật khẩu phía trên"
                                    className={`pl-10 pr-10 py-5 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-semibold text-sm transition-all ${errors.confirmPassword ? 'border-red-500 bg-red-50/30' : ''}`}
                                    value={formData.confirmPassword}
                                    onChange={(e) => {
                                        setFormData({ ...formData, confirmPassword: e.target.value });
                                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                                    }}
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1">
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-red-500 font-bold">{errors.confirmPassword}</p>}
                        </div>

                        {/* Điều khoản pháp lý (NÚT BẤM KÍCH HOẠT MODAL TẠI CHỖ) */}
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed pt-1">
                            Bằng việc tiếp tục, bạn đồng ý với{' '}
                            <button
                                type="button"
                                onClick={() => setActivePolicyModal('terms')}
                                className="text-slate-700 font-bold underline hover:text-blue-600 transition-colors cursor-pointer"
                            >
                                Điều khoản dịch vụ
                            </button>
                            {' '}và{' '}
                            <button
                                type="button"
                                onClick={() => setActivePolicyModal('privacy')}
                                className="text-slate-700 font-bold underline hover:text-blue-600 transition-colors cursor-pointer"
                            >
                                Chính sách bảo mật
                            </button>
                            {' '}của Nutrican.
                        </p>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 font-extrabold text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5 mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang khởi tạo tài khoản...</>
                            ) : (
                                <>Tạo tài khoản thành viên <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </form>

                    {/* Footer Navigation */}
                    <p className="text-center text-sm font-semibold text-slate-500 pt-4 border-t border-slate-100">
                        Bạn đã có tài khoản rồi?{' '}
                        <Link to="/login" className="text-blue-600 font-extrabold hover:text-blue-700 hover:underline transition-all inline-flex items-center gap-0.5 ml-1">
                            Đăng nhập ngay
                        </Link>
                    </p>

                </div>
            </div>

        </div>
    );
}