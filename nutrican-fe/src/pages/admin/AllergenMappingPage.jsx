import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';

const ALLERGEN_OPTIONS = ['GLUTEN', 'SEAFOOD', 'NUT', 'DAIRY', 'EGG', 'SOY', 'OTHER'];

export default function AllergenMappingPage() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ foodCode: '', allergens: [] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAllergenMappings();
      setMappings(res.data.data || []);
    } catch {
      toast.error('Không tải được mapping dị ứng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleAllergen = (type) => {
    setForm((f) => ({
      ...f,
      allergens: f.allergens.includes(type)
        ? f.allergens.filter((a) => a !== type)
        : [...f.allergens, type],
    }));
  };

  const handleCreate = async () => {
    if (!form.foodCode || form.allergens.length === 0) {
      toast.error('Nhập foodCode và chọn ít nhất 1 allergen');
      return;
    }
    setSaving(true);
    try {
      await adminService.createAllergenMapping(form);
      toast.success('Đã thêm mapping');
      setForm({ foodCode: '', allergens: [] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tạo mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminService.deleteAllergenMapping(id);
      toast.success('Đã xóa');
      load();
    } catch {
      toast.error('Không thể xóa');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link to="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Quay lại dashboard
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Quản lý mapping dị ứng (FR-7.7)</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-bold text-slate-800">Thêm mapping mới</h2>
          <input placeholder="foodCode (vd: pho)" value={form.foodCode}
            onChange={(e) => setForm((f) => ({ ...f, foodCode: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map((a) => (
              <button key={a} type="button" onClick={() => toggleAllergen(a)}
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  form.allergens.includes(a) ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                {a}
              </button>
            ))}
          </div>
          <Button onClick={handleCreate} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Thêm
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          ) : mappings.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có mapping nào.</p>
          ) : (
            <div className="space-y-2">
              {mappings.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800">{m.foodCode}</p>
                    <p className="text-xs text-slate-500">{(m.allergens || []).join(', ')}</p>
                  </div>
                  <button type="button" onClick={() => handleDelete(m.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
