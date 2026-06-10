// src/pages/customer/PtDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { marketplaceService } from '../../services/marketplaceService';
import { Star, ShieldCheck, Award, MapPin, Calendar, Clock, ArrowLeft, MessageSquare, CheckCircle2, Dumbbell } from 'lucide-react';

export default function PtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pt, setPt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPtDetail();
  }, [id]);

  const fetchPtDetail = async () => {
    try {
      setLoading(true);
      // Mặc dù gọi API, nhưng chúng ta thêm Mock Data fallback để bạn test UI ngay lập tức
      const response = await marketplaceService.getPtDetail(id).catch(() => null);
      
      if (response?.data?.data) {
        setPt(response.data.data);
      } else {
        // Fallback Mock Data để test UI
        setPt({
          id,
          fullName: 'Dr. Sarah Johnson',
          specialty: 'Clinical Nutritionist & Strength Coach',
          tier: 'TIER_1',
          verified: true,
          rating: 4.9,
          reviewCount: 128,
          yearsExperience: 8,
          bio: 'Với hơn 8 năm kinh nghiệm làm việc chuyên sâu về dinh dưỡng lâm sàng và huấn luyện thể hình, tôi cam kết mang lại lộ trình thay đổi vóc dáng khoa học, bền vững và an toàn nhất cho bạn. Phương pháp của tôi không ép buộc nhịn ăn cực đoan, mà hướng tới việc hiểu rõ cơ thể và thiết lập thói quen dài hạn.',
          certifications: 'NASM Certified Personal Trainer, Precision Nutrition Level 1, CPR/AED',
          avatarUrl: null,
          trainingPhilosophy: 'Khoa học - Bền vững - Không cực đoan. Tôi tin rằng mọi thực đơn đều phải phù hợp với lối sống và sở thích cá nhân của học viên.',
        });
      }
    } catch (err) {
      toast.error('Failed to load PT profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
        <Skeleton className="h-64 w-full rounded-3xl bg-slate-200" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6"><Skeleton className="h-96 w-full rounded-3xl bg-slate-200" /></div>
          <div className="lg:col-span-1"><Skeleton className="h-72 w-full rounded-3xl bg-slate-200" /></div>
        </div>
      </div>
    );
  }

  if (!pt) return <div className="text-center py-20 text-slate-500">PT Profile not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      
      {/* Navigation */}
      <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Marketplace
      </button>

      {/* Hero Cover & Basic Info */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
        <div className="h-40 md:h-56 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>
        <CardContent className="p-8 pt-0 relative sm:flex gap-8">
          {/* Avatar */}
          <div className="-mt-16 mb-4 sm:mb-0 relative inline-block shrink-0">
            <div className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-lg">
              {pt.avatarUrl ? (
                <img src={pt.avatarUrl} alt={pt.fullName} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-3xl">
                  {getInitials(pt.fullName)}
                </div>
              )}
            </div>
            {pt.verified && (
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 fill-emerald-50" />
              </div>
            )}
          </div>

          {/* Title Info */}
          <div className="flex-1 pt-4 sm:pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{pt.fullName}</h1>
                  {pt.tier === 'TIER_1' && (
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border border-blue-200 flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Certified
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-slate-500">{pt.specialty || 'Professional Fitness Coach'}</p>
              </div>
              
              <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 w-fit">
                <div className="text-center border-r border-slate-200 pr-4">
                  <div className="flex items-center text-amber-500 font-black text-xl"><Star className="w-5 h-5 fill-amber-400 mr-1" /> {pt.rating?.toFixed(1) || '5.0'}</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{pt.reviewCount || 0} Reviews</p>
                </div>
                <div className="text-center pl-1">
                  <div className="text-xl font-black text-slate-800">{pt.yearsExperience || 0}+</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Years Exp</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-8">
          
          <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" /> About Me
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  {pt.bio}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Training Philosophy
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                  {pt.trainingPhilosophy || 'Always push your limits safely and sustainably.'}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-500" /> Qualifications & Certifications
                </h3>
                <ul className="space-y-3">
                  {(pt.certifications ? pt.certifications.split(',') : ['Certified Nutritionist']).map((cert, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {cert.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="bg-slate-900 border-slate-800 text-white shadow-xl rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              <CardContent className="p-8 relative z-10">
                <h3 className="text-2xl font-black mb-2">Ready to transform?</h3>
                <p className="text-slate-400 font-medium text-sm mb-8">Connect with {pt.fullName.split(' ')[0]} and start your personalized nutrition and fitness journey today.</p>
                
                <div className="space-y-4">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 shadow-md font-bold text-base">
                    Request Consultation
                  </Button>
                  <Button variant="outline" className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl h-12 font-bold backdrop-blur-md transition-colors">
                    <MessageSquare className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-slate-400">
                  <div className="flex flex-col items-center gap-1">
                    <Clock className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Responds Fast</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Dumbbell className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Custom Plans</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
