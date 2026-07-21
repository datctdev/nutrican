// src/pages/LandingPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, Users, TrendingUp, ArrowRight, CheckCircle2, 
  Zap, Shield, Heart, Sparkles, Star, ChevronRight, MessageSquare 
} from 'lucide-react';
import { Button } from '../components/ui/button';

// Import generated mockup assets
import heroMockup from '../assets/nutrican_hero_mockup.png';
import healthySalad from '../assets/ai_scanner_illustration.png';

const features = [
  {
    icon: Camera,
    title: 'Nhận diện món ăn bằng AI',
    description: 'Chụp ảnh món ăn của bạn và AI của chúng tôi sẽ phân tích hàm lượng dinh dưỡng ngay lập tức với độ chính xác 95%.',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    icon: Users,
    title: 'Huấn luyện viên cá nhân chuyên nghiệp',
    description: 'Kết nối với các PT chuyên nghiệp, những người cung cấp kế hoạch dinh dưỡng cá nhân hóa và phản hồi thời gian thực.',
    color: 'from-emerald-400 to-emerald-600'
  },
  {
    icon: TrendingUp,
    title: 'Phân tích tiến trình',
    description: 'Theo dõi macros, cân nặng và các chỉ số cơ thể bằng các biểu đồ trực quan và thông tin chi tiết hữu ích.',
    color: 'from-amber-400 to-orange-500'
  },
];

const benefits = [
  'Tính calo bằng AI thời gian thực',
  'Gợi ý bữa ăn được cá nhân hóa',
  'Hệ thống nhắn tin PT - Khách hàng',
  'Báo cáo tiến trình hàng tuần',
  'Theo dõi thành phần cơ thể',
];

