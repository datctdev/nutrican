import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/button';

const MEAL_TYPES = [
  { id: 'BREAKFAST', label: 'Bữa sáng', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'LUNCH', label: 'Bữa trưa', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'DINNER', label: 'Bữa tối', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'SNACK', label: 'Bữa phụ', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

export default function MealPlanDayView({ date, items = [], onUpdateItems, onOpenSearch }) {
  // item shape: { id(temp), planDate, mealType, foodCode, nameVi, portionGrams, calories, protein, carb, fat, ... }

  // Filter items for the specific date passed via props
  const dayItems = items.filter(i => i.planDate === date);

  const handleRemove = (globalIndex) => {
    const newItems = [...items];
    newItems.splice(globalIndex, 1);
    onUpdateItems(newItems);
  };

  const handleUpdateGrams = (globalIndex, grams) => {
    const newItems = [...items];
    const item = newItems[globalIndex];
    const ratio = grams / (item.baseServingSizeG || 100);

    newItems[globalIndex] = {
      ...item,
      portionGrams: grams,
      calcCalories: Math.round((item.baseCalories || 0) * ratio),
      calcProtein: Math.round((item.baseProtein || 0) * ratio),
      calcCarb: Math.round((item.baseCarb || 0) * ratio),
      calcFat: Math.round((item.baseFat || 0) * ratio),
    };
    onUpdateItems(newItems);
  };

  return (
    <div className="space-y-6">
      {MEAL_TYPES.map((mt) => {
        const mealItems = dayItems.filter(i => i.mealType === mt.id);
        const totalCals = mealItems.reduce((acc, i) => acc + (i.calcCalories || 0), 0);
        const totalP = mealItems.reduce((acc, i) => acc + (i.calcProtein || 0), 0);
        const totalC = mealItems.reduce((acc, i) => acc + (i.calcCarb || 0), 0);
        const totalF = mealItems.reduce((acc, i) => acc + (i.calcFat || 0), 0);

        return (
          <div key={mt.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center bg-slate-50 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg border ${mt.color}`}>
                  {mt.label}
                </span>
                <span className="text-sm font-bold text-slate-600">
                  {totalCals} kcal <span className="text-slate-400 font-normal ml-1">({totalP}g P / {totalC}g C / {totalF}g F)</span>
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 rounded-xl text-xs font-bold" onClick={() => onOpenSearch(mt.id)}>
                <Plus className="w-3.5 h-3.5" /> Thêm món
              </Button>
            </div>
            
            <div className="p-0">
              {mealItems.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {items.map((item, globalIndex) => {
                    if (item.mealType !== mt.id || item.planDate !== date) return null;
                    return (
                      <div key={item.tempId || globalIndex} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                              {item.nameVi}
                              {item.eaten && (
                                <span title="Học viên đã ăn món này" className="text-emerald-500 bg-emerald-50 rounded-full p-0.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                </span>
                              )}
                            </p>
                            {item.warning && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">!PREF</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">{item.calcCalories} kcal</span>
                            <span>P: {item.calcProtein}g</span>
                            <span>C: {item.calcCarb}g</span>
                            <span>F: {item.calcFat}g</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="0"
                              value={item.portionGrams}
                              onChange={(e) => handleUpdateGrams(globalIndex, Number(e.target.value))}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="text-xs font-medium text-slate-500">gram</span>
                          </div>
                          <button onClick={() => handleRemove(globalIndex)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-slate-400 text-sm font-medium">
                  Chưa có món ăn nào cho bữa này.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
