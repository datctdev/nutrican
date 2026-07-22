import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Check, Activity, Droplet } from 'lucide-react';
import { dietService } from '../../../services/dietService';
import { Button } from '../../ui/button';

export default function FoodSearchModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const searchFoods = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = await dietService.searchFoods(q, { dietFilter: false });
      setResults(res.data.data || []);
    } catch (error) {
      console.error('Lỗi tìm kiếm:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      searchFoods(query);
    } else {
      setQuery('');
      setResults([]);
      setFilter('ALL');
    }
  }, [isOpen, searchFoods]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isOpen) {
        searchFoods(query);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, isOpen, searchFoods]);

  if (!isOpen) return null;

  const filteredResults = results.filter((item) => {
    if (filter === 'ALL') return true;
    const cals = Number(item.calories) || 0;
    const pro = Number(item.protein) || 0;
    if (filter === 'HIGH_PROTEIN') {
      return cals > 0 && ((pro * 4) / cals) >= 0.3;
    }
    if (filter === 'LOW_FAT') {
      return cals < 150;
    }
    if (filter === 'CERTIFIED') {
      return item.dietTags?.includes('EAT_CLEAN') || item.category === 'Món ResNet50';
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col h-[80vh] overflow-hidden">

        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">Tìm kiếm món ăn</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>


        <div className="p-4 space-y-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Ví dụ: Ức gà, cơm trắng, salad..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('HIGH_PROTEIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filter === 'HIGH_PROTEIN' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
            >
              <Activity className="w-3 h-3" /> Giàu Protein
            </button>
            <button
              onClick={() => setFilter('LOW_FAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filter === 'LOW_FAT' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
            >
              <Droplet className="w-3 h-3" /> Phù hợp giảm mỡ
            </button>
            <button
              onClick={() => setFilter('CERTIFIED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filter === 'CERTIFIED' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
            >
              <Check className="w-3 h-3" /> Chuẩn Viện DD
            </button>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="space-y-2">
              {filteredResults.map((item) => (
                <div key={item.id || item.foodCode} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors cursor-pointer group" onClick={() => onSelect(item)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-sm">{item.nameVi}</h4>
                      {item.dietTags?.includes('EAT_CLEAN') || item.category === 'Món ResNet50' ? (
                        <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Chuẩn Viện DD</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.servingSizeG}g • {item.calories} kcal • P: {item.protein}g • C: {item.carb}g • F: {item.fat}g
                    </p>
                  </div>
                  <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white rounded-lg">Thêm</Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm font-medium">Không tìm thấy món ăn phù hợp</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
