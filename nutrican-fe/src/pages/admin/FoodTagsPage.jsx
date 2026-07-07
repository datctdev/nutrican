import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const DIET_TAG_OPTIONS = ['VEGAN', 'VEGETARIAN', 'KETO', 'EAT_CLEAN', 'HALAL'];

export default function FoodTagsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState(null);
  const [filter, setFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminService.getFoodTags();
      setRows(res.data.data || []);
    } catch {
      toast.error('Không tải được diet tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleTag = (foodCode, tag) => {
    setRows((prev) => prev.map((r) => {
      if (r.foodCode !== foodCode) return r;
      const tags = r.dietTags || [];
      const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
      return { ...r, dietTags: next };
    }));
  };

  const handleSave = async (row) => {
    if (!row.dietTags?.length) {
      toast.error('Chọn ít nhất 1 diet tag');
      return;
    }
    setSavingCode(row.foodCode);
    try {
      await adminService.updateFoodTags(row.foodCode, row.dietTags);
      toast.success(`Đã cập nhật ${row.foodCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu');
    } finally {
      setSavingCode(null);
    }
  };

  const filtered = rows.filter((r) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (r.foodCode || '').toLowerCase().includes(q)
      || (r.nameVi || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Link to="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Quay lại dashboard
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Quản lý diet tags (GAP-A)</h1>
      <p className="text-sm text-slate-500">Gán tag chế độ ăn cho foodCode — dùng cho lọc tìm kiếm và cảnh báo !PREF.</p>

      <input
        placeholder="Lọc theo foodCode hoặc tên..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">Không có món nào.</p>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {filtered.map((row) => (
                <div key={row.foodCode} className="p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{row.nameVi}</p>
                      <p className="text-xs text-slate-500 font-mono">{row.foodCode}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingCode === row.foodCode}
                      onClick={() => handleSave(row)}
                      className="gap-1 shrink-0"
                    >
                      {savingCode === row.foodCode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Lưu
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DIET_TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(row.foodCode, tag)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          (row.dietTags || []).includes(tag)
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
