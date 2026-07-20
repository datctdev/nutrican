// src/pages/customer/components/FoodSearchInput.jsx
import { useEffect, useRef, useState } from 'react';
import { dietService } from '../../../services/dietService';
import { CATEGORY_GROUPS, getCategoryColors, getCategoryLabel } from './categoryColors';

/** Một quy tắc duy nhất: chỉ search khi ≥ 2 ký tự. Chip nhóm chỉ lọc kết quả sau khi đã gõ. */
const SEARCH_MIN_LEN = 2;
const SEARCH_DEBOUNCE_MS = 300;

function highlightName(name, query) {
    if (!name) return null;
    const q = (query || '').trim();
    if (q.length < SEARCH_MIN_LEN) return name;
    const lower = name.toLowerCase();
    const qi = lower.indexOf(q.toLowerCase());
    if (qi < 0) return name;
    return (
        <>
            {name.slice(0, qi)}
            <mark className="bg-amber-100 text-slate-900 font-extrabold px-0.5 rounded-sm">
                {name.slice(qi, qi + q.length)}
            </mark>
            {name.slice(qi + q.length)}
        </>
    );
}

function FoodResultRow({ food, query, onSelect }) {
    const group = food.categoryGroup || 'OTHER';
    const colors = getCategoryColors(group);
    const label = getCategoryLabel(group, food.categoryGroupLabel);
    return (
        <button
            type="button"
            onClick={() => onSelect(food)}
            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-3 border-0 border-b border-slate-100 last:border-b-0 outline-none"
        >
            <span className="min-w-0 flex-1 font-semibold truncate">
                {highlightName(food.nameVi, query)}
                {food.prefMismatch && (
                    <span className="ml-2 shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">!PREF</span>
                )}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors.pill}`}>
                {label}
            </span>
            <span className="text-slate-400 text-xs shrink-0 tabular-nums">
                {Math.round(parseFloat(food.calories || 0))} kcal / {Math.round(parseFloat(food.servingSizeG || 100))}g
            </span>
        </button>
    );
}

function SkeletonRows() {
    return (
        <div className="px-4 py-2 space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded flex-1" />
                    <div className="h-4 w-12 bg-slate-200 rounded" />
                    <div className="h-4 w-20 bg-slate-100 rounded" />
                </div>
            ))}
        </div>
    );
}

/**
 * Tìm thực phẩm — luôn yêu cầu ≥ 2 ký tự trước khi hiện danh sách.
 * Chip nhóm (Đạm/Tinh bột/…) chỉ lọc kết quả sau khi đã gõ đủ.
 */
export default function FoodSearchInput({
    dietFilter = true,
    onSelect,
    placeholder = 'Gõ ít nhất 2 ký tự — vd: thịt bò, trứng, rau…',
}) {
    const [query, setQuery] = useState('');
    const [categoryGroup, setCategoryGroup] = useState(null);
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const wrapRef = useRef(null);
    const seqRef = useRef(0);
    const debounceRef = useRef(null);
    const composingRef = useRef(false);

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const runSearch = async (q, group) => {
        const trimmed = (q || '').trim();
        if (trimmed.length < SEARCH_MIN_LEN) {
            setResults([]);
            setSearchLoading(false);
            setSearchError(false);
            return;
        }
        const seq = ++seqRef.current;
        setSearchLoading(true);
        setSearchError(false);
        try {
            const params = { dietFilter };
            if (group) params.categoryGroup = group;
            const res = await dietService.searchFoods(trimmed, params);
            if (seq !== seqRef.current) return;
            const list = res.data?.data;
            setResults(Array.isArray(list) ? list : []);
        } catch {
            if (seq !== seqRef.current) return;
            setResults([]);
            setSearchError(true);
        } finally {
            if (seq === seqRef.current) setSearchLoading(false);
        }
    };

    const scheduleSearch = (value, group) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const trimmed = (value || '').trim();
        if (trimmed.length < SEARCH_MIN_LEN) {
            seqRef.current += 1;
            setResults([]);
            setSearchLoading(false);
            setSearchError(false);
            return;
        }
        debounceRef.current = setTimeout(() => runSearch(value, group), SEARCH_DEBOUNCE_MS);
    };

    const onChangeQuery = (value) => {
        setQuery(value);
        setOpen(true);
        if (composingRef.current) return;
        scheduleSearch(value, categoryGroup);
    };

    const onPickGroup = (key) => {
        setCategoryGroup(key);
        setOpen(true);
        // Chỉ lọc lại khi đã gõ đủ — không bao giờ hiện list khi chưa gõ
        if ((query || '').trim().length >= SEARCH_MIN_LEN) {
            scheduleSearch(query, key);
        }
    };

    const handleSelect = (food) => {
        onSelect?.(food);
        setQuery('');
        setResults([]);
        setOpen(false);
    };

    const queryActive = (query || '').trim().length >= SEARCH_MIN_LEN;
    const groupLabel = CATEGORY_GROUPS.find((g) => g.key === categoryGroup)?.label;

    const renderPanelBody = () => {
        if (!queryActive) {
            return (
                <p className="px-4 py-3 text-sm text-slate-500">
                    {categoryGroup
                        ? `Gõ ≥ 2 ký tự để tìm trong nhóm ${groupLabel}`
                        : 'Gõ ≥ 2 ký tự để tìm thực phẩm'}
                </p>
            );
        }
        if (searchLoading) return <SkeletonRows />;
        if (searchError) {
            return (
                <p className="px-4 py-3 text-sm text-rose-600">
                    Lỗi tìm kiếm. Kiểm tra mạng / đăng nhập rồi thử lại.
                </p>
            );
        }
        if (results.length === 0) {
            return (
                <p className="px-4 py-3 text-sm text-slate-500">
                    Không tìm thấy món nào{categoryGroup ? ` trong nhóm ${groupLabel}` : ''}. Thử bỏ dấu hoặc đổi nhóm.
                </p>
            );
        }
        return results.map((food) => (
            <FoodResultRow key={food.id} food={food} query={query} onSelect={handleSelect} />
        ));
    };

    return (
        <div className="relative space-y-2" ref={wrapRef}>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
                {CATEGORY_GROUPS.map((g) => {
                    const active = categoryGroup === g.key;
                    const colors = getCategoryColors(g.key);
                    return (
                        <button
                            key={g.key ?? 'ALL'}
                            type="button"
                            onClick={() => onPickGroup(g.key)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                active ? colors.solid : colors.outline
                            }`}
                        >
                            {g.label}
                        </button>
                    );
                })}
            </div>
            <label className="block text-sm font-bold text-slate-700">Tìm thực phẩm</label>
            <input
                type="text"
                value={query}
                onChange={(e) => onChangeQuery(e.target.value)}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={(e) => {
                    composingRef.current = false;
                    onChangeQuery(e.target.value);
                }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
            {open && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-80 overflow-auto ring-1 ring-black/5">
                    {renderPanelBody()}
                </div>
            )}
        </div>
    );
}
