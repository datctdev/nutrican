import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, ChevronDown } from 'lucide-react';
import { locationService } from '../../services/locationService';

/**
 * Combobox chọn/tìm tỉnh - thành phố Việt Nam (gọi API provinces.open-api.vn).
 * Giá trị lưu là tên tỉnh/thành (string), khớp với field `location` phía BE.
 */
export default function ProvinceSelect({
  value,
  onChange,
  placeholder = 'Chọn hoặc tìm tỉnh/thành...',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const load = async (q) => {
    setLoading(true);
    try {
      const data = await locationService.searchProvinces(q);
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = () => {
    if (disabled) return;
    setOpen(true);
    if (options.length === 0) load('');
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange?.(q);
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => load(q), 250);
  };

  const pick = (name) => {
    onChange?.(name);
    setQuery(name);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onFocus={handleFocus}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full pl-10 pr-9 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white disabled:bg-slate-50"
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
            </div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">Không tìm thấy tỉnh/thành phù hợp</div>
          )}
          {!loading &&
            options.map((o) => (
              <button
                type="button"
                key={o.code}
                onClick={() => pick(o.name)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors"
              >
                {o.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
