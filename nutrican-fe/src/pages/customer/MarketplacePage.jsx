import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import Badge from '../../components/ui/badge';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import Input from '../../components/ui/input';
import { marketplaceService } from '../../services/marketplaceService';
import { Search, Star, CheckCircle } from 'lucide-react';

export default function MarketplacePage() {
  const [pts, setPts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchPts();
  }, [page]);

  const fetchPts = async () => {
    try {
      setLoading(true);
      const response = await marketplaceService.getPts({ 
        page, 
        size: 12,
        verified: true 
      });
      setPts(response.data.data.content);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error('Error fetching PTs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setPage(0);
    try {
      setLoading(true);
      const response = await marketplaceService.getPts({ 
        search, 
        page: 0, 
        size: 12,
        verified: true 
      });
      setPts(response.data.data.content);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error('Error searching PTs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeVariant = (tier) => {
    return tier === 'TIER_1' ? 'default' : 'secondary';
  };

  if (loading && pts.length === 0) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Find Your PT</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-80"
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {pts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No PTs found. Try adjusting your search.</p>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pts.map((pt) => (
              <Card key={pt.id} className="p-4 hover:shadow-md transition-shadow">
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
                      <Badge variant={getTierBadgeVariant(pt.tier)} className="flex-shrink-0">
                        {pt.tier === 'TIER_1' ? 'Certified' : 'Freelance'}
                      </Badge>
                    </div>
                    {pt.specialty && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{pt.specialty}</p>
                    )}
                    {pt.bio && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{pt.bio}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      {pt.rating && (
                        <span className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                          <Star className="w-4 h-4 fill-yellow-400" />
                          {pt.rating.toFixed(1)}/5
                        </span>
                      )}
                      <Link 
                        to={`/pt-profile/${pt.id}`} 
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
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
