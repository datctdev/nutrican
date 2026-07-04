// src/pages/customer/MarketplacePage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { marketplaceService } from '../../services/marketplaceService';
import { Search, Star, CheckCircle2, ChevronRight, Award, ShieldCheck } from 'lucide-react';

export default function MarketplacePage() {
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => { fetchPts(); }, [page]);

  const fetchPts = async (searchTerm = search) => {
    try {
      setLoading(true);
      const params = { page, size: 12, verified: true };
      if (searchTerm) params.search = searchTerm;
      const response = await marketplaceService.getPts(params);
      setPts(response.data.data.content || []);
      setTotalPages(response.data.data.totalPages);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchPts(search);
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-12 animate-fade-in">
      
      {/* Hero Search Section */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-10 md:p-16 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-blue-200 border border-white/20 mb-6">
            <Award className="w-3 h-3 mr-1.5"/> Top 1% PT Chuyên Nghiệp
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Tìm Huấn Luyện Viên Phù Hợp</h1>
          <form onSubmit={handleSearch} className="flex bg-white rounded-2xl p-2 shadow-2xl focus-within:ring-4 focus-within:ring-blue-500/30 transition-all">
            <div className="flex-1 flex items-center px-4">
              <Search className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên, chuyên môn..." 
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 px-3 outline-none font-medium"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12 shadow-sm">Tìm kiếm</Button>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div>
        <div className="flex justify-between items-end mb-6 px-2">
          <h2 className="text-2xl font-bold text-slate-800">Huấn luyện viên nổi bật</h2>
          <span className="text-sm font-semibold text-slate-500">Đang hiển thị trang {page + 1} / {totalPages || 1}</span>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-80 w-full rounded-3xl bg-slate-200" />)}
          </div>
        ) : pts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold text-lg">Không tìm thấy huấn luyện viên nào.</p>
            <p className="text-slate-400 mt-1">Hãy thử điều chỉnh từ khóa tìm kiếm của bạn.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              {pts.map((pt) => (
                <Link to={`/pt-profile/${pt.id}`} key={pt.id} className="group">
                  <Card className="h-full bg-white border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden rounded-3xl">
                    <div className="h-24 bg-gradient-to-r from-blue-100 to-indigo-50 relative">
                      {pt.tier === 'TIER_1' && (
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center shadow-sm">
                          <ShieldCheck className="w-3 h-3 mr-1 text-blue-600" /> XÁC THỰC
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="p-6 pt-0 relative flex flex-col h-[calc(100%-6rem)]">
                      <div className="-mt-10 mb-3 relative inline-block">
                        <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md">
                          {pt.avatarUrl ? (
                            <img src={pt.avatarUrl} alt={pt.fullName} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl">
                              {getInitials(pt.fullName)}
                            </div>
                          )}
                        </div>
                        {pt.isVerified && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5"><CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" /></div>}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{pt.fullName}</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-0.5 line-clamp-1">{pt.specialty || 'Huấn luyện viên Fitness'}</p>
                        
                        <div className="flex items-center gap-1.5 mt-3 mb-4">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          <span className="text-sm font-bold text-slate-800">{pt.rating ? pt.rating.toFixed(1) : '5.0'}</span>
                          <span className="text-xs font-medium text-slate-400">({pt.reviewCount || 0} đánh giá)</span>
                        </div>

                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{pt.bio || 'Đam mê giúp bạn đạt được mục tiêu thể hình bằng phương pháp khoa học.'}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">{pt.yearsExperience || 0} năm kinh nghiệm</span>
                        <span className="text-blue-600 group-hover:text-blue-700 font-bold text-sm flex items-center">Chi tiết <ChevronRight className="w-4 h-4 ml-0.5" /></span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-3 mt-12">
                <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 text-slate-600 bg-white">Trang trước</Button>
                <div className="flex items-center px-4 font-semibold text-slate-500">Trang {page + 1} / {totalPages}</div>
                <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 text-slate-600 bg-white">Trang sau</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}