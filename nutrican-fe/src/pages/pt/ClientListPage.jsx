// src/pages/pt/ClientListPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
    Search, Activity, MessageSquare,
    Users, Clock, ShieldAlert, TrendingUp,
    ChevronDown
} from 'lucide-react';
import { workspaceService } from '../../services/workspaceService';
import { toast } from 'sonner';

export default function ClientListPage() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchClients = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page: 0, size: 50 };
            if (statusFilter) params.status = statusFilter;

            const response = await workspaceService.getClients(params);
            setClients(response.data.data.content || []);
        } catch (err) {
            toast.error('Không thể tải danh sách học viên');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        const loadData = async () => {
            await fetchClients();
        };
        loadData();
    }, [fetchClients]);

    const filteredClients = clients.filter(client =>
        client.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CL';

    const formatSafeDate = (dateString) => {
        if (!dateString) return 'Chưa có hoạt động';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Chưa có hoạt động' : date.toLocaleDateString('vi-VN');
    };

    const getStatusBadge = (status) => {
        const s = status?.toUpperCase();
        if (s === 'GREEN') return { label: 'Tốt / Ổn định', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        if (s === 'YELLOW' || s === 'AMBER') return { label: 'Cần nhắc nhở', color: 'bg-amber-100 text-amber-700 border-amber-200' };
        if (s === 'RED') return { label: 'Báo động', color: 'bg-red-100 text-red-700 border-red-200' };
        if (s === 'PENDING') return { label: 'Chờ duyệt', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        return { label: s || 'ACTIVE', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    };

    const filterOptions = [
        { value: '', label: 'Tất cả trạng thái' },
        { value: 'GREEN', label: 'Tốt / Ổn định', hoverClass: 'hover:bg-emerald-50 hover:text-emerald-700' },
        { value: 'YELLOW', label: 'Cần nhắc nhở', hoverClass: 'hover:bg-amber-50 hover:text-amber-700' },
        { value: 'RED', label: 'Báo động', hoverClass: 'hover:bg-red-50 hover:text-red-700' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh sách Học viên</h1>
                    <p className="text-slate-500 mt-1 font-medium">Quản lý tiến độ và tương tác với các học viên của bạn.</p>
                </div>
                <div className="bg-white text-slate-600 px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm flex items-center shadow-sm">
                    <Users className="w-4 h-4 mr-2 text-blue-500" /> {clients.length} Học viên đang quản lý
                </div>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 relative">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tên học viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                        />
                    </div>

                    {/* CUSTOM DROPDOWN SIÊU MƯỢT THAY CHO <select> */}
                    <div className="relative min-w-[180px]" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center justify-between w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-700 font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <span>{filterOptions.find(opt => opt.value === statusFilter)?.label}</span>
                            <ChevronDown className={`w-4 h-4 ml-2 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-[200px] z-50 origin-top-right bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-1.5 flex flex-col gap-0.5">
                                    {filterOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setStatusFilter(option.value);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-xl text-left transition-colors ${
                                                statusFilter === option.value
                                                    ? 'bg-slate-100 text-slate-900'
                                                    : `text-slate-600 ${option.hoverClass || 'hover:bg-slate-50 hover:text-blue-600'}`
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl bg-slate-200" />)}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                    <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">Không tìm thấy học viên</h3>
                    <p className="text-slate-500 mt-2 font-medium">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => {
                        const badge = getStatusBadge(client.status);

                        return (
                            <Card key={client.clientId} className="bg-white border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden flex flex-col group">
                                <div className="h-3 bg-gradient-to-r from-blue-500 to-indigo-500" />

                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/50 flex items-center justify-center text-blue-700 font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
                                            {client.clientAvatarUrl ? (
                                                <img src={client.clientAvatarUrl} alt={client.clientName} className="w-full h-full rounded-2xl object-cover" />
                                            ) : (
                                                getInitials(client.clientName)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-extrabold text-lg text-slate-900 truncate" title={client.clientName}>
                                                {client.clientName}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-500">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate">Log gần nhất: {formatSafeDate(client.lastLogTime)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 flex-1">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</span>
                                            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md border ${badge.color}`}>
                        {badge.label}
                      </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá chung</span>
                                            <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
                                                <Activity className="w-4 h-4 text-blue-500" />
                                                {client.status === 'RED' ? 'Kém' : client.status === 'YELLOW' ? 'Trung bình' : 'Tuyệt vời'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                navigate(`/pt/chat`);
                                                toast.success(`Chuyển đến đoạn chat với ${client.clientName}`);
                                            }}
                                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl h-11 shadow-sm font-bold transition-colors"
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" /> Nhắn tin
                                        </Button>

                                        <Button
                                            onClick={() => navigate(`/pt/progress/${client.clientId}`)}
                                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 shadow-sm font-bold transition-all"
                                        >
                                            Tiến độ <TrendingUp className="w-4 h-4 ml-1.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}