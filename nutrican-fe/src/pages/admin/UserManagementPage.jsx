import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { adminService } from '../../services/adminService';
import { Search, Filter, Mail, ShieldAlert, Activity } from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, role, status]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { page, size: 10 };
      if (search) params.search = search;
      if (role) params.role = role;
      if (status) params.status = status;

      const response = await adminService.getUsers(params);
      const resData = response?.data;

      let parsedUsers = [];
      let totalCount = 0;
      let pagesCount = 1;

      if (resData) {
        if (Array.isArray(resData)) {
          parsedUsers = resData;
          totalCount = resData.length;
        } else if (resData.data && Array.isArray(resData.data)) {
          parsedUsers = resData.data;
          totalCount = resData.data.length;
        } else if (resData.content && Array.isArray(resData.content)) {
          parsedUsers = resData.content;
          totalCount = resData.totalElements || resData.content.length;
          pagesCount = resData.totalPages || 1;
        } else if (resData.data?.content && Array.isArray(resData.data.content)) {
          parsedUsers = resData.data.content;
          totalCount = resData.data.totalElements || resData.data.content.length;
          pagesCount = resData.data.totalPages || 1;
        }
      }

      setUsers(parsedUsers);
      setTotalElements(totalCount);
      setTotalPages(pagesCount);
    } catch (err) {
      console.error('Lỗi khi fetch API:', err);
      toast.warning('Backend API Error! Đang hiển thị Mock Data tạm thời.');
      setUsers([
        { id: 1, fullName: 'Nguyễn Quốc Huy', email: 'huynguyen@gmail.com', role: 'CUSTOMER', status: 'ACTIVE', avatarUrl: null },
        { id: 2, fullName: 'Trần Văn Đạt', email: 'datctdev@nutrican.com', role: 'ADMIN', status: 'ACTIVE', avatarUrl: null },
        { id: 3, fullName: 'Sarah Johnson', email: 'sarah.fit@example.com', role: 'PT_CERTIFIED', status: 'ACTIVE', avatarUrl: null },
        { id: 4, fullName: 'Mike Chen', email: 'mike.c@example.com', role: 'PT_FREELANCE', status: 'PENDING_APPROVAL', avatarUrl: null },
      ]);
      setTotalElements(4);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await adminService.updateUserStatus(userId, newStatus);
      toast.success('Cập nhật trạng thái người dùng thành công');
      fetchUsers();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Không thể cập nhật trạng thái người dùng.');
    }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const RoleBadge = ({ role }) => {
    const map = {
      'ADMIN': { text: 'QUẢN TRỊ VIÊN', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      'PT_CERTIFIED': { text: 'PT CHUYÊN NGHIỆP', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      'PT_FREELANCE': { text: 'PT TỰ DO', color: 'bg-sky-100 text-sky-700 border-sky-200' },
      'CUSTOMER': { text: 'HỌC VIÊN', color: 'bg-slate-100 text-slate-600 border-slate-200' }
    };
    const badge = map[role] || { text: role || 'USER', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const map = {
      'ACTIVE': { text: 'ĐANG HOẠT ĐỘNG', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      'INACTIVE': { text: 'KHÔNG HOẠT ĐỘNG', color: 'bg-slate-100 text-slate-500 border-slate-200' },
      'PENDING_APPROVAL': { text: 'CHỜ PHÊ DUYỆT', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      'SUSPENDED': { text: 'ĐÃ KHÓA', color: 'bg-red-100 text-red-700 border-red-200' }
    };
    const badge = map[status] || { text: status || 'CHƯA RÕ', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản Lý Người Dùng</h1>
          <p className="text-slate-500 mt-1 font-medium">Quản lý tài khoản, vai trò và quyền truy cập hệ thống.</p>
        </div>
        <div className="bg-white text-slate-600 px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm flex items-center shadow-sm">
          <Activity className="w-4 h-4 mr-2 text-blue-500" /> Tổng cộng {totalElements} người dùng
        </div>
      </div>


      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={role}
                onChange={(e) => { setRole(e.target.value); setPage(0); }}
                className="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="">Tất cả vai trò</option>
                <option value="CUSTOMER">Học viên</option>
                <option value="PT_CERTIFIED">PT Chuyên nghiệp</option>
                <option value="PT_FREELANCE">PT Tự do</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                className="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
                <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
                <option value="SUSPENDED">Đã khóa</option>
              </select>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6">
                <Filter className="w-4 h-4 mr-2" /> Lọc
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>


      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-100" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50">
            <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Không tìm thấy người dùng nào</h3>
            <p className="text-slate-500 mt-2 font-medium">Hãy thử điều chỉnh từ khóa hoặc bộ lọc của bạn.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Người dùng</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Thông tin liên hệ</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Vai trò</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Trạng thái</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Quyền truy cập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 text-slate-500 font-bold text-sm">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(user.fullName)
                          )}
                        </div>
                        <span className="font-bold text-slate-900">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-fit shadow-sm">
                        <Mail className="w-4 h-4 mr-2 text-slate-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.status}
                        onChange={(e) => handleUpdateStatus(user.id, e.target.value)}
                        className={`text-xs font-bold border rounded-lg px-3 py-2 outline-none cursor-pointer transition-all shadow-sm
                          ${user.status === 'ACTIVE' ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' 
                          : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
                      >
                        <option value="ACTIVE">Kích hoạt</option>
                        <option value="INACTIVE">Vô hiệu hóa</option>
                        <option value="SUSPENDED">Khóa tài khoản</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


        {(totalPages > 1 || page > 0) && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm font-semibold text-slate-500">
              Đang hiển thị {page * 10 + 1} - {Math.min((page + 1) * 10, totalElements)} trong tổng số <span className="font-bold text-slate-900">{totalElements}</span> người dùng
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border-slate-200 bg-white text-slate-600 font-bold">
                Trang trước
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="rounded-xl border-slate-200 bg-white text-slate-600 font-bold">
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}