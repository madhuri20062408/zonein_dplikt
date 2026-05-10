import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, BookOpen, BarChart2, Shield, Zap, 
  Clock, ChevronRight, CheckCircle, Star, Users 
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "AI-Powered Roadmaps",
      desc: "Generate personalized learning paths for any topic using advanced AI models.",
      icon: BookOpen,
      color: "from-blue-400 to-indigo-500"
    },
    {
      title: "Distraction Shield",
      desc: "Our browser extension keeps you focused by blocking addictive content while you learn.",
      icon: Shield,
      color: "from-green-400 to-emerald-500"
    },
    {
      title: "Progress Analytics",
      desc: "Track your watch time, focus score, and study streaks with beautiful charts.",
      icon: BarChart2,
      color: "from-purple-400 to-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-primary/30">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 py-4 px-8 md:px-16 flex justify-between items-center">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primaryLight rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">ZoneIn</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-24 px-8 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-primaryLight text-xs font-black mb-8 tracking-widest uppercase animate-fade-in">
          <Star className="w-3 h-3 fill-primaryLight" />
          The Ultimate Learning Assistant
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[1.1] animate-scale-in">
          Learn Faster. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primaryLight to-purple-400">Stay Focused.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          ZoneIn combines AI-generated roadmaps with a powerful browser extension to shield you from distractions and track your progress in real-time.
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button 
            onClick={() => navigate('/register')}
            className="w-full md:w-auto px-12 py-5 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all transform hover:scale-105 hover:shadow-[0_0_40px_rgba(124,58,237,0.4)] flex items-center justify-center gap-3 text-lg"
          >
            Create Your Account <ArrowRight className="w-6 h-6" />
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="w-full md:w-auto px-12 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/10 transition-all text-lg"
          >
            Login to Dashboard
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-32 border-t border-white/5 pt-12 text-left opacity-60">
          <div>
            <p className="text-3xl font-black text-white">10k+</p>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Active Learners</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">500k+</p>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Minutes Focused</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">50k+</p>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Roadmaps Created</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">99%</p>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Focus Score</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-32 px-8 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Everything you need to <span className="text-primaryLight">excel</span></h2>
            <p className="text-gray-400 max-w-xl mx-auto">Stop wasting time on distractions and start mastering your craft with our specialized toolset.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <div key={i} className="group relative p-10 rounded-[32px] bg-black border border-white/5 hover:border-primary/50 transition-all duration-500">
                <div className={`w-16 h-16 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-primaryLight transition-colors">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{f.desc}</p>
                <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary cursor-pointer hover:gap-4 transition-all">
                  Learn More <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extension Promo */}
      <section className="relative z-10 py-32 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-primary/20 to-purple-900/10 border border-primary/20 rounded-[48px] p-12 md:p-24 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 text-left">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-8">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">The extension that <br /> watches your back.</h2>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed">
              Our Chrome extension automatically detects when you're studying and filters out distractions, ensuring every minute counts.
            </p>
            <div className="flex flex-col gap-4">
              {[
                "Automatic Distraction Filtering",
                "Real-time Focus Scoring",
                "Study Session Synchronization",
                "One-click Roadmap Access"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primaryLight" />
                  <span className="font-bold text-gray-200">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                     <Zap className="w-6 h-6 text-primary" />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">Focus Streak</p>
                     <p className="text-xl font-black text-white">12 Days</p>
                   </div>
                </div>
                <Users className="w-6 h-6 text-gray-600" />
             </div>
             <div className="h-2 w-full bg-white/5 rounded-full mb-8">
                <div className="h-full w-3/4 bg-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
             </div>
             <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center">
                <p className="text-primaryLight font-black text-sm uppercase tracking-widest">Focus Mode Active</p>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-white/5 text-center">
        <p className="text-gray-600 text-sm font-medium">© 2026 ZoneIn. Master your learning with AI.</p>
      </footer>
    </div>
  );
};

export default Landing;
