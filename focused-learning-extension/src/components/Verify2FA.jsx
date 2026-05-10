import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  RefreshCw,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';

const Verify2FA = ({ email, onVerifySuccess, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(timer - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-ext-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-ext-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = code.join('');
    if (otp.length < 6) {
      setError('Enter 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const API_BASE = "http://127.0.0.1:5000/api";
      const response = await fetch(`${API_BASE}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Verification failed');

      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ token: data.token, authUser: data });
      }

      onVerifySuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-white p-6 relative select-none overflow-hidden">
      <header className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full text-gray-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="flex-1 text-center pr-7 text-lg font-black tracking-tight">Security Check</h2>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        
        <div>
          <h3 className="text-xl font-black mb-1">Verify OTP</h3>
          <p className="text-gray-400 text-xs px-4">
            Code sent to <span className="text-white font-bold">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="w-full space-y-8">
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`otp-ext-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-10 h-12 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-black text-primary focus:border-primary outline-none transition-all"
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2 text-red-400 text-[10px]"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-xl transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <span>Verify OTP</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <button 
            type="button"
            disabled={timer > 0}
            onClick={() => setTimer(60)}
            className={`flex items-center justify-center gap-2 mx-auto text-[11px] font-bold transition-colors ${timer > 0 ? 'text-gray-600' : 'text-primary hover:text-primaryLight'}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Verify2FA;
