// src/components/diet/LogCard.jsx
import { useState, useEffect } from 'react';
import {
    Camera, Trash2, CheckCircle2, Clock, XCircle,
    Activity, Star, Edit, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
    getFullImageUrl, getLogFoodTitle, FOOD_CODE_LABELS,
    REASON_LABELS, formatAiConfidence, MEAL_PERIOD_LABELS, formatMacroDisplay,
} from '../../pages/customer/components/dietUtils';

function SafeImage({ src, alt, className }) {
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
        <img src={src} alt={alt} className={className} onError={() => setHasError(true)} />
    );
}

function StatusBadge({ status, reviewStatus }) {
    const displayKey = reviewStatus === 'PENDING' ? 'REVIEW_PENDING'
        : reviewStatus === 'APPROVED' ? 'REVIEW_APPROVED'
        : reviewStatus === 'REJECTED' ? 'REVIEW_REJECTED'
        : status;
    const map = {
        REVIEW_APPROVED: { color: 'bg-secondary/10 text-secondary border-secondary/20', icon: CheckCircle2 },
        REVIEW_PENDING: { color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
        REVIEW_REJECTED: { color: 'bg-danger/10 text-danger border-danger/20', icon: XCircle },
        PENDING_AI: { color: 'bg-primary/10 text-primary border-primary/20', icon: Activity },
        DRAFT: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Edit },
        MANUAL_REQUIRED: { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Edit },
        LOGGED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    };
    const config = map[displayKey] || { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Activity };
    const Icon = config.icon;
    const statusVi = {
        REVIEW_APPROVED: 'PT đã duyệt',
        REVIEW_PENDING: 'Chờ PT duyệt',
        REVIEW_REJECTED: 'PT từ chối',
        PENDING_AI: 'AI đang xử lý',
        DRAFT: 'Nháp',
        MANUAL_REQUIRED: 'Cần nhập tay',
        LOGGED: 'Đã ghi nhận',
    }[displayKey] || displayKey || 'Chưa rõ';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${config.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {statusVi}
        </span>
    );
}

