import React from 'react';
import { X, LogOut, ShieldAlert, Sparkles } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 overflow-hidden">
      {/* Premium Backdrop Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500 animate-in fade-in"
        onClick={onClose}
      ></div>

      {/* Funny Logout Card */}
      <div className="relative bg-surface/80 border border-white/5 w-full max-w-md rounded-[3rem] p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 text-center">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-32 h-32 bg-primary/20 rounded-full blur-[40px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-32 h-32 bg-red-500/10 rounded-full blur-[40px]"></div>

        <div className="relative mb-8">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner relative group">
            <LogOut className="w-10 h-10 text-red-400 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -top-1 -right-1 bg-background border-4 border-surface rounded-full p-1 shadow-lg">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">The Distractions are Winning! 😈</h2>
        <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium px-4">
          Are you sure you want to leave your focus fortress? The AI will miss you (and so will your productivity).
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full py-5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-[0.98] text-lg"
          >
            Yes, let them win 🏳️
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/5 active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
          >
            Wait, I'll stay! <Sparkles className="w-5 h-5 text-primaryLight" />
          </button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default LogoutModal;
