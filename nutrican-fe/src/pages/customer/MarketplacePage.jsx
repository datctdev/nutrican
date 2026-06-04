import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import Input from '../../components/ui/input';
import { marketplaceService } from '../../services/marketplaceService';
import { Search, Star, CheckCircle, RefreshCw, Award } from 'lucide-react';

export default function MarketplacePage() {
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchPts();
  }, [page]);

  const fetchPts = async (searchTerm = '') => {
    try {
      setLoading(true);
      const params = { page, size: 12 };
      if (searchTerm) params.search = searchTerm;
      const response = await marketplaceService.getPts(params);
      setPts(response.data.data.content || []);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error('Error fetching PTs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchPts(search);
  };

  const getTierColor = (tier) => {
    return tier === 'TIER_1' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600';
  };

  if (loading && pts.length === 0) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Your PT</h1>
            <p className="text-sm text-gray-500">Browse certified and freelance personal trainers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/register/pt"
            className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
          >
            Register as PT
          </Link>
          <button
            onClick={() => fetchPts()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search by name or specialty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {loading && pts.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">Refreshing...</div>
      )}

      {pts.length === 0 && !loading ? (
        <Card className="p-12 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900">No PTs found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {search ? 'Try adjusting your search terms' : 'No personal trainers available yet'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pts.map((pt) => (
              <Card key={pt.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <Avatar
                    src={pt.avatarUrl}
                    alt={pt.fullName}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{pt.fullName}</h3>
                      {pt.isVerified && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTierColor(pt.tier)}`}>
                        {pt.tier === 'TIER_1' ? 'Certified PT' : 'Freelance PT'}
                      </span>
                    </div>
                    {pt.specialty && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{pt.specialty}</p>
                    )}
                    {pt.bio && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{pt.bio}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      {pt.rating != null && (
                        <span className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {pt.rating.toFixed(1)}/5
                        </span>
                      )}
                      <Link
                        to={`/pt-profile/${pt.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors text-sm"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
