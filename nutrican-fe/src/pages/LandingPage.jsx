// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom';
import { Camera, Users, TrendingUp, ArrowRight, CheckCircle2, Zap, Shield, Heart } from 'lucide-react';

const features = [
  {
    icon: Camera,
    title: 'AI Meal Recognition',
    description: 'Snap a photo of your meal and our AI instantly analyzes nutritional content with 95% accuracy.',
  },
  {
    icon: Users,
    title: 'Expert Personal Trainers',
    description: 'Connect with certified PTs who provide personalized nutrition plans and real-time feedback.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Track macros, weight, and body metrics with beautiful charts and actionable insights.',
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
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2" />

        <div className="relative container mx-auto px-4 pt-12 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered Nutrition Platform
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Smart Nutrition.{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Better Results.
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Track your meals with AI recognition, connect with personal trainers, and achieve your fitness goals faster than ever.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              No credit card required. Start free today.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Powerful features designed to help you track nutrition, connect with trainers, and reach your goals.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why choose Nutrican PT?
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                We combine cutting-edge AI technology with expert human guidance to deliver the most effective nutrition tracking experience.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-center">
                <Heart className="w-16 h-16 text-white/80 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Join 10,000+ Users</h3>
                <p className="text-blue-100 mb-6">
                  Who have transformed their nutrition habits with Nutrican PT
                </p>
                <div className="flex justify-center gap-4 text-sm text-blue-100">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">98%</div>
                    <div>Satisfaction</div>
                  </div>
                  <div className="w-px bg-blue-400/30" />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">4.9</div>
                    <div>App Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center">
          <Shield className="w-12 h-12 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform your nutrition?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Start your journey today with AI-powered meal tracking and expert PT support.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all duration-200"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="font-bold text-gray-900">Nutrican PT</span>
            </div>
            <p className="text-sm text-gray-500">
              AI-Powered Nutrition Tracking Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
