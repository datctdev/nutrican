import React, { useState, useEffect, useRef } from 'react';
import { dietService } from '../../services/dietService';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function FoodAllergySelector({ selectedFoodCodes, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchSelectedFoods = async () => {
      if (!selectedFoodCodes || selectedFoodCodes.length === 0) {
        setSelectedFoods([]);
        return;
      }
      setLoadingSelected(true);
      try {
        const res = await dietService.getFoodsByCodes(selectedFoodCodes);
        setSelectedFoods(res.data?.data || []);
      } catch (err) {
        toast.error('Không thể tải danh sách món dị ứng');
      } finally {
        setLoadingSelected(false);
      }
    };
    fetchSelectedFoods();
  }, [selectedFoodCodes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await dietService.searchFoods(query, { page: 0, size: 5 });
        setResults(res.data?.data?.content || []);
        setIsOpen(true);
      } catch (err) {
        // ignore
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (food) => {
    if (!selectedFoodCodes.includes(food.foodCode)) {
      onChange([...selectedFoodCodes, food.foodCode]);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (foodCode) => {
    onChange(selectedFoodCodes.filter((code) => code !== foodCode));
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex flex-wrap gap-2 mb-3">
        {loadingSelected ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải...</div>
        ) : (
          selectedFoods.map((food) => (
            <div key={food.foodCode} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200">
              <span>{food.nameVi}</span>
              <button
                type="button"
                onClick={() => handleRemove(food.foodCode)}
                className="p-0.5 rounded-full hover:bg-rose-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Tìm kiếm thực phẩm (VD: đậu phộng, tôm, hải sản)..."
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
        {loadingSearch && (
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((food) => (
            <button
              key={food.foodCode}
              type="button"
              onClick={() => handleSelect(food)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex flex-col border-b border-slate-50 last:border-0"
            >
              <span className="text-sm font-semibold text-slate-800">{food.nameVi}</span>
              <span className="text-xs text-slate-500">{food.category} • {food.energyKcal} kcal/100g</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
