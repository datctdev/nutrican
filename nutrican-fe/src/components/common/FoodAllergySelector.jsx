import React from 'react';

const COMMON_ALLERGIES = [
  { code: 'PEANUT', label: 'Đậu phộng (Lạc)' },
  { code: 'SEAFOOD', label: 'Hải sản có vỏ' },
  { code: 'FISH', label: 'Cá' },
  { code: 'EGG', label: 'Trứng' },
  { code: 'DAIRY', label: 'Sữa bò' },
  { code: 'TREE_NUTS', label: 'Các loại hạt' },
  { code: 'SOY', label: 'Đậu nành' },
  { code: 'WHEAT', label: 'Lúa mì (Gluten)' }
];

export default function FoodAllergySelector({ selectedFoodCodes = [], onChange }) {
  const toggleAllergy = (code) => {
    if (selectedFoodCodes.includes(code)) {
      onChange(selectedFoodCodes.filter((c) => c !== code));
    } else {
      onChange([...selectedFoodCodes, code]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {COMMON_ALLERGIES.map((allergy) => {
        const isSelected = selectedFoodCodes.includes(allergy.code);
        return (
          <button
            key={allergy.code}
            type="button"
            onClick={() => toggleAllergy(allergy.code)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              isSelected
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {allergy.label}
          </button>
        );
      })}
    </div>
  );
}
