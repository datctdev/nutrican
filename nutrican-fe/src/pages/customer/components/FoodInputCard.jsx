// src/pages/customer/components/FoodInputCard.jsx
import { 
    Sparkles, Keyboard, Camera, Upload, RefreshCw, X, ChefHat
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default function FoodInputCard({
    inputMode,
    setInputMode,
    aiMealType,
    setAiMealType,
    dragActive,
    setDragActive,
    selectedFile,
    setSelectedFile,
    analyzing,
    handleAnalyze,
    fileInputRef,
    handleFileSelect,
    manualMealType,
    setManualMealType,
    foodSearchQuery,
    setFoodSearchQuery,
    foodSearchResults,
    searchFoods,
    addIngredientFromSearch,
    ingredientItems,
    updateIngredientQty,
    removeIngredient,
    ingredientTotals,
    handleManualSubmit,
    uploading,
    dietFilterOn,
    setDietFilterOn,
    manualSendToPt,
    setManualSendToPt,
    savedRecipes,
    recipeName,
    setRecipeName,
    handleSaveRecipe,
    handleLogFromRecipe,
    handleLogFromSavedRecipe,
}) {
    return (
        <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
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
                    <button 
                        type="button"
                        onClick={() => setInputMode('recipe')} 
                        className={`flex-1 sm:w-36 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${inputMode === 'recipe' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ChefHat className="w-4 h-4" /> Công thức
                    </button>
                </div>

                {inputMode === 'ai' && (
                    <div className="mb-4">
                        <select 
                            value={aiMealType} 
                            onChange={(e) => setAiMealType(e.target.value)} 
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                        >
                            <option value="BREAKFAST">Bữa sáng</option>
                            <option value="LUNCH">Bữa trưa</option>
                            <option value="DINNER">Bữa tối</option>
                            <option value="SNACK">Bữa phụ</option>
                        </select>
                    </div>
                )}

                {inputMode === 'ai' ? (
                    <div
                        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-slate-355 hover:border-primary/60 hover:bg-slate-55'}`}
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
                ) : (inputMode === 'manual' || inputMode === 'recipe') ? (
                    <form onSubmit={inputMode === 'recipe' ? handleLogFromRecipe : handleManualSubmit} className="space-y-5 animate-fade-in bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Bữa ăn</label>
                            <select 
                                value={manualMealType} 
                                onChange={(e) => setManualMealType(e.target.value)} 
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="BREAKFAST">Bữa sáng</option>
                                <option value="LUNCH">Bữa trưa</option>
                                <option value="DINNER">Bữa tối</option>
                                <option value="SNACK">Bữa phụ</option>
                            </select>
                        </div>

                        {inputMode === 'recipe' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tên công thức</label>
                                <input
                                    type="text"
                                    value={recipeName || ''}
                                    onChange={(e) => setRecipeName?.(e.target.value)}
                                    placeholder="Ví dụ: Cơm gà xào"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        )}

                        <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <input
                                type="checkbox"
                                checked={dietFilterOn ?? true}
                                onChange={(e) => setDietFilterOn?.(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            Lọc theo chế độ ăn của tôi
                        </label>

                        <div className="relative">
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Tìm thực phẩm</label>
                            <input
                                type="text"
                                value={foodSearchQuery}
                                onChange={(e) => searchFoods(e.target.value)}
                                placeholder="Gạo, thịt bò, trứng, rau muống... (≥ 2 ký tự)"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            {foodSearchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                                    {foodSearchResults.map((food) => (
                                        <button
                                            key={food.id}
                                            type="button"
                                            onClick={() => addIngredientFromSearch(food)}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 text-slate-700 flex items-center justify-between gap-3 border-none outline-none"
                                        >
                                            <span className="font-semibold flex items-center gap-2">
                                                {food.nameVi}
                                                {food.prefMismatch && (
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">!PREF</span>
                                                )}
                                            </span>
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
                                                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm font-semibold focus:border-primary outline-none"
                                            />
                                            <span className="text-xs text-slate-400 w-3">g</span>
                                            <span className="text-xs text-slate-550 w-16 text-right font-semibold">{Math.round(it.calories)} kcal</span>
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

                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={manualSendToPt ?? false}
                                onChange={(e) => setManualSendToPt?.(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            Gửi PT kiểm tra
                        </label>

                        {inputMode === 'recipe' && savedRecipes?.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700">Công thức đã lưu</label>
                                <div className="space-y-2 max-h-40 overflow-auto">
                                    {savedRecipes.map((r) => (
                                        <div key={r.id} className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                                                <p className="text-xs text-slate-500">{Math.round(r.totalCalories || 0)} kcal</p>
                                            </div>
                                            <Button type="button" size="sm" variant="outline" onClick={() => handleLogFromSavedRecipe?.(r.id)}>
                                                Dùng lại
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {inputMode === 'recipe' && (
                                <Button type="button" variant="outline" disabled={uploading || !recipeName || ingredientItems.length === 0}
                                    onClick={handleSaveRecipe} className="rounded-xl">
                                    Lưu công thức
                                </Button>
                            )}
                            <Button 
                                type="submit" 
                                disabled={uploading || ingredientItems.length === 0} 
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md px-8 h-12"
                            >
                                {uploading ? 'Đang lưu...' : (inputMode === 'recipe' ? 'Ghi nhật ký từ công thức' : 'Lưu bữa ăn')}
                            </Button>
                        </div>
                    </form>
                ) : null}

            </CardContent>
        </Card>
    );
}
