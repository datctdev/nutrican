import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  Moon,
  RefreshCw,
  Sun,
  Undo2,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const MEAL_ORDER = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

const SKIP_REASON_LABEL = {
  NO_TIME: 'Không có thời gian',
  DONT_LIKE: 'Không thích món',
  ALLERGY: 'Dị ứng / không phù hợp',
  OTHER: 'Lý do khác',
};

const MEAL_META = {
  BREAKFAST: {
    label: 'Bữa sáng',
    icon: Coffee,
    headerClass: 'bg-amber-50 text-amber-800 border-amber-100',
    iconClass: 'bg-amber-100 text-amber-700',
  },
  LUNCH: {
    label: 'Bữa trưa',
    icon: Sun,
    headerClass: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  DINNER: {
    label: 'Bữa tối',
    icon: Moon,
    headerClass: 'bg-indigo-50 text-indigo-800 border-indigo-100',
    iconClass: 'bg-indigo-100 text-indigo-700',
  },
  SNACK: {
    label: 'Bữa phụ',
    icon: Cookie,
    headerClass: 'bg-violet-50 text-violet-800 border-violet-100',
    iconClass: 'bg-violet-100 text-violet-700',
  },
};

function parseLocalDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayName(dateKey, long = false) {
  return new Intl.DateTimeFormat('vi-VN', { weekday: long ? 'long' : 'short' })
    .format(parseLocalDate(dateKey));
}

function formatShortDate(dateKey) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })
    .format(parseLocalDate(dateKey));
}

function formatFullDate(dateKey) {
  const value = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseLocalDate(dateKey));
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getItemName(item) {
  return item.freeText || item.foodCode || 'Món ăn';
}

function getDisplayName(item) {
  return getItemName(item).replace(/\[CHEAT MEAL\]/gi, '').trim();
}

function isCheatMeal(item) {
  return /\[CHEAT MEAL\]/i.test(getItemName(item));
}

