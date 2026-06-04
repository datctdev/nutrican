import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { marketplaceService } from '../../services/marketplaceService';
import { toast } from 'sonner';
import { Star, Shield, Award, BookOpen, MessageSquare, ChevronLeft } from 'lucide-react';

export default function PtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pt, setPt] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPtDetail();
    fetchReviews();
  }, [id]);

  const fetchPtDetail = async () => {
    try {
      setLoading(true);
      const response = await marketplaceService.getPtDetail(id);
      setPt(response.data.data);
    } catch (err) {
      console.error('Error fetching PT detail:', err);
      toast.error('Failed to load PT profile');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (page = 0) => {
    try {
      const response = await marketplaceService.getPtReviews(id, { page, size: 10 });
      setReviews(response.data.data.content || []);
      setReviewTotalPages(response.data.data.totalPages);
      setReviewPage(page);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await marketplaceService.createReview(id, reviewData);
      toast.success('Review submitted!');
      setShowReviewForm(false);
      setReviewData({ rating: 5, comment: '' });
      fetchReviews(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'TIER_1': return <Badge variant="default" className="bg-purple-100 text-purple-700">Certified PT</Badge>;
      case 'TIER_2': return <Badge variant="outline">Freelance PT</Badge>;
      default: return <Badge>{tier}</Badge>;
    }
  };

  const renderStars = (rating, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={interactive ? () => setReviewData(prev => ({ ...prev, rating: star })) : undefined}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${star <= (interactive ? reviewData.rating : rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );

  if (loading) return <Spinner />;
  if (!pt) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to marketplace
      </button>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar src={pt.avatarUrl} alt={pt.fullName} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{pt.fullName}</h1>
              {pt.isVerified && <Badge variant="success" className="flex items-center gap-1"><Shield className="w-3 h-3" /> Verified</Badge>}
              {getTierBadge(pt.tier)}
            </div>
            <p className="text-gray-500">{pt.email}</p>

            {pt.rating != null && (
              <div className="flex items-center gap-2 mt-2">
                {renderStars(Math.round(pt.rating))}
                <span className="text-sm font-medium text-gray-700">{pt.rating?.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({pt.totalReviews || 0} reviews)</span>
              </div>
            )}

            {pt.bio && <p className="mt-3 text-gray-700">{pt.bio}</p>}
          </div>
        </div>

        <div className="mt-6 flex gap-3 flex-wrap">
          <Button
            variant="default"
            onClick={() => toast.info('Consultation request sent!')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Request Consultation
          </Button>
        </div>
      </Card>

      {pt.trainingPhilosophy && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Training Philosophy
          </h2>
          <p className="text-gray-700">{pt.trainingPhilosophy}</p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {pt.specializations && pt.specializations.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Specializations
            </h2>
            <div className="flex flex-wrap gap-2">
              {pt.specializations.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
          </Card>
        )}

        {pt.certifications && (
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Certifications
            </h2>
            <p className="text-gray-700">{pt.certifications}</p>
            {pt.yearsOfExperience != null && (
              <p className="text-sm text-gray-500 mt-2">{pt.yearsOfExperience} years of experience</p>
            )}
          </Card>
        )}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Reviews</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            Write a Review
          </Button>
        </div>

        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Your Rating</label>
              {renderStars(reviewData.rating, true)}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Comment</label>
              <textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                rows="3"
                placeholder="Share your experience..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={submitting}>Submit Review</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs flex-shrink-0">
                    {review.reviewerName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{review.reviewerName}</p>
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-gray-400">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
                {review.comment && <p className="text-sm text-gray-600 mt-2">{review.comment}</p>}
              </div>
            ))}

            {reviewTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fetchReviews(reviewPage - 1)} disabled={reviewPage === 0}>Previous</Button>
                <span className="text-sm text-gray-500 py-2">{reviewPage + 1} / {reviewTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchReviews(reviewPage + 1)} disabled={reviewPage >= reviewTotalPages - 1}>Next</Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
