import React from 'react';
import { ArrowRight, BookOpen, BarChart2, Shield, Zap, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = ({ user }) => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Guided Roadmaps",
      desc: "Stay on track with personalized learning paths designed for your goals.",
      icon: BookOpen,
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      title: "Deep Analytics",
      desc: "Visualize your study habits and optimize your focus with detailed charts.",
      icon: BarChart2,
      color: "text-purple-400",
      bg: "bg-purple-400/10"
    },
    {
      title: "Focus Shield",
      desc: "Our extension filters distractions automatically while you study.",
      icon: Shield,
      color: "text-green-400",
      bg: "bg-green-400/10"
    }
  ];

  const workflow = [
    { 
      step: "01", 
      title: "Set Your Goal", 
      desc: "Choose a topic and generate a personalized learning roadmap.", 
      icon: BookOpen 
    },
    { 
      step: "02", 
      title: "Enable Focus", 
      desc: "Turn on the extension to shield yourself from distractions.", 
      icon: Shield 
    },
    { 
      step: "03", 
      title: "Learn & Earn", 
      desc: "Watch videos while we track your study time and focus score.", 
      icon: Zap 
    },
    { 
      step: "04", 
      title: "Grow", 
      desc: "Review detailed analytics and maintain your study streak.", 
      icon: BarChart2 
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in overflow-hidden">
      {/* Hero Section */}
      <div className="text-center mb-24 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primaryLight text-xs font-bold mb-6 tracking-wider uppercase">
          <Zap className="w-3 h-3" />
          Welcome to the Future of Learning
        </div>
        <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight">
          Master Any Topic with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primaryLight">ZoneIn</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          The ultimate companion for focused study sessions. Track your progress, block distractions, and achieve your learning goals faster than ever.
        </p>
        
        <div className="mt-10 flex items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/analytics')}
            className="px-8 py-3 bg-primary hover:bg-primaryDark text-white font-bold rounded-xl transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-primary/40 flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Workflow Section */}
      <div className="mb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">How ZoneIn Works</h2>
          <div className="h-1.5 w-16 bg-primary mx-auto rounded-full shadow-lg shadow-primary/20"></div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative">
          {workflow.map((item, i) => (
            <React.Fragment key={i}>
              <div className="flex-1 flex flex-col items-center text-center group relative px-4">
                {/* Large Background Number */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-8xl font-black text-white/[0.03] select-none group-hover:text-primary/10 transition-colors duration-500">
                  {item.step}
                </div>
                
                {/* Icon Container */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-surface border border-card flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all duration-500 transform group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-primary/20">
                    <item.icon className="w-9 h-9 text-primaryLight group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  {/* Step Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-primary text-white text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-125 transition-transform duration-500">
                    {item.step}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primaryLight transition-colors">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-[200px] group-hover:text-gray-300 transition-colors">
                  {item.desc}
                </p>
              </div>

              {/* Arrow Connector */}
              {i < workflow.length - 1 && (
                <div className="hidden md:flex items-center justify-center text-gray-700 mx-2">
                  <ChevronRight className="w-8 h-8 animate-pulse-slow" style={{ animationDelay: `${i * 0.2}s` }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
        {features.map((f, i) => (
          <div 
            key={i} 
            className="bg-surface border border-card rounded-2xl p-8 hover:border-primary/50 transition-all group relative overflow-hidden transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
              <f.icon className={`w-7 h-7 ${f.color}`} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">{f.title}</h3>
            <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{f.desc}</p>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-primary/30 to-primaryLight/10 rounded-[2rem] p-16 border border-primary/20 text-center relative overflow-hidden group">
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to level up your focus?</h2>
          <p className="text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">Join thousands of learners who are optimizing their study time with our AI-powered analytics.</p>
          <button 
            onClick={() => navigate('/study-sessions')}
            className="px-12 py-4 bg-white text-background font-black rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-black/20"
          >
            View Your Sessions
          </button>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity">
          <div className="absolute top-10 left-10 w-48 h-48 bg-primary rounded-full blur-[80px] animate-pulse-slow"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-primaryLight rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Home;
