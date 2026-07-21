// src/pages/pt/PtPortfolioEditor.jsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
    Camera, Plus, Trash2, Save, ImagePlus, Loader2, LayoutTemplate,
    Link as LinkIcon, Image as ImageIcon, Lock, ShieldCheck, FileEdit,
    AlertCircle, CheckCircle2, GraduationCap, MapPin, Target, Clock,
    UserCircle, Quote, Send, Briefcase, Award, FileUp, UploadCloud,
    Monitor, Globe, Dumbbell, Calendar, Phone, Banknote, ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { toast } from 'sonner';

const getPermanentUrl = (url) => {
    if (!url) return '';
    return url.split('?')[0];
};

const GOAL_OPTIONS_KYC = [
    { value: 'WEIGHT_LOSS', label: 'Giảm cân' },
    { value: 'WEIGHT_GAIN', label: 'Tăng cân' },
    { value: 'MAINTAIN', label: 'Duy trì' },
    { value: 'PREGNANT', label: 'Mang thai' },
    { value: 'RECOVERY', label: 'Phục hồi' },
];

const DIET_OPTIONS_KYC = [
    { value: 'NORMAL', label: 'Ăn thường' },
    { value: 'VEGETARIAN', label: 'Ăn chay' },
    { value: 'VEGAN', label: 'Thuần chay' },
    { value: 'KETO', label: 'Keto' },
    { value: 'EAT_CLEAN', label: 'Eat clean' },
];

const SPECIALIZATION_OPTIONS = [
    'Giảm cân', 'Tăng cơ', 'Thể hình', 'Yoga', 'Pilates',
    'Cardio', 'CrossFit', 'Boxing', 'Bơi lội', 'Dinh dưỡng',
    'Phục hồi chức năng', 'Thể lực cho người cao tuổi',
];

const RATE_UNIT_OPTIONS = [
    { value: 'SESSION_60', label: 'Mỗi buổi (60 phút)' },
    { value: 'SESSION_90', label: 'Mỗi buổi (90 phút)' },
    { value: 'HOUR', label: 'Mỗi giờ' },
    { value: 'MONTH', label: 'Mỗi tháng' },
];

const TRAINING_MODE_OPTIONS = [
    { value: 'OFFLINE', label: 'Trực tiếp (Offline)', icon: Dumbbell },
    { value: 'ONLINE', label: 'Online', icon: Monitor },
    { value: 'BOTH', label: 'Cả hai', icon: Globe },
];

const LOCATION_OPTIONS = [
    'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ',
    'Hải Phòng', 'Bình Dương', 'Đồng Nai', 'Vũng Tàu', 'Khác',
];

const newEmptyCert = () => ({
    _id: Math.random().toString(36).slice(2),
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: '',
    neverExpires: false,
    certificateImageUrl: '',
    imagePreview: null,
    isUploading: false,
});

