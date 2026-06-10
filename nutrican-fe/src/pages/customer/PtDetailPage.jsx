// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { Star, ShieldCheck, Award, FileText, CheckCircle2, ArrowLeft, MessageSquare } from 'lucide-react';

export default function PtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pt, setPt] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
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
    } catch (err) { console.error('Error fetching reviews:', err); }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await marketplaceService.createReview(id, reviewData);
      toast.success('Review submitted!');
      setShowReviewForm(false);
      fetchReviews(0);
    } catch (err) { toast.error('Failed to submit review'); } 
    finally { setSubmitting(false); }
  };

  const renderStars = (rating, interactive = false) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} onClick={interactive ? () => setReviewData({ ...reviewData, rating: star }) : undefined} className={`w-5 h-5 ${interactive ? 'cursor-pointer' : ''} ${star <= (interactive ? reviewData.rating : rating) ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`} />
      ))}
    </div>
  );

  if (loading) return <div className="max-w-6xl mx-auto space-y-6 pb-12 p-4"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!pt) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Marketplace</button>
      
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
        <div className="h-40 md:h-56 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <CardContent className="p-8 pt-0 relative sm:flex gap-8">
          <div className="-mt-16 relative inline-block shrink-0">
            <div className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-lg">
              {pt.avatarUrl ? <img src={pt.avatarUrl} alt={pt.fullName} className="w-full h-full rounded-2xl object-cover" /> : <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-3xl">PT</div>}
            </div>
            {pt.isVerified && <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1"><CheckCircle2 className="w-7 h-7 text-emerald-500 fill-emerald-50" /></div>}
          </div>
          <div className="flex-1 pt-4 sm:pt-6">
            <div className="flex justify-between">
              <div>
                <h1 className="text-3xl font-black text-slate-900">{pt.fullName}</h1>
                <p className="text-lg font-bold text-slate-500 mt-1">{pt.email}</p>
              </div>
              <Button onClick={() => setShowReviewForm(!showReviewForm)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">Write Review</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showReviewForm && (
        <Card className="p-6 bg-slate-50 border-slate-200 rounded-3xl">
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div><label className="font-bold text-slate-700 block mb-2">Rating</label>{renderStars(reviewData.rating, true)}</div>
            <div>
              <label className="font-bold text-slate-700 block mb-2">Comment</label>
              <textarea value={reviewData.comment} onChange={(e) => setReviewData({...reviewData, comment: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" rows="3" placeholder="Share your experience..." />
            </div>
            <div className="flex gap-2"><Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Submit</Button><Button type="button" variant="outline" onClick={() => setShowReviewForm(false)} className="rounded-xl">Cancel</Button></div>
          </form>
        </Card>
      )}

      {/* Render Reviews List */}
      <Card className="p-8 rounded-3xl bg-white shadow-sm border-slate-200">
        <h3 className="text-xl font-bold mb-6">Client Reviews</h3>
        {reviews.length === 0 ? <p className="text-slate-500">No reviews yet.</p> : (
          <div className="space-y-6">
            {reviews.map(rev => (
              <div key={rev.id} className="border-b border-slate-100 pb-6 last:border-0">
                <div className="flex gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">{rev.reviewerName?.slice(0,2).toUpperCase()}</div>
                  <div><p className="font-bold text-slate-900">{rev.reviewerName}</p>{renderStars(rev.rating)}</div>
                </div>
                <p className="text-slate-600 ml-13 mt-2 font-medium bg-slate-50 p-4 rounded-xl">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}