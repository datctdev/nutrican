// src/pages/customer/components/MealSection.jsx
import { useState, useEffect } from 'react';
import { 
    Upload, Camera, FileText, AlertTriangle, Trash2, 
    CheckCircle2, Clock, XCircle, Activity, Star, X, Edit 
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { 
    getFullImageUrl, getLogFoodTitle, FOOD_CODE_LABELS, 
    REASON_LABELS, formatAiConfidence
} from './dietUtils';
import { dietService } from '../../../services/dietService';
import { toast } from 'sonner';

const SafeImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setHasError(false), 0);
        return () => clearTimeout(t);
    }, [src]);

    if (hasError || !src) {
        return (
            <div className={`${className} bg-slate-100 flex flex-col items-center justify-center text-slate-400 border border-slate-200`}>
                <Camera className="w-5 h-5 mb-1 opacity-40" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Lỗi tải ảnh</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setHasError(true)}
        />
    );
};

const StatusBadge = ({ status, reviewStatus }) => {
    const displayKey = reviewStatus === 'PENDING' ? 'REVIEW_PENDING'
        : reviewStatus === 'APPROVED' ? 'REVIEW_APPROVED'
        : reviewStatus === 'REJECTED' ? 'REVIEW_REJECTED'
        : status;
    const map = {
        'REVIEW_APPROVED': { color: 'bg-secondary/10 text-secondary border-secondary/20', icon: CheckCircle2 },
        'REVIEW_PENDING': { color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
        'REVIEW_REJECTED': { color: 'bg-danger/10 text-danger border-danger/20', icon: XCircle },
        'PENDING_AI': { color: 'bg-primary/10 text-primary border-primary/20', icon: Activity },
        'DRAFT': { color: 'bg-slate-100 text-slate-650 border-slate-200', icon: FileText },
        'MANUAL_REQUIRED': { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Edit },
        'LOGGED': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    };
    const config = map[displayKey] || { color: 'bg-slate-100 text-slate-650 border-slate-200', icon: Activity };
    const Icon = config.icon;
    const statusVi = {
        'REVIEW_APPROVED': 'PT đã duyệt',
        'REVIEW_PENDING': 'Chờ PT duyệt',
        'REVIEW_REJECTED': 'PT từ chối',
        'PENDING_AI': 'AI đang xử lý',
        'DRAFT': 'Nháp',
        'MANUAL_REQUIRED': 'Cần nhập tay',
        'LOGGED': 'Đã ghi nhận',
    }[displayKey] || displayKey || 'Chưa rõ';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${config.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {statusVi}
        </span>
    );
};

export default function MealSection({
    logs,
    loading,
    fetchData,
    handleEditLog,
    handleUploadAdditionalImages,
    handleDelete,
    handleSetPrimary,
    handleDeleteImage,
    setSosDietLogId,
    setSosMessage,
    setIsSosModalOpen,
    hasActivePt = false,
}) {
    const renderLogImages = (log) => {
        const images = [
            { url: getFullImageUrl(log.imageUrl), isPrimary: true, id: null },
            ...(log.additionalImages || []).map(img => ({ 
                url: getFullImageUrl(img.imageUrl), 
                isPrimary: img.isPrimary, 
                id: img.id 
            })),
        ].filter(img => img.url);

        if (images.length === 0) return null;

        return (
            <div className="flex gap-2 mt-4 flex-wrap">
                {images.map((img, idx) => (
                    <div key={img.id || `primary-${idx}`} className="relative group">
                        <SafeImage
                            src={img.url}
                            alt="meal"
                            className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
                        />
                        {img.isPrimary && (
                            <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 rounded-full p-1 shadow-sm">
                                <Star className="w-3.5 h-3.5 fill-current" />
                            </div>
                        )}
                        {img.id && (
                            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button 
                                    onClick={() => handleSetPrimary(log.id, img.id)} 
                                    className="bg-amber-500 text-white rounded-full p-1.5 hover:bg-amber-600 shadow-sm" 
                                    title="Đặt làm ảnh chính"
                                >
                                    <Star className="w-3 h-3" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteImage(log.id, img.id)} 
                                    className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-sm" 
                                    title="Xóa"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl bg-slate-200" />)}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 border-dashed">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold">Hôm nay chưa có bữa ăn nào được ghi nhận.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 relative before:absolute before:inset-y-0 before:left-[23px] before:w-0.5 before:bg-slate-200">
            {logs.map((log, idx) => {
                const logDate = new Date(log.createdAt || log.logDate);
                const displayTime = isNaN(logDate) ? '--' : `${logDate.getHours()}h`;
                const macros = log.macrosJson || {};

                return (
                    <div key={log.id} id={`log-${log.id}`} className="relative flex items-start gap-6 animate-slide-in" style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className="w-12 h-12 rounded-full bg-white border-[3px] border-primary flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                            <span className="text-xs font-extrabold text-primary">{displayTime}</span>
                        </div>

                        <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm group">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-xs font-extrabold tracking-widest text-slate-450 uppercase">{log.mealType}</span>
                                        <StatusBadge status={log.status} reviewStatus={log.reviewStatus} />
                                        {log.mealSource && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-650 border border-slate-200">
                                                {log.mealSource === 'HOME_COOKED' ? 'Tự nấu' : 'Ăn ngoài'}
                                            </span>
                                        )}
                                        {log.recognitionSource === 'HYBRID' && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">DB match</span>
                                        )}
                                        {log.suggestSos && hasActivePt && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">Cần SOS?</span>
                                        )}
                                    </div>

                                    <p className="text-lg font-bold text-slate-800 break-words">
                                        {getLogFoodTitle(log)}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        {log.aiFoodCode && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                                ResNet · {FOOD_CODE_LABELS[log.aiFoodCode] || log.aiFoodCode}
                                            </span>
                                        )}
                                        {formatAiConfidence(log.aiConfidenceScore) && (
                                            <span className="text-[10px] font-semibold text-slate-500">
                                                AI: {formatAiConfidence(log.aiConfidenceScore)}
                                            </span>
                                        )}
                                        {log.matchedFoodName && log.recognitionSource === 'HYBRID' && (
                                            <span className="text-[10px] font-semibold text-emerald-700">
                                                DB: {log.matchedFoodName}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 mt-2.5 text-sm font-semibold text-slate-600 flex-wrap">
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary" />{macros.calories || 0} kcal</span>
                                        <span className="text-[10px] font-medium text-violet-650 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                                            từ ảnh · DB × khẩu phần
                                        </span>
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" />{macros.protein || 0}g Pro</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-450" />{macros.carbs || macros.carb || 0}g Carb</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-450" />{macros.fat || 0}g Fat</span>
                                    </div>

                                    {/* PHẢN HỒI VÀ LÝ DO TỪ PT */}
                                    {(log.ptNote || log.ptCorrectionReason) && log.status !== 'DRAFT' && log.status !== 'MANUAL_REQUIRED' && (
                                        <div className={`mt-4 p-4 rounded-xl border text-sm ${log.status === 'REJECTED' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-secondary/10 border-secondary/20 text-secondary-foreground'}`}>
                                            <p className="font-extrabold mb-1.5 flex items-center gap-2">
                                                {log.status === 'REJECTED' ? <XCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                                                Phản hồi từ Huấn luyện viên
                                            </p>

                                            {log.ptCorrectionReason && log.ptCorrectionReason !== 'OTHER' && (
                                                <p className="font-bold text-xs opacity-75 mb-1.5 uppercase tracking-widest">
                                                    • Lý do: {REASON_LABELS[log.ptCorrectionReason] || log.ptCorrectionReason}
                                                </p>
                                            )}

                                            {log.ptNote && (
                                                <p className="italic font-medium border-l-2 border-current pl-3 py-1">"{log.ptNote}"</p>
                                            )}
                                        </div>
                                    )}

                                    {log.status === 'LOGGED' && log.reviewStatus === 'NOT_REQUIRED' && (
                                        <div className="flex items-center gap-2 mt-4">
                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    await dietService.submitForReview(log.id);
                                                    toast.success('Đã gửi cho PT duyệt');
                                                    fetchData();
                                                }}
                                                className="bg-warning hover:bg-warning/90 text-white rounded-lg text-xs font-bold h-9"
                                            >
                                                Gửi PT kiểm tra
                                            </Button>
                                        </div>
                                    )}

                                    {(log.status === 'DRAFT' || log.status === 'MANUAL_REQUIRED') && (
                                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                                            <Button 
                                                size="sm" 
                                                onClick={async () => { 
                                                    await dietService.submitForReview(log.id); 
                                                    toast.success('Đã gửi cho PT duyệt thành công'); 
                                                    fetchData(); 
                                                }} 
                                                className="bg-warning hover:bg-warning/90 text-white rounded-lg text-xs font-bold h-9 shadow-md shadow-warning/20"
                                            >
                                                Xác nhận & gửi PT Duyệt
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleEditLog(log)} 
                                                className="border-primary/30 text-primary hover:bg-primary/5 rounded-lg text-xs font-bold h-9"
                                            >
                                                <Edit className="w-3.5 h-3.5 mr-1.5" /> Sửa thông số
                                            </Button>

                                            {!log.sosTicketFlag && hasActivePt && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        setSosDietLogId(log.id);
                                                        setSosMessage('');
                                                        setIsSosModalOpen(true);
                                                    }} 
                                                    className="border-warning/35 text-warning hover:bg-warning/5 rounded-lg text-xs font-bold h-9"
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Báo cáo SOS
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => handleUploadAdditionalImages(log.id)} 
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl h-10 w-10 p-0" 
                                        title="Thêm ảnh"
                                    >
                                        <Upload className="w-5 h-5" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => handleDelete(log.id)} 
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-danger hover:bg-danger/5 rounded-xl h-10 w-10 p-0" 
                                        title="Xóa"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {renderLogImages(log)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
