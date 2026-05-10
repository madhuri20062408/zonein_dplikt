import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, RotateCw, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const VerifyEmail = ({ email, onVerified }) => {
  const handleCheckVerification = async () => {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      onVerified();
    } else {
      alert("Email not verified yet. Please check your inbox!");
    }
  };

  const handleBackToLogin = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex flex-col h-full bg-background text-white p-8 items-center justify-center text-center select-none">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 border border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.2)]"
      >
        <Mail className="w-10 h-10 text-primary" />
      </motion.div>

      <h2 className="text-2xl font-black mb-2">Verify Your Email</h2>
      <p className="text-gray-400 text-xs mb-8 leading-relaxed px-4">
        We've sent a verification link to <br/>
        <strong className="text-primary">{email}</strong>. <br/>
        Please click it to activate your account.
      </p>

      <div className="w-full space-y-3">
        <button 
          onClick={handleCheckVerification}
          className="w-full py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <span>I've Verified</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button 
          onClick={handleCheckVerification}
          className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/5 text-[10px] uppercase tracking-widest"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>

        <button 
          onClick={handleBackToLogin}
          className="w-full py-2 text-gray-600 hover:text-gray-400 text-[10px] font-bold flex items-center justify-center gap-2"
        >
          <LogOut className="w-3 h-3" />
          <span>Back to Login</span>
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