export default function LandingPage() {
  // Scanner interactive demo states
  const [scanState, setScanState] = useState('idle'); // 'idle', 'scanning', 'completed'
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (scanState === 'scanning') {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanState('completed');
            return 100;
          }
          return prev + 5;
        });
      }, 80);
    }
    return () => clearInterval(interval);
  }, [scanState]);

  const handleStartScan = () => {
    setScanState('scanning');
    setScanProgress(0);
  };

  return (
    <div className="space-y-24 selection:bg-blue-100 selection:text-blue-900 pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden">
        {/* Background glow ambient effects */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-200/20 rounded-full blur-[100px] -z-10" />

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/60 text-blue-700 text-xs font-bold shadow-sm animate-fade-in">
              <Zap className="w-3.5 h-3.5 fill-blue-600 animate-pulse text-blue-600" />
              Giới thiệu Nutrican AI 2.0
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] animate-slide-in">
              Theo dõi dinh dưỡng, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500">
                Hoàn hảo hóa bởi AI.
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-500 max-w-xl leading-relaxed font-medium">
              Không còn phải tính calo thủ công. Chụp ảnh đĩa thức ăn của bạn, tính toán macros ngay lập tức và làm việc với các huấn luyện viên cá nhân chuyên nghiệp để đạt mục tiêu.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 px-8 text-base shadow-lg shadow-blue-500/25 font-bold transition-all duration-300 hover:scale-[1.02]">
                <Link to="/register">
                  Bắt đầu theo dõi miễn phí <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl h-14 px-8 text-base font-bold shadow-sm transition-all duration-300">
                <Link to="/login">
                  Tôi đã có tài khoản
                </Link>
              </Button>
            </div>

            {/* Social Trust Metrics */}
            <div className="flex items-center gap-5 pt-4 border-t border-slate-100 max-w-md">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-600 shadow-sm">
                    {i === 4 ? '+9k' : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} alt="user avatar" />}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">Được tin tưởng bởi hơn 10.000+ người tập luyện</p>
              </div>
            </div>
          </div>

          {/* Hero Right Visual Column */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            {/* Soft decorative background circles */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: '4s' }} />
            
            {/* Phone Frame Wrap */}
            <div className="relative group p-4 bg-slate-900/5 rounded-[40px] border border-slate-900/5 shadow-2xl hover:scale-[1.01] transition-transform duration-500">
              <img 
                src={heroMockup} 
                alt="Nutrican AI Phone Mockup" 
                className="w-full max-w-[340px] rounded-[32px] shadow-lg border-4 border-slate-900/90 object-cover"
              />

              {/* Floating Macro badge card */}
              <div className="absolute -top-4 -right-6 glass-panel rounded-2xl p-4 shadow-xl border border-slate-200/40 flex items-center gap-3 animate-bounce" style={{ animationDuration: '6s' }}>
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </span>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mục tiêu Protein</div>
                  <div className="text-sm font-black text-slate-800">Đạt được 92g / 120g</div>
                </div>
              </div>

              {/* Floating Scan Tag */}
              <div className="absolute bottom-12 -left-8 glass-panel rounded-2xl p-3.5 shadow-xl border border-slate-200/40 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                  <Camera className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-700">Quét khớp: độ tin cậy 98%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive AI Scanner Demo Section */}
      <section className="bg-white border border-slate-100 rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100/30 to-blue-100/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 mb-2 block">Thử nghiệm thực tế</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Trải nghiệm máy quét thức ăn AI</h2>
          <p className="text-slate-500 font-semibold max-w-xl mx-auto leading-relaxed">
            Nhấn quét trên đĩa thức ăn lành mạnh dưới đây để kích hoạt công cụ nhận diện và kiểm tra bảng phân tích dinh dưỡng đa lượng.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-10 items-center">
          {/* Scanner Visual Frame */}
          <div className="md:col-span-6 flex flex-col items-center space-y-6">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-lg group w-full max-w-[340px] aspect-square bg-slate-50">
              <img 
                src={healthySalad} 
                alt="Demo salad scan" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Scan laser line */}
              {scanState === 'scanning' && (
                <div 
                  className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] z-20"
                  style={{ 
                    top: `${scanProgress}%`, 
                    transition: 'top 80ms linear' 
                  }}
                />
              )}

              {/* Holographic overlay */}
              {scanState === 'scanning' && (
                <div className="absolute inset-0 bg-emerald-500/5 backdrop-brightness-110 z-10 transition-all duration-300 pointer-events-none" />
              )}

              {/* Status Tag on image */}
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-white/10 z-20">
                <span className={`w-2 h-2 rounded-full ${
                  scanState === 'scanning' ? 'bg-amber-400 animate-ping' : 
                  scanState === 'completed' ? 'bg-emerald-400' : 'bg-blue-400'
                }`} />
                {scanState === 'scanning' ? 'AI đang quét...' : 
                 scanState === 'completed' ? 'Quét thành công' : 'Sẵn sàng quét'}
              </div>
            </div>

            <Button 
              onClick={handleStartScan} 
              disabled={scanState === 'scanning'}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-5 shadow-lg shadow-blue-500/20 font-bold flex items-center gap-2 group w-full max-w-[340px]"
            >
              <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              {scanState === 'scanning' ? `Đang phân tích (${scanProgress}%)` : 'Quét mẫu món ăn'}
            </Button>
          </div>

          {/* Scanner Output results */}
          <div className="md:col-span-6 space-y-6">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[300px] flex flex-col justify-between shadow-inner">
              
              {scanState === 'idle' && (
                <div className="flex flex-col items-center justify-center text-center my-auto space-y-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100/50 flex items-center justify-center text-blue-600 shadow-sm">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Kết quả phân tích món ăn</h4>
                  <p className="text-sm font-semibold text-slate-400 max-w-xs">
                    Nhấn nút "Quét mẫu món ăn" ở bên trái để kích hoạt nhật ký dự đoán hình ảnh ngay lập tức.
                  </p>
                </div>
              )}

              {scanState === 'scanning' && (
                <div className="space-y-5 my-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600 animate-pulse">Đang chạy mô hình thị giác...</span>
                    <span className="text-xs font-extrabold text-blue-600">{scanProgress}%</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-100"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className={`text-xs font-semibold text-slate-400 transition-opacity ${scanProgress > 15 ? 'opacity-100' : 'opacity-0'}`}>
                      [LOG] Đang phân tích các thành phần hình ảnh...
                    </div>
                    <div className={`text-xs font-semibold text-slate-400 transition-opacity ${scanProgress > 45 ? 'opacity-100' : 'opacity-0'}`}>
                      [LOG] Tìm thấy ức gà, cà chua bi, trứng, bơ.
                    </div>
                    <div className={`text-xs font-semibold text-slate-400 transition-opacity ${scanProgress > 75 ? 'opacity-100' : 'opacity-0'}`}>
                      [LOG] Tính toán thể tích & đối chiếu dữ liệu macros...
                    </div>
                  </div>
                </div>
              )}

              {scanState === 'completed' && (
                <div className="space-y-6">
                  {/* Food title */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                    <div>
                      <h4 className="text-xl font-black text-slate-900">Salad gà hảo hạng</h4>
                      <p className="text-xs text-emerald-600 font-bold">✓ Phân tích thành công (độ chính xác 96%)</p>
                    </div>
                    <span className="text-2xl font-black text-blue-600">450 <span className="text-xs font-bold text-slate-400">kcal</span></span>
                  </div>

                  {/* Macros lists progress */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600">Protein (Chất lượng cao)</span>
                        <span className="text-slate-800">38g</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '80%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600">Carbohydrates (Tinh bột)</span>
                        <span className="text-slate-800">12g</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '25%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600">Chất béo lành mạnh</span>
                        <span className="text-slate-800">22g</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '60%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Coach advice tip */}
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3">
                    <span className="text-base text-emerald-600">💡</span>
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                      <strong>Lời khuyên từ PT:</strong> Bữa trưa cân bằng rất tốt! Lượng protein cao phù hợp với mục tiêu sức mạnh của bạn. Đối với bữa tối, hãy cố gắng giữ lượng chất béo dưới 15g.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {scanState === 'completed' && (
              <Button 
                variant="ghost" 
                onClick={() => setScanState('idle')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-1 mx-auto"
              >
                Đặt lại máy quét thử nghiệm
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* How it Works Step-by-Step */}
      <section className="text-center space-y-16">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">Quy trình hoạt động</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Nutrican hoạt động thế nào</h2>
          <p className="text-slate-500 font-semibold max-w-xl mx-auto leading-relaxed">
            Đạt được mục tiêu sức khỏe không đòi hỏi phải nhịn ăn kham khổ. Chỉ cần những thói quen nhỏ hàng ngày được hướng dẫn bởi công nghệ thông minh.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Chụp ảnh và tải lên',
              desc: 'Hướng camera và chụp bất kỳ món ăn nào. Mô hình thị giác của chúng tôi sẽ nhận diện các thành phần ngay lập tức.',
              icon: Camera,
              color: 'text-blue-600 bg-blue-100/50'
            },
            {
              step: '02',
              title: 'Nhận chỉ số Macros tức thì',
              desc: 'Xem bảng phân tích toàn diện về calo, protein, chất xơ, carbs và chất béo được đối chiếu với mục tiêu của bạn.',
              icon: Zap,
              color: 'text-amber-600 bg-amber-100/50'
            },
            {
              step: '03',
              title: 'Tối ưu hóa từ huấn luyện viên',
              desc: 'Huấn luyện viên cá nhân của bạn sẽ kiểm tra nhật ký hàng tuần để điều chỉnh mục tiêu và gửi thực đơn.',
              icon: Users,
              color: 'text-emerald-600 bg-emerald-100/50'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-md relative hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col items-center">
                <span className="absolute top-4 right-6 text-5xl font-black text-slate-100/80 pointer-events-none select-none">
                  {item.step}
                </span>
                <span className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-6`}>
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed text-center">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-8 text-center space-y-16">
        <header className="max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">Tính năng nổi bật</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Tất cả những gì bạn cần để thành công</h2>
          <p className="text-slate-500 font-semibold max-w-xl mx-auto leading-relaxed">
            Từ tính năng quét ảnh hiện đại đến trò chuyện trực tiếp an toàn, chúng tôi đã tổng hợp bộ công cụ tối ưu cho việc tập luyện chuyên nghiệp.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <article key={i} className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-md hover:shadow-2xl hover:border-slate-200 hover:-translate-y-1.5 transition-all duration-300 text-left">
                <span className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* PT-Client Chat Interface Showcase */}
      <section className="bg-slate-950 border border-slate-850 rounded-[40px] p-8 md:p-14 relative overflow-hidden">
        {/* Glow gradients */}
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Text Left */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-900 text-emerald-400 text-xs font-bold">
              <MessageSquare className="w-3.5 h-3.5" /> Hỗ trợ trực tiếp từ PT
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.2]">
              Huấn luyện viên thực tế. <br />
              Không dùng Chatbot tự động.
            </h2>
            <p className="text-slate-400 text-sm md:text-base font-semibold leading-relaxed">
              Chúng tôi kết nối bạn với những chuyên gia thể hình thực thụ có chứng chỉ. Huấn luyện viên cá nhân của bạn sẽ xem nhật ký tiến trình trên bảng điều khiển và đánh giá hình ảnh món ăn để đảm bảo bạn đi đúng hướng.
            </p>
            <ul className="space-y-3.5">
              {[
                'Nhắn tin trực tiếp bảo mật và tức thời',
                'Kiểm tra nhật ký & điều chỉnh mục tiêu hàng tuần',
                'Gợi ý công thức nấu ăn qua video phù hợp với calo'
              ].map((text, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                  <span className="text-slate-300 font-semibold text-xs md:text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Chat bubble visual layout right */}
          <div className="lg:col-span-6 flex flex-col space-y-4 max-w-md mx-auto w-full">
            
            {/* PT Bubble */}
            <div className="flex gap-3.5">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white border border-indigo-500 shadow-md">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=coach" alt="Coach Avatar" className="rounded-full" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 max-w-[80%] text-left space-y-1">
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">HLV Sarah</div>
                <p className="text-xs font-medium text-slate-200 leading-relaxed">
                  Chào John! Tôi đã xem kết quả quét salad bữa trưa của bạn. Trông tuyệt đấy! Hãy tăng thêm 20g protein cho bữa phụ nhé. Bạn có dùng được sữa chua Hy Lạp không?
                </p>
                <div className="text-[9px] text-slate-500 text-right font-bold mt-1">11:32 AM</div>
              </div>
            </div>

            {/* Client Bubble */}
            <div className="flex gap-3.5 flex-row-reverse">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-white border border-slate-700 shadow-md">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=user2" alt="User Avatar" className="rounded-full" />
              </div>
              <div className="bg-blue-600 rounded-2xl rounded-tr-none p-4 max-w-[80%] text-left space-y-1">
                <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Bạn</div>
                <p className="text-xs font-medium text-white leading-relaxed">
                  Đã rõ, HLV! Tôi vừa mua một hộp sữa chua Hy Lạp không béo. Tôi sẽ quét nó ngay khi ăn.
                </p>
                <div className="text-[9px] text-blue-300 text-right font-bold mt-1">11:35 AM</div>
              </div>
            </div>

            {/* System Log Bubble */}
            <div className="text-center font-bold text-[10px] text-slate-500 uppercase tracking-widest pt-2">
              • Đã quét thành công hộp sữa chua •
            </div>

          </div>

        </div>
      </section>

      {/* Benefits & Social Proof */}
      <section className="py-20 bg-slate-900 relative overflow-hidden rounded-[32px] px-6 md:px-12 text-left">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
        
        <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Left Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Tại sao chọn Nutrican?</h2>
            <p className="text-slate-400 text-base font-semibold leading-relaxed">
              Chúng tôi kết hợp các thuật toán thị giác máy tính mạnh mẽ với các chuyên gia dinh dưỡng thực tế để mang lại giải pháp ăn kiêng toàn diện nhất từng có.
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="inline-flex w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </span>
                  <span className="text-slate-300 font-semibold text-xs md:text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Interactive Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl transform rotate-3 scale-[1.02] opacity-50 blur-sm" />
            <article className="bg-slate-800 border border-slate-700 rounded-3xl p-10 text-center relative shadow-2xl backdrop-blur-xl">
              <Heart className="w-16 h-16 text-rose-400 mx-auto mb-6 fill-rose-400/20 animate-pulse" />
              <h3 className="text-2xl font-black text-white mb-3">Tham gia cùng 10.000+ người dùng</h3>
              <p className="text-slate-400 font-semibold text-sm mb-10">
                Những người đã thay đổi thói quen dinh dưỡng và thể hình của họ cùng với nền tảng Nutrican.
              </p>
              <div className="flex justify-center gap-12 text-sm">
                <div className="text-center">
                  <span className="block text-4xl font-black text-white mb-1">98%</span>
                  <span className="block text-slate-400 font-bold uppercase tracking-widest text-[10px]">Mức độ hài lòng</span>
                </div>
                <div className="w-px bg-slate-700" />
                <div className="text-center">
                  <span className="block text-4xl font-black text-white mb-1">4.9</span>
                  <span className="block text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đánh giá ứng dụng</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="bg-white border border-slate-100 rounded-3xl p-8 md:p-14 shadow-lg text-center space-y-12">
        <section className="bg-slate-50 border border-slate-100 rounded-2xl p-8 md:p-16 flex flex-col items-center max-w-5xl mx-auto space-y-6">
          <Shield className="w-12 h-12 text-blue-500 animate-pulse" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sẵn sàng thay đổi sức khỏe của bạn?</h2>
          <p className="text-slate-500 text-base font-semibold max-w-xl">
            Bắt đầu hành trình của bạn ngay hôm nay với tính năng theo dõi bữa ăn được hỗ trợ bởi AI và sự hỗ trợ từ huấn luyện viên cá nhân chuyên nghiệp.
          </p>
          <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-14 px-8 text-base shadow-md font-bold transition-all duration-300 hover:scale-[1.02]">
            <Link to="/register">
              Tạo tài khoản miễn phí
            </Link>
          </Button>
        </section>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="font-extrabold text-slate-900 tracking-tight">Nền tảng Nutrican</span>
          </div>
          <p className="text-xs font-semibold text-slate-400">© 2026 Nutrican PT. Bảo lưu mọi quyền.</p>
        </div>
      </footer>
    </div>
  );
}