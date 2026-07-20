// src/pages/pt/PtPortfolioEditor.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Camera, Plus, Trash2, Save, ImagePlus, Loader2, LayoutTemplate, Link as LinkIcon, Image as ImageIcon, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { toast } from 'sonner';
import { DAY_LABELS } from '../../utils/offlineHireSlots';

// HÀM XỬ LÝ LỖI MẤT ẢNH: Cắt bỏ phần đuôi Token hết hạn của MinIO
const getPermanentUrl = (url) => {
    if (!url) return '';
    return url.split('?')[0];
};

export default function PtPortfolioEditor() {
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(null);
    const [venues, setVenues] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [venueForm, setVenueForm] = useState({ name: '', address: '', mapsUrl: '', note: '' });
    const [editingVenueId, setEditingVenueId] = useState(null);
    const [savingVenue, setSavingVenue] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);

    const trainingMode = user?.ptProfile?.trainingMode;
    const needsOfflineSetup = trainingMode === 'OFFLINE' || trainingMode === 'BOTH';
    const activeVenueCount = venues.filter((v) => v.active !== false).length;
    const offlineSetupIncomplete = needsOfflineSetup && (activeVenueCount === 0 || availability.length === 0);

    const [formData, setFormData] = useState({
        bio: '',
        trainingPhilosophy: '',
        instagramUrl: '',
        linkedinUrl: '',
        portfolioShowcase: {
            coverPhotoUrl: '',
            transformations: []
        }
    });

    useEffect(() => {
        const fetchLatestProfile = async () => {
            try {
                const res = await userService.getProfile();
                const ptProfile = res.data?.data?.ptProfile;
                if (ptProfile) {
                    setFormData({
                        bio: ptProfile.bio || '',
                        trainingPhilosophy: ptProfile.trainingPhilosophy || '',
                        instagramUrl: ptProfile.instagramUrl || '',
                        linkedinUrl: ptProfile.linkedinUrl || '',
                        portfolioShowcase: ptProfile.portfolioShowcase || { coverPhotoUrl: '', transformations: [] }
                    });
                }
            } catch (error) {
                console.error("Lỗi lấy dữ liệu portfolio:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchLatestProfile();
    }, []);

    const fetchVenueAvailability = async () => {
        try {
            const [venueRes, availRes] = await Promise.all([
                userService.listPtVenues(),
                userService.getPtAvailability(),
            ]);
            setVenues(venueRes.data?.data || []);
            setAvailability(availRes.data?.data || []);
        } catch (error) {
            console.error('Lỗi lấy venue/availability:', error);
        }
    };

    useEffect(() => {
        if (needsOfflineSetup) {
            fetchVenueAvailability();
        }
    }, [needsOfflineSetup]);

    const handleSave = async () => {
        if (offlineSetupIncomplete) {
            toast.warning('Offline coaching cần ít nhất 1 địa điểm active và 1 khung giờ nhận học viên.');
        }
        try {
            setLoading(true);
            const response = await userService.updatePtProfile(formData);
            if (response.data) {
                toast.success('Cập nhật Portfolio thành công!');
                setUser({ ...user, ptProfile: response.data.data });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu Portfolio');
        } finally {
            setLoading(false);
        }
    };

    const updateShowcaseField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            portfolioShowcase: {
                ...prev.portfolioShowcase,
                [field]: value
            }
        }));
    };

    const addTransformation = () => {
        const newTransform = { id: Date.now().toString(), title: '', story: '', beforeUrl: '', afterUrl: '' };
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

    const handleImageUpload = async (type, idOrField, field, file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB');
            return;
        }

        const uploadId = type === 'cover' ? 'cover' : `${idOrField}-${field}`;
        setUploadingImage(uploadId);

        try {
            const res = await userService.uploadPortfolioImage(file);
            // Lấy URL và cắt bỏ token ngay trước khi lưu vào State
            const imageUrl = getPermanentUrl(res.data.data);

            if (type === 'cover') {
                updateShowcaseField('coverPhotoUrl', imageUrl);
            } else {
                updateTransformation(idOrField, field, imageUrl);
            }
            toast.success('Tải ảnh lên thành công!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải ảnh lên');
        } finally {
            setUploadingImage(null);
        }
    };

    const resetVenueForm = () => {
        setVenueForm({ name: '', address: '', mapsUrl: '', note: '' });
        setEditingVenueId(null);
    };

    const handleSaveVenue = async () => {
        if (!venueForm.name.trim() || !venueForm.address.trim()) {
            toast.error('Tên và địa chỉ địa điểm là bắt buộc');
            return;
        }
        setSavingVenue(true);
        try {
            if (editingVenueId) {
                await userService.updatePtVenue(editingVenueId, venueForm);
                toast.success('Cập nhật địa điểm thành công');
            } else {
                await userService.createPtVenue(venueForm);
                toast.success('Thêm địa điểm thành công');
            }
            resetVenueForm();
            fetchVenueAvailability();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể lưu địa điểm');
        } finally {
            setSavingVenue(false);
        }
    };

    const handleEditVenue = (venue) => {
        setEditingVenueId(venue.id);
        setVenueForm({
            name: venue.name || '',
            address: venue.address || '',
            mapsUrl: venue.mapsUrl || '',
            note: venue.note || '',
        });
    };

    const handleDeactivateVenue = async (venueId) => {
        try {
            await userService.deactivatePtVenue(venueId);
            toast.success('Đã ẩn địa điểm');
            fetchVenueAvailability();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể ẩn địa điểm');
        }
    };

    const addAvailabilityRow = () => {
        setAvailability((prev) => [
            ...prev,
            { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', slotMinutes: 60 },
        ]);
    };

    const updateAvailabilityRow = (index, field, value) => {
        setAvailability((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };

    const removeAvailabilityRow = (index) => {
        setAvailability((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveAvailability = async () => {
        setSavingAvailability(true);
        try {
            const res = await userService.replacePtAvailability(availability);
            setAvailability(res.data?.data || []);
            toast.success('Đã cập nhật lịch nhận học viên');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể lưu lịch nhận học viên');
        } finally {
            setSavingAvailability(false);
        }
    };

    if (fetching) {
        return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-12 animate-fade-in mt-6 px-4">

            <div className="sticky top-[64px] z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 py-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:rounded-b-3xl sm:border-x sm:border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3 pl-2">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                        <LayoutTemplate className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portfolio Builder</h1>
                        <p className="text-slate-500 mt-0.5 font-medium text-sm">Thiết kế không gian trưng bày để thu hút học viên.</p>
                    </div>
                </div>
                <div className="pr-2">
                    <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/30 h-12 px-8 font-bold text-base transition-all hover:scale-105">
                        <Save className="w-5 h-5 mr-2" /> {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </Button>
                </div>
            </div>

            {offlineSetupIncomplete && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                        <p className="font-bold text-amber-900">Thiếu cấu hình coaching offline</p>
                        <p className="mt-1 text-sm text-amber-800">
                            Học viên cần chọn địa điểm và buổi tập đầu tiên khi thuê bạn. Hãy thêm ít nhất 1 địa điểm active và 1 khung giờ trong tuần.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-4 space-y-6 sticky top-[160px]">
                    <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden group">
                        <div className="relative h-48 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {formData.portfolioShowcase?.coverPhotoUrl ? (
                                <>
                                    {/* Bọc hàm getPermanentUrl để fix ảnh cũ bị lỗi trong DB */}
                                    <img src={getPermanentUrl(formData.portfolioShowcase.coverPhotoUrl)} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-slate-100 transition-all">
                                            <Camera className="w-4 h-4"/> Đổi ảnh bìa
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('cover', null, null, e.target.files[0])} disabled={uploadingImage === 'cover'} />
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                                    {uploadingImage === 'cover' ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-8 h-8 mb-2" />}
                                    <span className="text-sm font-bold">{uploadingImage === 'cover' ? 'Đang tải...' : 'Tải lên Ảnh bìa (Cover)'}</span>
                                    <span className="text-[10px] uppercase tracking-widest mt-1 opacity-70">Tỷ lệ khuyên dùng 16:9</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('cover', null, null, e.target.files[0])} disabled={uploadingImage === 'cover'} />
                                </label>
                            )}
                        </div>
                    </Card>

                    <Card className="rounded-3xl border-slate-200 shadow-sm">
                        <CardContent className="p-6">
                            <h2 className="text-lg font-extrabold text-slate-800 mb-5">Thông tin cơ bản</h2>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tiểu sử (Bio)</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => setFormData({...formData, bio: e.target.value})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                                        rows="4"
                                        placeholder="Giới thiệu ngắn gọn về kinh nghiệm, phong cách huấn luyện của bạn..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Triết lý huấn luyện</label>
                                    <textarea
                                        value={formData.trainingPhilosophy}
                                        onChange={e => setFormData({...formData, trainingPhilosophy: e.target.value})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                                        rows="3"
                                        placeholder="Ví dụ: Kỷ luật là cầu nối giữa mục tiêu và thành tựu..."
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-100 space-y-4">
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                            <LinkIcon className="w-4 h-4 text-pink-600" /> Instagram URL
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.instagramUrl}
                                            onChange={e => setFormData({...formData, instagramUrl: e.target.value})}
                                            className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                                            placeholder="https://instagram.com/..."
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                            <LinkIcon className="w-4 h-4 text-blue-600" /> LinkedIn URL
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.linkedinUrl}
                                            onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                                            className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                                            placeholder="https://linkedin.com/..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {needsOfflineSetup && (
                        <>
                            <Card className="rounded-3xl border-slate-200 shadow-sm">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-emerald-600" />
                                        <h2 className="text-lg font-extrabold text-slate-800">Địa điểm tập</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {venues.filter((v) => v.active !== false).map((venue) => (
                                            <div key={venue.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                                <p className="font-bold text-slate-900">{venue.name}</p>
                                                <p className="mt-1 text-sm text-slate-600">{venue.address}</p>
                                                <div className="mt-2 flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleEditVenue(venue)}>Sửa</Button>
                                                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeactivateVenue(venue.id)}>Ẩn</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-2 border-t border-slate-100 pt-4">
                                        <input value={venueForm.name} onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })} placeholder="Tên phòng gym / studio" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                                        <input value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} placeholder="Địa chỉ đầy đủ" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                                        <input value={venueForm.mapsUrl} onChange={(e) => setVenueForm({ ...venueForm, mapsUrl: e.target.value })} placeholder="Link Google Maps (tuỳ chọn)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                                        <textarea value={venueForm.note} onChange={(e) => setVenueForm({ ...venueForm, note: e.target.value })} placeholder="Ghi chú (tuỳ chọn)" rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                                        <div className="flex gap-2">
                                            <Button onClick={handleSaveVenue} disabled={savingVenue} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                                {savingVenue ? 'Đang lưu...' : editingVenueId ? 'Cập nhật địa điểm' : 'Thêm địa điểm'}
                                            </Button>
                                            {editingVenueId && (
                                                <Button variant="outline" onClick={resetVenueForm}>Huỷ</Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-slate-200 shadow-sm">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-blue-600" />
                                        <h2 className="text-lg font-extrabold text-slate-800">Lịch nhận học viên</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {availability.map((row, index) => (
                                            <div key={index} className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-5">
                                                <select value={row.dayOfWeek} onChange={(e) => updateAvailabilityRow(index, 'dayOfWeek', Number(e.target.value))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm sm:col-span-2">
                                                    {Object.entries(DAY_LABELS).map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </select>
                                                <input type="time" value={row.startTime?.slice(0, 5) || '08:00'} onChange={(e) => updateAvailabilityRow(index, 'startTime', `${e.target.value}:00`)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" />
                                                <input type="time" value={row.endTime?.slice(0, 5) || '12:00'} onChange={(e) => updateAvailabilityRow(index, 'endTime', `${e.target.value}:00`)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" />
                                                <Button variant="outline" size="sm" className="text-red-600" onClick={() => removeAvailabilityRow(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={addAvailabilityRow} className="flex-1">
                                            <Plus className="mr-1 h-4 w-4" /> Thêm khung giờ
                                        </Button>
                                        <Button onClick={handleSaveAvailability} disabled={savingAvailability} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                            {savingAvailability ? 'Đang lưu...' : 'Lưu lịch'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                <div className="xl:col-span-8">
                    <Card className="rounded-3xl border-slate-200 shadow-sm h-full">
                        <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-800">Thư viện Kết quả Học viên</h2>
                                    <p className="text-sm text-slate-500 mt-1">Nơi phô diễn những màn lột xác ngoạn mục nhất.</p>
                                </div>
                                <Button onClick={addTransformation} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl font-bold h-11 shadow-sm">
                                    <Plus className="w-5 h-5 mr-1.5" /> Thêm Case Study
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {formData.portfolioShowcase?.transformations?.map((item, index) => (
                                    <div key={item.id} className="border border-slate-200 bg-white rounded-3xl relative shadow-sm hover:shadow-md transition-shadow group overflow-hidden flex flex-col">
                                        <button
                                            onClick={() => removeTransformation(item.id)}
                                            className="absolute top-4 right-4 z-10 text-white hover:text-red-400 bg-black/30 hover:bg-black/60 p-2 rounded-full transition-colors backdrop-blur-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="flex h-48 w-full bg-slate-100">
                                            <div className="w-1/2 relative border-r-2 border-white group/img">
                                                {item.beforeUrl ? (
                                                    <>
                                                        <img src={getPermanentUrl(item.beforeUrl)} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                            <label className="cursor-pointer bg-white text-slate-800 p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                                                <Camera className="w-4 h-4"/>
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'beforeUrl', e.target.files[0])} disabled={uploadingImage === `${item.id}-beforeUrl`} />
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-200 transition-colors">
                                                        {uploadingImage === `${item.id}-beforeUrl` ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6 mb-1" />}
                                                        <span className="text-xs font-bold uppercase tracking-wider">Before</span>
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'beforeUrl', e.target.files[0])} disabled={uploadingImage === `${item.id}-beforeUrl`} />
                                                    </label>
                                                )}
                                                {item.beforeUrl && <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">BEFORE</div>}
                                            </div>

                                            <div className="w-1/2 relative group/img">
                                                {item.afterUrl ? (
                                                    <>
                                                        <img src={getPermanentUrl(item.afterUrl)} alt="After" className="absolute inset-0 w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                            <label className="cursor-pointer bg-white text-slate-800 p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                                                <Camera className="w-4 h-4"/>
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'afterUrl', e.target.files[0])} disabled={uploadingImage === `${item.id}-afterUrl`} />
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-200 transition-colors">
                                                        {uploadingImage === `${item.id}-afterUrl` ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6 mb-1" />}
                                                        <span className="text-xs font-bold uppercase tracking-wider">After</span>
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('transform', item.id, 'afterUrl', e.target.files[0])} disabled={uploadingImage === `${item.id}-afterUrl`} />
                                                    </label>
                                                )}
                                                {item.afterUrl && <div className="absolute bottom-2 right-2 bg-emerald-500/90 backdrop-blur text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">AFTER</div>}
                                            </div>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col gap-5 bg-slate-50">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tiêu đề thành tựu</label>
                                                <input type="text" value={item.title} onChange={e => updateTransformation(item.id, 'title', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-bold text-sm bg-white shadow-sm" placeholder="VD: Giảm 15kg mỡ thừa..." />
                                            </div>
                                            <div className="flex-1 flex flex-col mb-1">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Câu chuyện chi tiết</label>
                                                <textarea value={item.story} onChange={e => updateTransformation(item.id, 'story', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none font-medium text-sm bg-white flex-1 min-h-[100px] resize-none shadow-sm" placeholder="Chia sẻ quá trình học viên đã nỗ lực..." />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {(!formData.portfolioShowcase?.transformations || formData.portfolioShowcase.transformations.length === 0) && (
                                <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                                        <Camera className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700">Chưa có Case Study nào</h3>
                                    <p className="text-slate-500 font-medium mt-2 max-w-md mx-auto">Hãy thêm hình ảnh Before/After của học viên để tạo sự tin tưởng tuyệt đối với khách hàng tiềm năng!</p>
                                    <Button onClick={addTransformation} className="mt-6 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl font-bold">
                                        Bắt đầu ngay
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}