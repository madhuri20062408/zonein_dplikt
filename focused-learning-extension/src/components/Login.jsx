import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ArrowRight,
  Loader2,
  AlertCircle,
  Brain,
  Chrome
} from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ onLoginSuccess, onShowRegister, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Get ID Token
      const token = await user.getIdToken();
      
      // 3. Sync with MongoDB
      const response = await fetch("http://127.0.0.1:5000/api/auth/sync", {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const mongoUser = await response.json();
      if (!response.ok) throw new Error(mongoUser.message || 'Sync failed');

      // 4. Save to chrome storage (including customToken for SSO)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ 
          token: token, 
          authUser: mongoUser,
          customToken: mongoUser.customToken 
        });
      }
      
      // Removed manual onLoginSuccess call to let App.jsx handle verification gate
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-white p-5 relative select-none overflow-hidden">
      <header className="flex items-center mb-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full text-gray-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex justify-center pr-7">
          <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <Brain className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      <div className="text-center mb-5">
        <h2 className="text-xl font-black tracking-tight mb-1">Welcome Back!</h2>
        <p className="text-gray-400 text-[11px]">Firebase Authentication Enabled</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-3.5 flex-1 flex flex-col justify-center">
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-10 text-xs text-white outline-none focus:border-primary/50 transition-all"
            required
          />
        </div>

        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
          <input 
            type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-10 text-xs text-white outline-none focus:border-primary/50 transition-all"
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl flex items-center gap-2 text-red-400 text-[9px]"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          type="submit" disabled={loading}
          className="w-full py-3.5 bg-primary hover:bg-primaryDark text-white font-black rounded-xl text-sm transition-all shadow-[0_15px_30px_rgba(124,58,237,0.2)] flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <footer className="mt-auto py-2 text-center border-t border-white/5">
        <p className="text-gray-500 text-[11px] font-medium pt-2">
          Don't have an account?{' '}
          <button onClick={onShowRegister} className="text-primary font-black">Sign Up</button>
        </p>
      </footer>
    </div>
  );
};

export default Login;
