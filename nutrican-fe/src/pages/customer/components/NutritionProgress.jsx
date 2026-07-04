// src/pages/customer/components/NutritionProgress.jsx
import { Activity } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { calculateProgress } from './dietUtils';

const MacroRing = ({ label, current, target, colorClass }) => {
    const progress = calculateProgress(current || 0, target || 1);
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="relative w-20 h-20 mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} className="stroke-slate-200" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r={radius} fill="transparent"
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            className={`transition-all duration-1000 ease-out ${colorClass}`}
                            strokeWidth="8" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-sm font-bold text-slate-800">{Math.round(current || 0)}</span>
                </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Mục tiêu {target || 0}g</span>
        </div>
    );
};

export default function NutritionProgress({ summary }) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-400 w-full" />
            <CardContent className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" /> Mục tiêu hàng ngày
                </h3>

                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2.5">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Tổng Calo tiêu thụ</span>
                        <div className="text-right">
                            <span className="text-3xl font-black text-slate-800">{summary?.totalCalories || 0}</span>
                            <span className="text-sm font-semibold text-slate-400"> / {summary?.targetCalories || 2000} kcal</span>
                        </div>
                    </div>
                    <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 relative" style={{ width: `${calculateProgress(summary?.totalCalories, summary?.targetCalories)}%` }} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <MacroRing label="Đạm (Protein)" current={summary?.totalProtein} target={summary?.targetProtein || 120} colorClass="stroke-blue-500" />
                    <MacroRing label="Tinh bột (Carbs)" current={summary?.totalCarbs} target={summary?.targetCarbs || 200} colorClass="stroke-amber-500" />
                    <MacroRing label="Chất béo (Fat)" current={summary?.totalFat} target={summary?.targetFat || 65} colorClass="stroke-red-500" />
                </div>
            </CardContent>
        </Card>
    );
}