function LogImages({ log, onPreviewImage }) {
    const primaryUrl = getFullImageUrl(log.imageUrl);
    const normalizeImageUrl = (url) => url?.split('?')[0];
    const storedImages = (log.additionalImages || []).map((img) => ({
        url: getFullImageUrl(img.imageUrl),
        isPrimary: Boolean(img.isPrimary),
        id: img.id,
    })).filter((img) => img.url);
    const storedPrimary = storedImages.find((img) => (
        img.isPrimary || (primaryUrl && normalizeImageUrl(img.url) === normalizeImageUrl(primaryUrl))
    ));

    const candidateImages = storedPrimary
        ? storedImages.map((img) => ({ ...img, isPrimary: img === storedPrimary }))
        : [
            ...(primaryUrl ? [{ url: primaryUrl, isPrimary: true, id: null }] : []),
            ...storedImages.map((img) => ({ ...img, isPrimary: false })),
        ];
    const seenImages = new Set();
    const images = candidateImages.filter((img) => {
        const key = img.id || normalizeImageUrl(img.url);
        if (!key || seenImages.has(key)) return false;
        seenImages.add(key);
        return true;
    });

    if (images.length === 0) return null;

    return (
        <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((img, idx) => (
                <div key={img.id || `primary-${idx}`} className="relative group">
                    <button
                        type="button"
                        onClick={() => onPreviewImage?.(img.url)}
                        className="block cursor-zoom-in rounded-xl border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Xem ảnh bữa ăn lớn"
                    >
                        <SafeImage
                            src={img.url}
                            alt="Bữa ăn"
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                        />
                    </button>
                    {img.isPrimary && (
                        <div className="pointer-events-none absolute z-10 -top-1.5 -right-1.5 bg-amber-400 text-amber-900 rounded-full p-0.5 shadow-sm">
                            <Star className="w-3 h-3 fill-current" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function LogCard({
    log,
    handleEditLog,
    handleDelete,
    onPreviewImage,
    isPast = false,
    readOnly = false,
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const macros = log.macrosJson || {};
    const isReviewRejected = log.reviewStatus === 'REJECTED' || log.status === 'REJECTED';
    const hasAi = Boolean(log.imageUrl || log.recognitionSource === 'HYBRID' || log.recognitionSource === 'RESNET'
        || log.aiFoodCode || log.aiConfidenceScore != null);
    const title = getLogFoodTitle(log);
    const timeLabel = (() => {
        const d = new Date(log.createdAt || log.logDate);
        if (Number.isNaN(d.getTime())) return null;
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    })();

    const distinctItems = (log.items || []).filter((it) => {
        const name = (it.itemName || '').trim();
        return name && name.toLowerCase() !== title.toLowerCase();
    });
    const showItemBreakdown = distinctItems.length >= 2 || (log.items || []).length >= 2;

    const mealSourceLabel = log.mealSource === 'HOME_COOKED' ? 'Tự nấu'
        : log.mealSource === 'RESTAURANT' ? 'Ăn ngoài'
        : log.mealSource === 'TAKEOUT' ? 'Mang đi'
        : log.mealSource === 'CANTEEN' ? 'Căng tin'
        : null;

    return (
        <div id={`log-${log.id}`} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <StatusBadge status={log.status} reviewStatus={log.reviewStatus} />
                        {log.makeupForPeriod && MEAL_PERIOD_LABELS[log.makeupForPeriod] && (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                Bù: {MEAL_PERIOD_LABELS[log.makeupForPeriod]}
                            </span>
                        )}
                        {log.lateTickReason && (
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                Tick trễ: {log.lateTickReason}
                            </span>
                        )}
                        {hasAi && (
                            <span className="text-[11px] font-medium text-slate-500">
                                Nhận diện từ ảnh{log.recognitionSource === 'HYBRID' || log.matchedFoodName ? ' · đã khớp DB' : ''}
                            </span>
                        )}
                    </div>

                    <p className="text-base font-bold text-slate-800 break-words">
                        {title}
                        {timeLabel && (
                            <span className="ml-2 text-xs font-semibold text-slate-400">{timeLabel}</span>
                        )}
                    </p>

                    {mealSourceLabel && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{mealSourceLabel}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-secondary" />
                            {formatMacroDisplay(macros.calories)} kcal
                        </span>
                        {Number(log.totalGrams) > 0 && (
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                {formatMacroDisplay(log.totalGrams, 0)}g
                            </span>
                        )}
                        <span className="text-primary">{formatMacroDisplay(macros.protein)}g Pro</span>
                        <span className="text-amber-600">{formatMacroDisplay(macros.carbs || macros.carb)}g Carb</span>
                        <span className="text-rose-600">{formatMacroDisplay(macros.fat)}g Fat</span>
                    </div>

                    {showItemBreakdown && (
                        <ul className="mt-2 space-y-0.5">
                            {(log.items || []).map((item, idx) => (
                                <li
                                    key={item.id || `${item.foodItemId || item.itemName}-${idx}`}
                                    className="text-xs text-slate-500 font-medium"
                                >
                                    {item.itemName || 'Nguyên liệu'}
                                    {item.quantityG != null ? ` · ${Math.round(Number(item.quantityG))}g` : ''}
                                    {item.calories != null ? ` · ${Math.round(Number(item.calories))} kcal` : ''}
                                </li>
                            ))}
                        </ul>
                    )}

                    {(log.aiFoodCode || formatAiConfidence(log.aiConfidenceScore) || log.matchedFoodName) && (
                        <button
                            type="button"
                            onClick={() => setDetailsOpen((v) => !v)}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                        >
                            {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            Xem chi tiết
                        </button>
                    )}
                    {detailsOpen && (
                        <div className="mt-1.5 text-[11px] text-slate-500 space-y-0.5 pl-1 border-l-2 border-slate-200">
                            {log.aiFoodCode && (
                                <p>ResNet · {FOOD_CODE_LABELS[log.aiFoodCode] || log.aiFoodCode}</p>
                            )}
                            {formatAiConfidence(log.aiConfidenceScore) && (
                                <p>AI: {formatAiConfidence(log.aiConfidenceScore)}</p>
                            )}
                            {log.matchedFoodName && (
                                <p>DB: {log.matchedFoodName}</p>
                            )}
                            {log.recognitionSource && (
                                <p>Nguồn: {log.recognitionSource}</p>
                            )}
                        </div>
                    )}

                    {(log.ptNote || log.ptCorrectionReason) && log.status !== 'DRAFT' && log.status !== 'MANUAL_REQUIRED' && (
                        <div className={`mt-3 p-3 rounded-xl border text-sm ${isReviewRejected ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                            <p className="font-extrabold mb-1 flex items-center gap-2">
                                {isReviewRejected ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                Phản hồi từ Huấn luyện viên
                            </p>
                            {log.ptCorrectionReason && log.ptCorrectionReason !== 'OTHER' && (
                                <p className="font-bold text-xs opacity-75 mb-1 uppercase tracking-widest">
                                    · Lý do: {REASON_LABELS[log.ptCorrectionReason] || log.ptCorrectionReason}
                                </p>
                            )}
                            {log.ptNote && (
                                <p className="italic font-medium border-l-2 border-current pl-3 py-1">&ldquo;{log.ptNote}&rdquo;</p>
                            )}
                        </div>
                    )}

                    {!readOnly && !isPast && (log.status === 'DRAFT' || log.status === 'MANUAL_REQUIRED') && (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditLog?.(log)}
                                className="border-primary/30 text-primary hover:bg-primary/5 rounded-lg text-xs font-bold h-9"
                            >
                                <Edit className="w-3.5 h-3.5 mr-1.5" /> Sửa & gửi bữa ăn
                            </Button>
                        </div>
                    )}
                </div>

                {!readOnly && !isPast && (
                    <Button
                        variant="ghost"
                        onClick={() => handleDelete?.(log.id)}
                        className="text-slate-400 hover:text-danger hover:bg-danger/5 rounded-xl h-9 w-9 p-0 shrink-0"
                        title="Xóa bữa ăn"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
            <LogImages log={log} onPreviewImage={onPreviewImage} />
        </div>
    );
}

export function ReconciliationBadge({ reconciliation }) {
    if (!reconciliation?.hintVi) return null;
    const tone = reconciliation.offPlanIntake
        ? 'bg-orange-50 border-orange-200 text-orange-800'
        : reconciliation.planComplianceOnly
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800';
    return (
        <p className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${tone}`}>
            {reconciliation.hintVi}
        </p>
    );
}
