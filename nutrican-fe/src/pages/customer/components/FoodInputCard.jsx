import {
    Sparkles, Keyboard, Camera, RefreshCw, X, Send, ImagePlus, Star, Trash2
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import FoodSearchInput from './FoodSearchInput';
import {
    MEAL_PERIODS,
    MEAL_PERIOD_LABELS,
    getPastMealPeriodsForMakeup,
    getCurrentMealPeriod,
} from './dietUtils';

export default function FoodInputCard({
    inputMode,
    setInputMode,
    aiMealPeriod,
    setAiMealPeriod,
    dragActive,
    setDragActive,
    selectedFile,
    analyzing,
    handleAnalyze,
    fileInputRef,
    handleFileSelect,
    manualMealPeriod,
    setManualMealPeriod,
    makeupForPeriod,
    setMakeupForPeriod,
    addIngredientFromSearch,
    addCustomIngredient,
    ingredientItems,
    updateIngredientQty,
    removeIngredient,
    ingredientTotals,
    mealImages = [],
    mealImageInputRef,
    handleMealImageSelect,
    handleRemoveMealImage,
    handleSetPrimaryMealImage,
    onPreviewImage,
    handleManualSubmit,
    uploading,
    dietFilterOn,
    setDietFilterOn,
    applyAiPeriodLock = false,
    hasActivePt = false,
}) {
    const currentPeriod = getCurrentMealPeriod();
    const pastForMakeup = applyAiPeriodLock ? getPastMealPeriodsForMakeup() : [];
    const currentLabel = MEAL_PERIOD_LABELS[currentPeriod] || currentPeriod;

    const renderPeriodOptions = () => MEAL_PERIODS.map((period) => (
        <option key={period} value={period}>
            {MEAL_PERIOD_LABELS[period]}
        </option>
    ));


    const renderTodayPeriodChip = () => (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700/80">Đang ghi nhật ký vào</p>
            <p className="text-base font-extrabold text-emerald-900 mt-0.5">{currentLabel}</p>
            <p className="text-[11px] text-emerald-800/80 mt-1 font-medium">
                Hệ thống tự chọn theo giờ hiện tại — bạn chỉ cần chụp ảnh / nhập món.
            </p>
        </div>
    );

    const renderMakeupSelect = () => {
        if (!applyAiPeriodLock || pastForMakeup.length === 0) return null;
        return (
            <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Bù cho buổi đã quên? (tuỳ chọn)
                </label>
                <select
                    value={makeupForPeriod || ''}
                    onChange={(e) => setMakeupForPeriod?.(e.target.value || null)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white"
                >
                    <option value="">Không — chỉ ghi {currentLabel}</option>
                    {pastForMakeup.map((p) => (
                        <option key={p} value={p}>
                            Có — đánh dấu bù {MEAL_PERIOD_LABELS[p]}
                        </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                    Quên ghi bữa trước? Vẫn lưu vào khung hiện tại và gắn nhãn buổi cần bù.
                </p>
            </div>
        );
    };
    return (
        <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
            <CardContent className="p-8">

                <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-max mb-8 border border-slate-200/50">
                    <button 
                        type="button"
                        onClick={() => setInputMode('ai')} 
                        className={`flex-1 sm:w-36 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'ai' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Sparkles className="w-4 h-4" /> Phân tích AI
                    </button>
                    <button 
                        type="button"
                        onClick={() => setInputMode('manual')} 
                        className={`flex-1 sm:w-36 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Keyboard className="w-4 h-4" /> Nhập thủ công
                    </button>
                </div>

                {inputMode === 'ai' && (
                    <div className="mb-4 space-y-2">
                        {applyAiPeriodLock ? (
                            renderTodayPeriodChip()
                        ) : (
                            <>
                                <select
                                    value={aiMealPeriod}
                                    onChange={(e) => setAiMealPeriod(e.target.value)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                                >
                                    {renderPeriodOptions()}
                                </select>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    Chọn buổi cho ngày đang xem
                                </p>
                            </>
                        )}
                        {renderMakeupSelect()}
                    </div>
                )}

                {inputMode === 'ai' ? (
                    <div
                        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-slate-300 hover:border-primary/60 hover:bg-slate-50'}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e); }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-100">
                            <Camera className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-slate-800">Tải lên hình ảnh bữa ăn</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">Kéo thả hoặc nhấp để chọn ảnh. Phân tích một ảnh cho mỗi bữa ăn.</p>

                        {selectedFile ? (
                            <div className="flex flex-col items-center justify-center gap-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs bg-primary/5 text-primary px-3 py-1.5 rounded-full font-bold border border-primary/20">{selectedFile.name}</span>
                                <Button onClick={handleAnalyze} disabled={analyzing} className="shadow-md bg-primary hover:bg-primary/95 text-white rounded-xl px-8 h-12">
                                    {analyzing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang phân tích...</> : 'Phân tích bằng AI'}
                                </Button>
                            </div>
                        ) : (
                            <Button type="button" variant="outline" className="bg-white border-slate-300 text-slate-700 pointer-events-none rounded-xl">Chọn hình ảnh</Button>
                        )}
                    </div>
                ) : inputMode === 'manual' ? (
                    <form onSubmit={handleManualSubmit} className="space-y-5 animate-fade-in bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Bữa ăn</label>
                            {applyAiPeriodLock ? (
                                renderTodayPeriodChip()
                            ) : (
                                <>
                                    <select
                                        value={manualMealPeriod}
                                        onChange={(e) => setManualMealPeriod(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        {renderPeriodOptions()}
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                                        Chọn buổi cho ngày đang xem
                                    </p>
                                </>
                            )}
                        {renderMakeupSelect()}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <input
                                type="checkbox"
                                checked={dietFilterOn ?? true}
                                onChange={(e) => setDietFilterOn?.(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            Lọc theo chế độ ăn của tôi
                        </label>

                        <FoodSearchInput
                            dietFilter={dietFilterOn ?? true}
                            onSelect={addIngredientFromSearch}
                            onAddCustom={addCustomIngredient}
                        />

                        {ingredientItems.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700">Nguyên liệu đã chọn</label>
                                <div className="space-y-2">
                                    {ingredientItems.map((it, idx) => (
                                        <div key={`${it.foodItemId || 'custom'}-${it.itemName}-${idx}`} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                                            <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
                                                {it.itemName}
                                                {it.isCustom && (
                                                    <span className="ml-1 text-[10px] font-bold text-amber-700">(tùy chỉnh)</span>
                                                )}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={it.quantityG}
                                                onChange={(e) => updateIngredientQty(idx, e.target.value)}
                                                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm font-semibold focus:border-primary outline-none"
                                            />
                                            <span className="text-xs text-slate-400 w-3">g</span>
                                            <span className="text-xs text-slate-500 w-16 text-right font-semibold">{Math.round(it.calories)} kcal</span>
                                            <button
                                                type="button"
                                                onClick={() => removeIngredient(idx)}
                                                className="text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg p-1.5 transition-colors"
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
                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">
                                            {hasActivePt ? 'Hình ảnh gửi cho PT' : 'Hình ảnh bữa ăn'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {hasActivePt
                                                ? 'Có thể chọn nhiều ảnh, tối đa 5MB mỗi ảnh.'
                                                : 'Lưu kèm nhật ký của bạn. Có thể chọn nhiều ảnh, tối đa 5MB mỗi ảnh.'}
                                        </p>
                                    </div>
                                    <input
                                        ref={mealImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleMealImageSelect}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={uploading}
                                        onClick={() => mealImageInputRef.current?.click()}
                                        className="rounded-xl border-primary/25 text-primary hover:bg-primary/5"
                                    >
                                        <ImagePlus className="mr-2 h-4 w-4" />
                                        Chọn ảnh gửi kèm
                                    </Button>
                                </div>

                                {mealImages.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                        {mealImages.map((image) => (
                                            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => onPreviewImage?.(image.previewUrl)}
                                                    className="h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                                                    aria-label={`Xem ảnh lớn: ${image.file.name}`}
                                                >
                                                    <img
                                                        src={image.previewUrl}
                                                        alt={image.file.name}
                                                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                    />
                                                </button>
                                                {image.isPrimary && (
                                                    <span className="pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-extrabold text-amber-950 shadow-sm">
                                                        <Star className="h-3 w-3 fill-current" /> Ảnh chính
                                                    </span>
                                                )}
                                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-end gap-1.5 bg-gradient-to-t from-slate-950/80 to-transparent p-2 pt-8">
                                                    {!image.isPrimary && (
                                                        <button
                                                            type="button"
                                                            disabled={uploading}
                                                            onClick={() => handleSetPrimaryMealImage(image.id)}
                                                            className="pointer-events-auto rounded-full bg-amber-400 p-2 text-amber-950 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
                                                            title="Đặt làm ảnh chính"
                                                            aria-label={`Đặt ${image.file.name} làm ảnh chính`}
                                                        >
                                                            <Star className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={uploading}
                                                        onClick={() => handleRemoveMealImage(image.id)}
                                                        className="pointer-events-auto rounded-full bg-red-500 p-2 text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50"
                                                        title="Xóa ảnh"
                                                        aria-label={`Xóa ${image.file.name}`}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {ingredientItems.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/10">
                                <div className="text-center">
                                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Calo</div>
                                    <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.calories)}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Pro</div>
                                    <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.protein)}g</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Carb</div>
                                    <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.carb)}g</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-extrabold text-danger uppercase tracking-wider">Fat</div>
                                    <div className="text-lg font-black text-slate-800">{Math.round(ingredientTotals.fat)}g</div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Button 
                                type="submit" 
                                disabled={uploading || ingredientItems.length === 0} 
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md px-8 h-12"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {uploading ? 'Đang gửi...' : 'Gửi bữa ăn'}
                            </Button>
                        </div>
                    </form>
                ) : null}

            </CardContent>
        </Card>
    );
}
