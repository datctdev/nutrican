import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Camera, Plus, Trash2, Save, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { toast } from 'sonner';

export default function PtPortfolioEditor() {
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        bio: '',
        trainingPhilosophy: '',
        instagramUrl: '',
        linkedinUrl: '',
        portfolioShowcase: { transformations: [] }
    });

    useEffect(() => {
        if (user?.ptProfile) {
            setFormData({
                bio: user.ptProfile.bio || '',
                trainingPhilosophy: user.ptProfile.trainingPhilosophy || '',
                instagramUrl: user.ptProfile.instagramUrl || '',
                linkedinUrl: user.ptProfile.linkedinUrl || '',
                portfolioShowcase: user.ptProfile.portfolioShowcase || { transformations: [] }
            });
        }
    }, [user]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await userService.updatePtProfile(formData);
            if (response.data) {
                toast.success('Cập nhật Portfolio thành công!');
                setUser({ ...user, ptProfile: response.data });
            }
        } catch (error) {
            toast.error(error.message || 'Có lỗi xảy ra khi lưu Portfolio');
        } finally {
            setLoading(false);
        }
    };

    const addTransformation = () => {
        const newTransform = { id: Date.now(), title: '', story: '', beforeUrl: '', afterUrl: '' };
        setFormData(prev => ({
            ...prev,
            portfolioShowcase: {
                ...prev.portfolioShowcase,
                transformations: [...(prev.portfolioShowcase?.transformations || []), newTransform]
            }
        }));
    };

    const removeTransformation = (id) => {
        setFormData(prev => ({
            ...prev,
            portfolioShowcase: {
                ...prev.portfolioShowcase,
                transformations: prev.portfolioShowcase.transformations.filter(t => t.id !== id)
            }
        }));
    };

    const updateTransformation = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            portfolioShowcase: {
                ...prev.portfolioShowcase,
                transformations: prev.portfolioShowcase.transformations.map(t => 
                    t.id === id ? { ...t, [field]: value } : t
                )
            }
        }));
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Portfolio Builder</h1>
                    <p className="text-slate-500 mt-2 font-medium">Thiết kế thương hiệu cá nhân của bạn để thu hút học viên.</p>
                </div>
                <Button onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/30">
                    <Save className="w-5 h-5 mr-2" /> {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </Button>
            </div>

            <div className="space-y-6">
                <Card className="rounded-3xl border-slate-200">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Thông tin cơ bản</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tiểu sử (Bio)</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({...formData, bio: e.target.value})}
                                    className="w-full p-4 rounded-xl border border-slate-200 focus:border-purple-500 outline-none"
                                    rows="3"
                                    placeholder="Giới thiệu ngắn gọn về bản thân..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Triết lý huấn luyện</label>
                                <textarea
                                    value={formData.trainingPhilosophy}
                                    onChange={e => setFormData({...formData, trainingPhilosophy: e.target.value})}
                                    className="w-full p-4 rounded-xl border border-slate-200 focus:border-purple-500 outline-none"
                                    rows="3"
                                    placeholder="Triết lý tập luyện và ăn uống của bạn là gì?"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Instagram URL</label>
                                    <input
                                        type="text"
                                        value={formData.instagramUrl}
                                        onChange={e => setFormData({...formData, instagramUrl: e.target.value})}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none"
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn URL</label>
                                    <input
                                        type="text"
                                        value={formData.linkedinUrl}
                                        onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none"
                                        placeholder="https://linkedin.com/..."
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Thư viện Kết quả (Transformation Gallery)</h2>
                            <Button onClick={addTransformation} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl">
                                <Plus className="w-5 h-5 mr-2" /> Thêm Case Study
                            </Button>
                        </div>

                        <div className="space-y-8">
                            {formData.portfolioShowcase?.transformations?.map((item, index) => (
                                <div key={item.id} className="p-6 border border-slate-100 bg-slate-50 rounded-2xl relative">
                                    <button onClick={() => removeTransformation(item.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <h3 className="font-bold text-slate-600 mb-4">Học viên #{index + 1}</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">URL Ảnh Before (Tạm thời)</label>
                                            <input type="text" value={item.beforeUrl} onChange={e => updateTransformation(item.id, 'beforeUrl', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none" placeholder="Link ảnh..." />
                                            {item.beforeUrl && <img src={item.beforeUrl} alt="Before" className="mt-2 h-32 w-full object-cover rounded-xl" />}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">URL Ảnh After (Tạm thời)</label>
                                            <input type="text" value={item.afterUrl} onChange={e => updateTransformation(item.id, 'afterUrl', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none" placeholder="Link ảnh..." />
                                            {item.afterUrl && <img src={item.afterUrl} alt="After" className="mt-2 h-32 w-full object-cover rounded-xl" />}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề (Vd: Giảm 10kg mỡ thừa)</label>
                                            <input type="text" value={item.title} onChange={e => updateTransformation(item.id, 'title', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Câu chuyện chi tiết</label>
                                            <textarea value={item.story} onChange={e => updateTransformation(item.id, 'story', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none" rows="2" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {(!formData.portfolioShowcase?.transformations || formData.portfolioShowcase.transformations.length === 0) && (
                                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                                    <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Chưa có hình ảnh nào. Hãy thêm kết quả của học viên để tăng độ uy tín!</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
