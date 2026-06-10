// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom';
import { Camera, Users, TrendingUp, ArrowRight, CheckCircle2, Zap, Shield, Heart, Sparkles, Activity, Target } from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
  {
    icon: Camera,
    title: 'AI Meal Recognition',
    description: 'Snap a photo of your meal and our AI instantly analyzes nutritional content with 95% accuracy.',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    icon: Users,
    title: 'Expert Personal Trainers',
    description: 'Connect with certified PTs who provide personalized nutrition plans and real-time feedback.',
    color: 'from-emerald-400 to-emerald-600'
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Track macros, weight, and body metrics with beautiful charts and actionable insights.',
    color: 'from-amber-400 to-orange-500'
  },
];

const benefits = [
  'Real-time AI calorie counting',
  'Customized meal recommendations',
  'PT-client messaging system',
  'Weekly progress reports',
  'SOS nutrition support',
  'Body composition tracking',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Nutrican<span className="text-blue-600">.</span></span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">Log in</Link>
              <Link to="/register">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all hover:shadow-md h-10 px-5">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-blue-100/50 to-transparent rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-8 border border-blue-100 shadow-sm animate-fade-in">
            <Zap className="w-4 h-4 fill-blue-600" /> Introducing Nutrican AI 2.0
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1] animate-slide-in">
            Nutrition Tracking, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Perfected by AI.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed font-medium animate-slide-in" style={{ animationDelay: '100ms' }}>
            Stop guessing your macros. Snap a photo of your meal, connect with elite personal trainers, and achieve your fitness goals faster than ever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-in" style={{ animationDelay: '200ms' }}>
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 px-8 text-base shadow-lg shadow-blue-600/20 font-bold transition-all hover:-translate-y-0.5">
                Start Tracking for Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-14 px-8 text-base font-bold transition-all">
                I already have an account
              </Button>
            </Link>
          </div>
          
          <p className="mt-6 text-sm font-semibold text-slate-400 animate-slide-in" style={{ animationDelay: '300ms' }}>
            No credit card required • Free 14-day trial for premium PT features
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white border-y border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Everything you need to succeed</h2>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Powerful features designed to help you track nutrition effortlessly, connect with expert trainers, and reach your goals.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="group bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:bg-white hover:shadow-xl hover:border-slate-200 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits & Social Proof */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">Why choose Nutrican?</h2>
              <p className="text-slate-400 text-lg mb-10 font-medium leading-relaxed">
                We combine cutting-edge AI technology with expert human guidance to deliver the most effective nutrition tracking experience ever built.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300 font-medium text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl transform rotate-3 scale-[1.02] opacity-50 blur-sm" />
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 text-center relative shadow-2xl backdrop-blur-xl">
                <Heart className="w-16 h-16 text-rose-400 mx-auto mb-6 fill-rose-400/20" />
                <h3 className="text-2xl font-black text-white mb-3">Join 10,000+ Users</h3>
                <p className="text-slate-400 font-medium mb-10">
                  Who have transformed their nutrition habits and bodies with Nutrican platform.
                </p>
                <div className="flex justify-center gap-12 text-sm">
                  <div className="text-center">
                    <div className="text-4xl font-black text-white mb-1">98%</div>
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Satisfaction</div>
                  </div>
                  <div className="w-px bg-slate-700" />
                  <div className="text-center">
                    <div className="text-4xl font-black text-white mb-1">4.9</div>
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">App Rating</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-slate-50 rounded-3xl p-10 md:p-16 text-center border border-slate-100 flex flex-col items-center">
            <Shield className="w-12 h-12 text-blue-500 mb-6" />
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Ready to transform your nutrition?</h2>
            <p className="text-slate-500 text-lg mb-8 max-w-xl font-medium">
              Start your journey today with AI-powered meal tracking and expert Personal Trainer support.
            </p>
            <Link to="/register">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-14 px-8 text-base shadow-md font-bold">
                Create Free Account
              </Button>
            </Link>
          </div>
          
          <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="font-extrabold text-slate-900 tracking-tight">Nutrican Platform</span>
            </div>
            <p className="text-sm font-semibold text-slate-400">© 2026 Nutrican PT. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}