export default function MealPlanWeekView({
  items,
  preferenceWarnings,
  suggestions,
  onMarkEaten,
  onSuggestReplacement,
  onCancelReplacement,
  onOpenSkip,
  onUndoSkip,
  onUndoEntireMeal,
}) {
  const [selectedDate, setSelectedDate] = useState('');

  const itemsByDate = useMemo(() => items.reduce((result, item) => {
    const dateKey = item.planDate || 'unknown';
    if (!result[dateKey]) result[dateKey] = [];
    result[dateKey].push(item);
    return result;
  }, {}), [items]);

  const dates = useMemo(() => Object.keys(itemsByDate).sort(), [itemsByDate]);
  const todayKey = getLocalDateKey();
  const activeDate = dates.includes(selectedDate)
    ? selectedDate
    : (dates.includes(todayKey) ? todayKey : dates[0]);
  const activeDateIndex = dates.indexOf(activeDate);
  const activeItems = useMemo(
    () => itemsByDate[activeDate] || [],
    [activeDate, itemsByDate],
  );
  const completedItems = activeItems.filter((item) => item.eaten).length;
  const completionPercent = activeItems.length
    ? Math.round((completedItems / activeItems.length) * 100)
    : 0;

  const warningCodes = useMemo(() => new Set(
    (preferenceWarnings || []).map((warning) => warning.foodCode).filter(Boolean),
  ), [preferenceWarnings]);

  const latestSuggestionByItem = useMemo(() => {
    const result = new Map();
    (suggestions || []).forEach((suggestion) => {
      if (!result.has(suggestion.mealPlanItemId)) {
        result.set(suggestion.mealPlanItemId, suggestion);
      }
    });
    return result;
  }, [suggestions]);

  const itemsByMeal = useMemo(() => activeItems.reduce((result, item) => {
    if (!result[item.mealType]) result[item.mealType] = [];
    result[item.mealType].push(item);
    return result;
  }, {}), [activeItems]);

  const moveDay = (direction) => {
    const nextDate = dates[activeDateIndex + direction];
    if (nextDate) setSelectedDate(nextDate);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="tablist" aria-label="Chọn ngày trong tuần">
        {dates.map((dateKey) => {
          const dayItems = itemsByDate[dateKey];
          const eatenCount = dayItems.filter((item) => item.eaten).length;
          const isActive = dateKey === activeDate;
          const isToday = dateKey === todayKey;

          return (
            <button
              key={dateKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedDate(dateKey)}
              className={`relative min-h-[76px] rounded-2xl border px-2 py-2.5 text-center transition-all ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              } ${isToday && !isActive ? 'ring-2 ring-emerald-200' : ''}`}
            >
              {isToday && (
                <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
              )}
              <span className={`block text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                {formatDayName(dateKey)}
              </span>
              <span className="mt-0.5 block text-sm font-extrabold">{formatShortDate(dateKey)}</span>
              <span className={`mt-1 block text-[10px] font-bold ${isActive ? 'text-emerald-300' : 'text-slate-400'}`}>
                {eatenCount}/{dayItems.length} món
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              {activeDate === todayKey ? 'Hôm nay' : formatDayName(activeDate, true)}
            </p>
            <h4 className="mt-0.5 text-base font-extrabold text-slate-900 sm:text-lg">
              {formatFullDate(activeDate)}
            </h4>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Đã hoàn thành <span className="font-extrabold text-slate-700">{completedItems}/{activeItems.length} món</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Ngày trước"
              disabled={activeDateIndex <= 0}
              onClick={() => moveDay(-1)}
              className="h-9 w-9 rounded-xl border-slate-200 bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Ngày tiếp theo"
              disabled={activeDateIndex === dates.length - 1}
              onClick={() => moveDay(1)}
              className="h-9 w-9 rounded-xl border-slate-200 bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {MEAL_ORDER.map((mealType) => {
          const meta = MEAL_META[mealType];
          const MealIcon = meta.icon;
          const mealItems = itemsByMeal[mealType] || [];
          const eatenCount = mealItems.filter((item) => item.eaten).length;
          const allSkipped = mealItems.length > 0 && mealItems.every((item) => item.skipReason);
          const mealHasPending = mealItems.some(
            (item) => latestSuggestionByItem.get(item.id)?.status === 'PENDING',
          );
          const dateHasPassed = activeDate < todayKey;
          const dateIsFuture = activeDate > todayKey;

          return (
            <section key={mealType} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className={`flex items-center justify-between border-b px-4 py-3 ${meta.headerClass}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${meta.iconClass}`}>
                    <MealIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h5 className="text-sm font-extrabold">{meta.label}</h5>
                    <p className="text-[10px] font-bold opacity-70">{mealItems.length} món</p>
                  </div>
                </div>
                {mealItems.length > 0 && eatenCount === mealItems.length ? (
                  <span className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-extrabold text-emerald-700">
                    <Check className="h-3 w-3" /> Hoàn thành
                  </span>
                ) : allSkipped && !dateHasPassed ? (
                  <button
                    type="button"
                    onClick={() => onUndoEntireMeal(activeDate, mealType)}
                    className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-extrabold text-amber-700 hover:bg-white"
                  >
                    <Undo2 className="h-3 w-3" /> Hoàn tác cả bữa
                  </button>
                ) : mealItems.length > 1 && eatenCount === 0 && !mealHasPending && !dateHasPassed ? (
                  <button
                    type="button"
                    onClick={() => onOpenSkip(mealItems[0], mealItems, 'MEAL')}
                    className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-extrabold opacity-75 hover:bg-white hover:opacity-100"
                  >
                    Không ăn cả bữa
                  </button>
                ) : null}
              </div>

              {mealItems.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs font-medium text-slate-400">Không có món cho bữa này</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mealItems.map((item) => {
                    const cheatMeal = isCheatMeal(item);
                    const preferenceWarning = item.foodCode && warningCodes.has(item.foodCode);
                    const suggestion = latestSuggestionByItem.get(item.id);
                    const pendingReplacement = suggestion?.status === 'PENDING';
                    const skipped = Boolean(item.skipReason);
                    const locked = dateHasPassed || dateIsFuture || pendingReplacement || skipped;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                          item.eaten
                            ? 'bg-emerald-50/50'
                            : skipped
                              ? 'bg-amber-50/45'
                              : pendingReplacement
                                ? 'bg-violet-50/50'
                                : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Đánh dấu đã ăn ${getDisplayName(item)}`}
                          title={dateIsFuture ? 'Chỉ có thể xác nhận đã ăn khi đến ngày' : undefined}
                          checked={!!item.eaten}
                          disabled={locked}
                          onChange={(event) => onMarkEaten(item.id, event.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className={`text-sm font-extrabold leading-5 ${item.eaten ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {getDisplayName(item)}
                            </p>
                            {cheatMeal && (
                              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700">
                                Cheat meal
                              </span>
                            )}
                            {preferenceWarning && (
                              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-700">
                                Kỵ sở thích
                              </span>
                            )}
                            {pendingReplacement && (
                              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-violet-700">
                                Chờ PT duyệt
                              </span>
                            )}
                            {dateHasPassed && !item.eaten && !skipped && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500">
                                Đã qua
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-slate-500">
                            {item.portionGrams && <span>{item.portionGrams}g</span>}
                            {item.skipReason && (
                              <span className="font-bold text-amber-700">
                                Không ăn · {SKIP_REASON_LABEL[item.skipReason] || item.skipReason}
                              </span>
                            )}
                          </div>
                          {pendingReplacement && (
                            <p className="mt-1 text-[11px] font-semibold text-violet-700">
                              Đề nghị: {suggestion.suggestedFoodName} ({suggestion.suggestedGram}g)
                            </p>
                          )}
                          {suggestion?.status === 'REJECTED' && suggestion.ptNote && (
                            <p className="mt-1 text-[11px] leading-4 text-rose-600">PT từ chối: {suggestion.ptNote}</p>
                          )}
                          {item.note && (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{item.note}</p>
                          )}
                        </div>

                        {!dateHasPassed && (
                          <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                            {item.eaten ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => onMarkEaten(item.id, false)} className="h-7 gap-1 rounded-lg px-2 text-[10px] font-bold text-slate-600">
                                <Undo2 className="h-3 w-3" /> Hoàn tác
                              </Button>
                            ) : pendingReplacement ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => onCancelReplacement(suggestion.id)} className="h-7 gap-1 rounded-lg px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50">
                                <XCircle className="h-3 w-3" /> Hủy yêu cầu
                              </Button>
                            ) : skipped ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => onUndoSkip(item.id)} className="h-7 gap-1 rounded-lg px-2 text-[10px] font-bold text-amber-700 hover:bg-amber-50">
                                <Undo2 className="h-3 w-3" /> Hoàn tác
                              </Button>
                            ) : (
                              <>
                                <Button type="button" size="sm" variant="ghost" title="Đề nghị thay thế" onClick={() => onSuggestReplacement(item)} className="h-7 gap-1 rounded-lg px-2 text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700">
                                  <RefreshCw className="h-3 w-3" /><span className="hidden sm:inline">Thay</span>
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => onOpenSkip(item, mealItems, 'ITEM')} className="h-7 rounded-lg px-2 text-[10px] font-bold text-amber-700 hover:bg-amber-50">
                                  Không ăn
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
