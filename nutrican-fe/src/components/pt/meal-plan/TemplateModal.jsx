import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { workspaceService } from '../../../services/workspaceService';
import { toast } from 'sonner';
import { Loader2, X, FileText, CheckCircle2 } from 'lucide-react';

export default function TemplateModal({ isOpen, onClose, onApply, onSaveAsTemplate, items, weekStart }) {
  const [tab, setTab] = useState('apply'); // 'apply' | 'save'
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // For Save
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setTab('apply');
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await workspaceService.getTemplates();
      setTemplates(res.data.data || []);
    } catch {
      toast.error('Lỗi khi tải danh sách mẫu');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (templateId) => {
    try {
      await onApply(templateId);
      toast.success('Đã áp dụng mẫu thành công!');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi áp dụng mẫu');
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Vui lòng nhập tên mẫu');
      return;
    }
    try {
      setLoading(true);
      await onSaveAsTemplate({
        name: templateName,
        description: templateDesc,
        items: items
      });
      toast.success('Lưu mẫu thành công!');
      setTemplateName('');
      setTemplateDesc('');
      onClose();
    } catch {
      toast.error('Lỗi khi lưu mẫu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">Mẫu Thực Đơn</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          <button 
            className={`flex-1 py-3 text-sm font-bold ${tab === 'apply' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setTab('apply')}
          >
            Áp dụng Mẫu
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold ${tab === 'save' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setTab('save')}
          >
            Lưu thành Mẫu
          </button>
        </div>

        <div className="p-6">
          {tab === 'apply' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center p-6 text-slate-400">Chưa có mẫu nào</div>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="p-4 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800">{t.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                    </div>
                    <Button onClick={() => handleApply(t.id)} size="sm" className="shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-200">
                      Chọn
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'save' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tên mẫu <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="VD: Giảm mỡ Nữ 1500kcal"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mô tả</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt mẫu..."
                />
              </div>
              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl flex gap-3 items-start">
                <FileText className="w-5 h-5 shrink-0 text-blue-500" />
                <p>Toàn bộ thực đơn của tuần <strong>{new Date(weekStart).toLocaleDateString('vi-VN')}</strong> sẽ được lưu thành mẫu để tái sử dụng.</p>
              </div>
              <Button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 font-bold">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Xác nhận Lưu Mẫu
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