function CertCardModal({ cert, index, onChange, onRemove, onImageUpload, disabled }) {
    const imageRef = useRef(null);

    return (
        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                        {index + 1}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Chứng chỉ #{index + 1}</span>
                </div>
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Tên chứng chỉ *</label>
                    <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => onChange(index, 'name', e.target.value)}
                        disabled={disabled}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Tổ chức cấp *</label>
                    <input
                        type="text"
                        value={cert.issuingOrganization}
                        onChange={(e) => onChange(index, 'issuingOrganization', e.target.value)}
                        disabled={disabled}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Ngày cấp *</label>
                    <input
                        type="month"
                        value={cert.issueDate}
                        max={new Date().toISOString().slice(0, 7)}
                        onChange={(e) => onChange(index, 'issueDate', e.target.value)}
                        disabled={disabled}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Ngày hết hạn</label>
                    {cert.neverExpires ? (
                        <div className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-700 font-medium">
                            Không hết hạn ∞
                        </div>
                    ) : (
                        <input
                            type="month"
                            value={cert.expiryDate}
                            min={cert.issueDate}
                            onChange={(e) => onChange(index, 'expiryDate', e.target.value)}
                            disabled={disabled}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                        />
                    )}
                    {!disabled && (
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cert.neverExpires}
                                onChange={(e) => {
                                    onChange(index, 'neverExpires', e.target.checked);
                                    if (e.target.checked) onChange(index, 'expiryDate', '');
                                }}
                                className="rounded"
                            />
                            <span className="text-[11px] font-medium text-slate-500">Không có ngày hết hạn</span>
                        </label>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">Ảnh chứng chỉ (JPG/PNG/PDF)</label>
                <input
                    ref={imageRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={disabled}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImageUpload(index, file);
                        e.target.value = null;
                    }}
                />

                {cert.certificateImageUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        {cert.imagePreview ? (
                            <img src={cert.imagePreview} alt="cert" className="w-12 h-12 object-cover rounded-lg border border-emerald-200" />
                        ) : (
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-700">Đã đính kèm ảnh</p>
                            <a href={getPermanentUrl(cert.certificateImageUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">
                                Xem file
                            </a>
                        </div>
                        {!disabled && (
                            <Button type="button" size="sm" variant="outline" onClick={() => imageRef.current?.click()} disabled={cert.isUploading} className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs">
                                Đổi ảnh
                            </Button>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => !disabled && !cert.isUploading && imageRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${disabled ? 'bg-slate-50 border-slate-200' : 'cursor-pointer border-slate-300 hover:border-amber-400 hover:bg-amber-50/50'}`}
                    >
                        {cert.isUploading ? (
                            <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                        ) : (
                            <>
                                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                <p className="text-xs font-semibold text-slate-600">Nhấp để tải ảnh</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PtPortfolioEditor() {
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(null);

    const [portfolioData, setPortfolioData] = useState({
        coverPhotoUrl: '',
        transformations: []
    });

    const [lockedProfile, setLockedProfile] = useState(null);

    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [latestRequest, setLatestRequest] = useState(null);
    const [sendingRequest, setSendingRequest] = useState(false);
    const [updateReason, setUpdateReason] = useState('');
    const cvInputRef = useRef(null);
    const [certList, setCertList] = useState([]);

    const [updateForm, setUpdateForm] = useState({
        bio: '',
        trainingPhilosophy: '',
        gender: '',
        contactPhone: '',
        experienceStartDate: '',
        trainingMode: 'ONLINE',
        location: '',
        hourlyRate: '',
        rateUnit: 'SESSION_60',
        specializations: [],
        preferredGoals: [],
        preferredDietTypes: [],
        instagramUrl: '',
        linkedinUrl: '',
        cvUrl: '',
        cvFileName: ''
    });

    const isPending = latestRequest?.status === 'PENDING';
    const isRejected = latestRequest?.status === 'REJECTED';

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const res = await userService.getProfile();
                const data = res.data?.data;
                const ptProfile = data?.ptProfile;

                if (data && ptProfile) {
                    setLockedProfile({
                        fullName: data.fullName,
                        gender: data.gender,
                        bio: ptProfile.bio,
                        trainingPhilosophy: ptProfile.trainingPhilosophy,
                        experienceStartDate: ptProfile.experienceStartDate,
                        trainingMode: ptProfile.trainingMode,
                        location: ptProfile.location,
                        contactPhone: ptProfile.contactPhone,
                        hourlyRate: ptProfile.hourlyRate,
                        rateUnit: ptProfile.rateUnit,
                        specializations: ptProfile.specializations || [],
                        preferredGoals: ptProfile.preferredGoals || [],
                        preferredDietTypes: ptProfile.preferredDietTypes || [],
                        certifications: ptProfile.certifications || [],
                        instagramUrl: ptProfile.instagramUrl,
                        linkedinUrl: ptProfile.linkedinUrl,
                        cvUrl: ptProfile.cvUrl,
                    });

                    setPortfolioData(ptProfile.portfolioShowcase || { coverPhotoUrl: '', transformations: [] });

                    setUpdateForm({
                        bio: ptProfile.bio || '',
                        trainingPhilosophy: ptProfile.trainingPhilosophy || '',
                        gender: data.gender || '',
                        contactPhone: ptProfile.contactPhone || '',
                        experienceStartDate: ptProfile.experienceStartDate || '',
                        trainingMode: ptProfile.trainingMode || 'ONLINE',
                        location: ptProfile.location || '',
                        hourlyRate: ptProfile.hourlyRate || '',
                        rateUnit: ptProfile.rateUnit || 'SESSION_60',
                        specializations: ptProfile.specializations || [],
                        preferredGoals: ptProfile.preferredGoals || [],
                        preferredDietTypes: ptProfile.preferredDietTypes || [],
                        instagramUrl: ptProfile.instagramUrl || '',
                        linkedinUrl: ptProfile.linkedinUrl || '',
                        cvUrl: ptProfile.cvUrl || '',
                        cvFileName: ptProfile.cvUrl ? 'CV_Đã_Tải_Lên.pdf' : ''
                    });

                    if (ptProfile.certifications && ptProfile.certifications.length > 0) {
                        setCertList(ptProfile.certifications.map(c => ({
                            ...c,
                            _id: Math.random().toString(),
                            isUploading: false,
                            certificateImageUrl: getPermanentUrl(c.certificateImageUrl)
                        })));
                    } else {
                        setCertList([newEmptyCert()]);
                    }
                }

                const reqRes = await userService.getPendingPtUpdateRequest();
                if (reqRes.data?.data) {
                    const req = reqRes.data.data;
                    setLatestRequest(req);

                    if (req.status === 'REJECTED' && req.requestedData) {
                        setUpdateReason(req.reason || '');
                        setUpdateForm(prev => ({ ...prev, ...req.requestedData }));
                        if (req.requestedData.certifications && req.requestedData.certifications.length > 0) {
                            setCertList(req.requestedData.certifications.map(c => ({
                                ...c,
                                _id: Math.random().toString(),
                                isUploading: false,
                                certificateImageUrl: getPermanentUrl(c.certificateImageUrl)
                            })));
                        }
                    } else if (req.status === 'PENDING') {
                        setUpdateReason(req.reason || '');
                    }
                }
            } catch (error) {
                console.error("Lỗi lấy dữ liệu:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchAllData();
    }, []);

    const toggleArrayItem = (field, item) => {
        setUpdateForm(p => ({
            ...p,
            [field]: p[field].includes(item) ? p[field].filter(x => x !== item) : [...p[field], item]
        }));
    };

    const handleCvUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File CV tối đa 10MB');
            return;
        }
        try {
            const response = await userService.uploadCv(file);
            setUpdateForm(p => ({ ...p, cvUrl: response.data?.data, cvFileName: file.name }));
            toast.success('CV đã được tải lên!');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Upload CV thất bại');
        }
    };

    const handleCertChange = (index, field, value) => {
        setCertList(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const handleCertImageUpload = async (index, file) => {
        setCertList(prev => prev.map((c, i) => i === index ? { ...c, isUploading: true, imagePreview: URL.createObjectURL(file) } : c));
        try {
            const res = await userService.uploadCertImage(file);
            setCertList(prev => prev.map((c, i) => i === index ? { ...c, certificateImageUrl: res.data?.data, isUploading: false } : c));
            toast.success('Ảnh chứng chỉ đã được tải lên!');
        } catch (err) {
            toast.error('Upload ảnh thất bại');
            setCertList(prev => prev.map((c, i) => i === index ? { ...c, isUploading: false, imagePreview: null } : c));
        }
    };

    const handleSendUpdateRequest = async () => {
        if (!updateReason.trim()) {
            toast.error('Vui lòng nhập lý do thay đổi!');
            return;
        }
        try {
            setSendingRequest(true);
            const filledCerts = certList.filter(c => c.name.trim() || c.issuingOrganization.trim() || c.certificateImageUrl);

            const payload = {
                requestedData: {
                    ...updateForm,
                    experienceStartDate: updateForm.experienceStartDate?.length === 7 ? `${updateForm.experienceStartDate}-01` : updateForm.experienceStartDate,
                    certifications: filledCerts.map(c => ({
                        name: c.name,
                        issuingOrganization: c.issuingOrganization,
                        issueDate: c.issueDate,
                        expiryDate: c.neverExpires ? null : c.expiryDate || null,
                        neverExpires: c.neverExpires,
                        certificateImageUrl: c.certificateImageUrl,
                    }))
                },
                reason: updateReason
            };
            const res = await userService.submitPtUpdateRequest(payload);
            toast.success('Đã gửi yêu cầu thay đổi hồ sơ!');
            setLatestRequest(res.data.data);
            setUpdateModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi gửi yêu cầu');
        } finally {
            setSendingRequest(false);
        }
    };

    const handleSavePortfolio = async () => {
        try {
            setLoading(true);
            const response = await userService.updatePtProfile({ portfolioShowcase: portfolioData });
            if (response.data) {
                toast.success('Cập nhật Thư viện ảnh thành công!');
                setUser({ ...user, ptProfile: response.data.data });
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra khi lưu Portfolio');
        } finally {
            setLoading(false);
        }
    };

    const updateShowcaseField = (field, value) => {
        setPortfolioData(prev => ({ ...prev, [field]: value }));
    };

    const addTransformation = () => {
        setPortfolioData(prev => ({
            ...prev,
            transformations: [...(prev.transformations || []), { id: Date.now().toString(), title: '', story: '', beforeUrl: '', afterUrl: '' }]
        }));
    };

    const removeTransformation = (id) => {
        setPortfolioData(prev => ({
            ...prev,
            transformations: prev.transformations.filter(t => t.id !== id)
        }));
    };

    const updateTransformation = (id, field, value) => {
        setPortfolioData(prev => ({
            ...prev,
            transformations: prev.transformations.map(t => t.id === id ? { ...t, [field]: value } : t)
        }));
    };

    const handleImageUpload = async (type, idOrField, field, file) => {
        if (!file) return;
        const uploadId = type === 'cover' ? 'cover' : `${idOrField}-${field}`;
        setUploadingImage(uploadId);
        try {
            const res = await userService.uploadPortfolioImage(file);
            const imageUrl = getPermanentUrl(res.data.data);

            if (type === 'cover') {
                updateShowcaseField('coverPhotoUrl', imageUrl);
            } else {
                updateTransformation(idOrField, field, imageUrl);
            }
            toast.success('Tải ảnh lên thành công!');
        } catch (error) {
            toast.error('Không thể tải ảnh lên');
        } finally {
            setUploadingImage(null);
        }
    };

    if (fetching) {
        return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    const activeForm = isPending ? latestRequest.requestedData : updateForm;
    const activeCerts = isPending ? latestRequest.requestedData?.certifications || [] : certList;

    return (
        <div className="max-w-[1600px] mx-auto pb-12 animate-fade-in mt-6 px-4">

            <div className="sticky top-[64px] z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 py-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:rounded-b-3xl sm:border-x sm:border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3 pl-2">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <LayoutTemplate className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản lý Hồ sơ & Portfolio</h1>
                        <p className="text-slate-500 mt-0.5 font-medium text-sm">Chỉnh sửa không gian trưng bày và yêu cầu cập nhật hồ sơ chuyên môn.</p>
                    </div>
                </div>
                <div className="pr-2 flex gap-3">
                    <Button
                        onClick={() => setUpdateModalOpen(true)}
                        variant="outline"
                        className={`rounded-xl font-bold h-12 px-6 ${
                            isPending ? 'border-amber-200 text-amber-700 hover:bg-amber-50' :
                                isRejected ? 'border-red-200 text-red-700 hover:bg-red-50' :
                                    'border-blue-200 text-blue-700 hover:bg-blue-50'
                        }`}
                    >
                        {isPending ? <Clock className="w-4 h-4 mr-2" /> : isRejected ? <AlertCircle className="w-4 h-4 mr-2" /> : <FileEdit className="w-4 h-4 mr-2" />}
                        {isPending ? 'Đang chờ duyệt...' : isRejected ? 'Cập nhật bị từ chối' : 'Cập nhật Hồ sơ'}
                    </Button>
                    <Button
                        onClick={handleSavePortfolio}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 h-12 px-8 font-bold transition-all hover:-translate-y-0.5"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {loading ? 'Đang lưu...' : 'Lưu Ảnh Portfolio'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                <div className="xl:col-span-4 space-y-6">
                    <Card className="rounded-[2rem] border-slate-200 shadow-sm bg-slate-50/50 relative overflow-hidden">

                        <div className="absolute top-4 right-4 bg-slate-200/50 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-200 z-10">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Khóa / Đã duyệt</span>
                        </div>

                        <CardContent className="p-6 pt-12 space-y-6">

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <UserCircle className="w-3.5 h-3.5"/> Tiểu sử (Bio)
                                    </h4>
                                    <p className="text-sm font-medium text-slate-700 bg-white p-4 rounded-xl border border-slate-200 leading-relaxed opacity-80 whitespace-pre-wrap">
                                        {lockedProfile?.bio || 'Chưa cập nhật'}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Quote className="w-3.5 h-3.5"/> Triết lý huấn luyện
                                    </h4>
                                    <p className="text-sm font-medium text-slate-700 bg-white p-4 rounded-xl border border-slate-200 leading-relaxed opacity-80 italic">
                                        "{lockedProfile?.trainingPhilosophy || 'Chưa cập nhật'}"
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-200 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5"/> Thông tin cơ bản & Liên hệ
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-xl border border-slate-200 opacity-90">
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Giới tính</p>
                                        <p className="font-bold text-slate-800 mt-0.5">
                                            {lockedProfile?.gender === 'MALE' ? 'Nam' : lockedProfile?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Số điện thoại</p>
                                        <p className="font-bold text-slate-800 mt-0.5">{lockedProfile?.contactPhone || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Kinh nghiệm từ</p>
                                        <p className="font-bold text-slate-800 mt-0.5">
                                            {lockedProfile?.experienceStartDate ? new Date(lockedProfile.experienceStartDate).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Hồ sơ CV</p>
                                        {lockedProfile?.cvUrl ? (
                                            <a href={getPermanentUrl(lockedProfile.cvUrl)} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline mt-0.5 flex items-center gap-1">
                                                Xem CV <ExternalLink className="w-3 h-3"/>
                                            </a>
                                        ) : (
                                            <span className="font-bold text-slate-400 mt-0.5">—</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {lockedProfile?.instagramUrl && (
                                        <a href={lockedProfile.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-pink-50 text-pink-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-pink-100 hover:bg-pink-100">
                                            <LinkIcon className="w-3 h-3"/> Instagram
                                        </a>
                                    )}
                                    {lockedProfile?.linkedinUrl && (
                                        <a href={lockedProfile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100">
                                            <LinkIcon className="w-3 h-3"/> LinkedIn
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-200 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Banknote className="w-3.5 h-3.5"/> Hoạt động & Phí dịch vụ
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-xl border border-slate-200 opacity-90">
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Hình thức</p>
                                        <p className="font-bold text-slate-800 mt-0.5">
                                            {TRAINING_MODE_OPTIONS.find(t => t.value === lockedProfile?.trainingMode)?.label || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Địa điểm</p>
                                        <p className="font-bold text-slate-800 mt-0.5">{lockedProfile?.location || 'Toàn quốc'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Mức phí</p>
                                        <p className="font-bold text-emerald-600 mt-0.5 text-base">
                                            {lockedProfile?.hourlyRate ? parseInt(lockedProfile.hourlyRate).toLocaleString('vi-VN') + ' VNĐ' : 'Liên hệ'}{' '}
                                            <span className="text-xs text-slate-500 font-medium">/ {RATE_UNIT_OPTIONS.find(r => r.value === lockedProfile?.rateUnit)?.label?.toLowerCase() || 'buổi'}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-200 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5"/> Chuyên môn & Mục tiêu
                                </h4>

                                {lockedProfile?.specializations?.length > 0 && (
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Chuyên môn:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {lockedProfile.specializations.map((s, i) => (
                                                <span key={i} className="bg-blue-100/50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-1 rounded-md opacity-80">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {lockedProfile?.preferredGoals?.length > 0 && (
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Mục tiêu hỗ trợ:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {lockedProfile.preferredGoals.map((g, i) => (
                                                <span key={i} className="bg-emerald-100/50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded-md opacity-80">
                                                    {GOAL_OPTIONS_KYC.find(o => o.value === g)?.label || g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {lockedProfile?.preferredDietTypes?.length > 0 && (
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Chế độ ăn:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {lockedProfile.preferredDietTypes.map((d, i) => (
                                                <span key={i} className="bg-indigo-100/50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-1 rounded-md opacity-80">
                                                    {DIET_OPTIONS_KYC.find(o => o.value === d)?.label || d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {lockedProfile?.certifications?.length > 0 && (
                                <div className="border-t border-slate-200 pt-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <GraduationCap className="w-3.5 h-3.5"/> Chứng chỉ chuyên môn
                                    </h4>
                                    <div className="space-y-2">
                                        {lockedProfile.certifications.map((cert, i) => (
                                            <div key={i} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between opacity-80">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{cert.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{cert.issuingOrganization}</p>
                                                </div>
                                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    onClick={() => setUpdateModalOpen(true)}
                                    className={`w-full text-white rounded-xl h-11 font-bold shadow-sm ${
                                        isPending ? 'bg-amber-500 hover:bg-amber-600' :
                                            isRejected ? 'bg-red-500 hover:bg-red-600' :
                                                'bg-slate-800 hover:bg-slate-900'
                                    }`}
                                >
                                    {isPending ? <Clock className="w-4 h-4 mr-2" /> : isRejected ? <AlertCircle className="w-4 h-4 mr-2" /> : <FileEdit className="w-4 h-4 mr-2" />}
                                    {isPending ? 'Xem Yêu cầu đang chờ duyệt' : isRejected ? 'Xem lý do bị từ chối' : 'Gửi Yêu Cầu Thay Đổi Hồ Sơ'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="xl:col-span-8 space-y-6">

                    <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden group">
                        <div className="relative h-64 sm:h-80 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {portfolioData.coverPhotoUrl ? (
                                <>
                                    <img src={getPermanentUrl(portfolioData.coverPhotoUrl)} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                        <label className="cursor-pointer bg-white text-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-slate-100 hover:scale-105 transition-all">
                                            <Camera className="w-4 h-4"/> Cập nhật ảnh bìa
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageUpload('cover', null, null, e.target.files[0])}
                                                disabled={uploadingImage === 'cover'}
                                            />
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                    {uploadingImage === 'cover' ? <Loader2 className="w-10 h-10 animate-spin" /> : <ImageIcon className="w-10 h-10 mb-3" />}
                                    <span className="text-base font-bold">Tải lên Ảnh bìa (Cover)</span>
                                    <span className="text-xs uppercase tracking-widest mt-1.5 opacity-70 font-bold">Tỷ lệ khuyên dùng 16:9</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload('cover', null, null, e.target.files[0])}
                                        disabled={uploadingImage === 'cover'}
                                    />
                                </label>
                            )}
                        </div>
                    </Card>

                    <Card className="rounded-[2rem] border-slate-200 shadow-sm">
                        <CardContent className="p-6 sm:p-8">
                            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Thư viện Kết quả Học viên</h2>
                                </div>
                                <Button onClick={addTransformation} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-bold h-11">
                                    <Plus className="w-5 h-5 mr-1" /> Thêm Case Study
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-10">
                                {portfolioData.transformations?.map((item) => (
                                    <div key={item.id} className="border border-slate-200 rounded-[2rem] relative shadow-sm overflow-hidden flex flex-col md:flex-row">

                                        <button
                                            onClick={() => removeTransformation(item.id)}
                                            className="absolute top-4 right-4 z-20 text-red-500 bg-white hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-all shadow-sm border border-slate-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="relative w-full md:w-5/12 flex shrink-0 bg-slate-100 overflow-hidden min-h-[250px]">
                                            <div className="w-1/2 relative border-r-2 border-white group/img">
                                                {item.beforeUrl ? (
                                                    <>
                                                        <img src={getPermanentUrl(item.beforeUrl)} className="absolute inset-0 w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                            <label className="cursor-pointer bg-white p-3 rounded-full shadow-lg">
                                                                <Camera className="w-5 h-5"/>
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'beforeUrl', e.target.files[0])}/>
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-200">
                                                        <ImagePlus className="w-8 h-8 mb-2" />
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'beforeUrl', e.target.files[0])} />
                                                    </label>
                                                )}
                                                {item.beforeUrl && <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[10px] font-black px-2 py-1 rounded">BEFORE</div>}
                                            </div>

                                            <div className="w-1/2 relative group/img">
                                                {item.afterUrl ? (
                                                    <>
                                                        <img src={getPermanentUrl(item.afterUrl)} className="absolute inset-0 w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                            <label className="cursor-pointer bg-white p-3 rounded-full shadow-lg">
                                                                <Camera className="w-5 h-5"/>
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'afterUrl', e.target.files[0])}/>
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-200">
                                                        <ImagePlus className="w-8 h-8 mb-2" />
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'afterUrl', e.target.files[0])} />
                                                    </label>
                                                )}
                                                {item.afterUrl && <div className="absolute bottom-3 right-3 bg-emerald-500/90 text-white text-[10px] font-black px-2 py-1 rounded">AFTER</div>}
                                            </div>
                                        </div>

                                        <div className="p-8 flex-1 flex flex-col gap-6 bg-slate-50/50">
                                            <input
                                                type="text"
                                                value={item.title}
                                                onChange={e => updateTransformation(item.id, 'title', e.target.value)}
                                                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 font-bold text-base bg-white shadow-sm"
                                                placeholder="Tiêu đề thành tựu..."
                                            />
                                            <textarea
                                                value={item.story}
                                                onChange={e => updateTransformation(item.id, 'story', e.target.value)}
                                                className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-blue-500 font-medium text-sm bg-white flex-1 min-h-[120px] resize-none shadow-sm"
                                                placeholder="Câu chuyện chi tiết..."
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {updateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setUpdateModalOpen(false)}></div>

                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl flex flex-col animate-in zoom-in-95 fade-in duration-200 relative z-10 max-h-[90vh]">

                        <div className={`px-8 py-6 border-b flex items-center justify-between rounded-t-[2rem] shrink-0 ${isPending ? 'bg-amber-50 border-amber-100' : isRejected ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Yêu cầu cập nhật Hồ sơ</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">
                                    {isPending ? 'Bạn đang có một yêu cầu chờ duyệt.' : isRejected ? 'Yêu cầu trước đó bị từ chối. Hãy sửa và gửi lại.' : 'Thay đổi các thông tin đã được kiểm duyệt.'}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-100 text-amber-600' : isRejected ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {isPending ? <Clock className="w-6 h-6" /> : isRejected ? <AlertCircle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8 bg-slate-50/30">

                            {isPending && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3 shadow-sm">
                                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-amber-900">Đang chờ Admin phê duyệt</h4>
                                        <p className="text-sm font-medium text-amber-800 mt-1 leading-relaxed">
                                            Bạn đã gửi yêu cầu vào ngày {new Date(latestRequest.createdAt).toLocaleDateString('vi-VN')}. Không thể thay đổi khi đang chờ duyệt.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isRejected && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3 shadow-sm">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-red-900">Yêu cầu cập nhật bị từ chối</h4>
                                        <p className="text-sm font-medium text-red-800 mt-1 leading-relaxed">
                                            Lý do từ Admin: <strong>{latestRequest.adminNote || 'Không có ghi chú chi tiết'}</strong>
                                        </p>
                                        <p className="text-xs font-bold text-red-700 mt-2">Vui lòng chỉnh sửa lại thông tin bên dưới và gửi lại yêu cầu mới.</p>
                                    </div>
                                </div>
                            )}

                            <fieldset disabled={isPending} className="space-y-10">

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                    <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2"><UserCircle className="w-4 h-4 text-blue-500"/> THÔNG TIN CƠ BẢN</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Giới thiệu bản thân (Bio)</label>
                                            <textarea
                                                value={activeForm.bio}
                                                onChange={(e) => setUpdateForm({ ...updateForm, bio: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm min-h-[100px] resize-none disabled:bg-slate-50"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Triết lý huấn luyện</label>
                                            <textarea
                                                value={activeForm.trainingPhilosophy}
                                                onChange={(e) => setUpdateForm({ ...updateForm, trainingPhilosophy: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm min-h-[80px] resize-none disabled:bg-slate-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Giới tính</label>
                                            <select
                                                value={activeForm.gender}
                                                onChange={(e) => setUpdateForm({ ...updateForm, gender: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white disabled:bg-slate-50"
                                            >
                                                <option value="">Chọn giới tính</option>
                                                <option value="MALE">Nam</option>
                                                <option value="FEMALE">Nữ</option>
                                                <option value="OTHER">Khác</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Số điện thoại liên hệ</label>
                                            <input
                                                type="text"
                                                value={activeForm.contactPhone}
                                                onChange={(e) => setUpdateForm({ ...updateForm, contactPhone: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                    <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-500"/> KINH NGHIỆM & CHUYÊN MÔN</h4>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Bắt đầu làm PT từ tháng/năm</label>
                                        <input
                                            type="month"
                                            value={activeForm.experienceStartDate?.slice(0, 7)}
                                            max={new Date().toISOString().slice(0, 7)}
                                            onChange={(e) => setUpdateForm({ ...updateForm, experienceStartDate: e.target.value })}
                                            className="w-full md:w-1/2 p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Chuyên môn</label>
                                        <div className="flex flex-wrap gap-2">
                                            {SPECIALIZATION_OPTIONS.map(spec => (
                                                <button
                                                    key={spec}
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => toggleArrayItem('specializations', spec)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${activeForm.specializations?.includes(spec) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                                >
                                                    {spec}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Mục tiêu KH phù hợp</label>
                                        <div className="flex flex-wrap gap-2">
                                            {GOAL_OPTIONS_KYC.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => toggleArrayItem('preferredGoals', opt.value)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${activeForm.preferredGoals?.includes(opt.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Chế độ ăn hỗ trợ</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DIET_OPTIONS_KYC.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => toggleArrayItem('preferredDietTypes', opt.value)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${activeForm.preferredDietTypes?.includes(opt.value) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Hình thức Huấn luyện</label>
                                            <select
                                                value={activeForm.trainingMode}
                                                onChange={(e) => setUpdateForm({ ...updateForm, trainingMode: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white disabled:bg-slate-50"
                                            >
                                                {TRAINING_MODE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Địa điểm hoạt động</label>
                                            <select
                                                value={activeForm.location}
                                                onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white disabled:bg-slate-50"
                                            >
                                                <option value="">-- Chọn tỉnh/thành --</option>
                                                {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Phí dịch vụ (VNĐ)</label>
                                            <input
                                                type="number"
                                                value={activeForm.hourlyRate}
                                                onChange={(e) => setUpdateForm({ ...updateForm, hourlyRate: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Tính theo</label>
                                            <select
                                                value={activeForm.rateUnit}
                                                onChange={(e) => setUpdateForm({ ...updateForm, rateUnit: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white disabled:bg-slate-50"
                                            >
                                                {RATE_UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                    <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500"/> CHỨNG CHỈ CHUYÊN MÔN</h4>
                                    {activeCerts.map((cert, i) => (
                                        <CertCardModal
                                            key={cert._id || i}
                                            cert={cert}
                                            index={i}
                                            disabled={isPending}
                                            onChange={handleCertChange}
                                            onRemove={(idx) => setCertList(p => p.filter((_, j) => j !== idx))}
                                            onImageUpload={handleCertImageUpload}
                                        />
                                    ))}
                                    {!isPending && (
                                        <button
                                            type="button"
                                            onClick={() => setCertList(p => [...p, newEmptyCert()])}
                                            className="w-full flex justify-center py-3 border-2 border-dashed border-amber-300 rounded-xl text-amber-600 hover:bg-amber-50 text-sm font-bold transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-2"/> Thêm chứng chỉ khác
                                        </button>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                    <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2"><FileUp className="w-4 h-4 text-purple-500"/> HỒ SƠ & MẠNG XÃ HỘI</h4>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">CV Hiện Tại (PDF/DOC)</label>
                                        <input
                                            ref={cvInputRef}
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleCvUpload}
                                            className="hidden"
                                            disabled={isPending}
                                        />
                                        <div
                                            onClick={() => !isPending && cvInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${isPending ? 'bg-slate-50 border-slate-200' : 'cursor-pointer hover:border-purple-400 hover:bg-purple-50 border-slate-300'}`}
                                        >
                                            {activeForm.cvUrl ? (
                                                <div className="flex items-center justify-center gap-2 text-purple-700">
                                                    <FileUp className="w-6 h-6" /> <span className="font-bold text-sm truncate">{activeForm.cvFileName || 'CV đã tải lên'}</span>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-semibold text-slate-500">Nhấp để tải lên CV mới</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Instagram URL</label>
                                            <input
                                                type="url"
                                                value={activeForm.instagramUrl}
                                                onChange={(e) => setUpdateForm({ ...updateForm, instagramUrl: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">LinkedIn URL</label>
                                            <input
                                                type="url"
                                                value={activeForm.linkedinUrl}
                                                onChange={(e) => setUpdateForm({ ...updateForm, linkedinUrl: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm disabled:bg-slate-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!isPending && (
                                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                                        <label className="block text-sm font-black text-blue-800 mb-2">Lý do thay đổi hồ sơ *</label>
                                        <textarea
                                            value={updateReason}
                                            onChange={(e) => setUpdateReason(e.target.value)}
                                            className="w-full p-4 rounded-xl border border-blue-200 focus:border-blue-500 outline-none text-sm font-medium min-h-[100px] resize-none"
                                            placeholder="Hãy nêu rõ lý do bạn muốn cập nhật thông tin để Admin xét duyệt nhanh hơn..."
                                        />
                                    </div>
                                )}
                            </fieldset>
                        </div>

                        <div className="flex bg-slate-50 p-6 gap-4 border-t border-slate-200 shrink-0 rounded-b-[2rem]">
                            <Button
                                variant="ghost"
                                onClick={() => setUpdateModalOpen(false)}
                                className="flex-1 rounded-xl font-bold text-slate-600 hover:bg-slate-200 h-12"
                            >
                                Đóng
                            </Button>
                            {!isPending && (
                                <Button
                                    onClick={handleSendUpdateRequest}
                                    disabled={sendingRequest}
                                    className="flex-1 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 h-12 transition-all hover:-translate-y-0.5"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {sendingRequest ? 'Đang gửi...' : isRejected ? 'Gửi Lại Yêu Cầu' : 'Gửi Yêu Cầu Duyệt'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}