import React from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  Brain, 
  Book, 
  PlayCircle, 
  History, 
  Activity,
  Sparkles
} from 'lucide-react';

const Welcome = ({ onLogin, onSignup }) => {
  return (
    <div className="flex flex-col h-full bg-[#050816]/95 text-white p-5 items-center justify-between relative overflow-hidden text-center select-none backdrop-blur-2xl">
      
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.2)_0%,transparent_70%)] pointer-events-none -z-10 blur-3xl" />

      {/* Locked Status Indicator */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md mt-2"
      >
        <Lock className="w-3 h-3 text-primary" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Access Restricted</span>
      </motion.div>

      {/* Header Area */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center mt-4"
      >
        <div className="w-12 h-12 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.3)] mb-3 relative">
          <Brain className="w-7 h-7 text-primary fill-primary/10" />
        </div>
        <h1 className="text-xl font-black tracking-tight leading-none mb-1">ZoneIn</h1>
        <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-gray-500">AI Learning Assistant</p>
      </motion.div>

      {/* Center Illustration Area (Smaller to fit) */}
      <div className="relative w-full flex items-center justify-center py-4 opacity-30 grayscale blur-[0.5px]">
        <div className="absolute w-48 h-48 border border-white/5 rounded-full" />
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-white/5 shadow-2xl">
          <Brain className="w-10 h-10 text-gray-600 fill-gray-600/10" />
        </div>
      </div>

      {/* Text Content */}
      <div className="space-y-3 px-4 pb-4">
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-xl font-black tracking-tight leading-tight mb-2">
            ZoneIn is Locked.<br />
            <span className="text-primary">Sign in to focus.</span>
          </h2>
          <p className="text-gray-400 text-[11px] max-w-[220px] mx-auto leading-relaxed font-medium">
            Please log in to your account to access your learning dashboard.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col gap-3 pt-2">
          <button onClick={onLogin} className="w-full py-3.5 bg-primary hover:bg-primaryDark text-white font-black rounded-xl text-sm transition-all shadow-[0_15px_30px_rgba(124,58,237,0.2)]">
            Login
          </button>
          <button onClick={onSignup} className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-black rounded-xl text-sm transition-all">
            Sign Up
          </button>
        </motion.div>

        <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.4em] pt-2">
          Continue your journey
        </p>
      </div>
    </div>
  );
};

export default Welcome;
