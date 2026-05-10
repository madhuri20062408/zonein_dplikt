import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { fetchApi } from '../api';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Premium entry animation
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => setIsVisible(true), []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        await auth.signOut();
        setError('Please verify your email address before logging in. Check your inbox for the link.');
        setLoading(false);
        return;
      }

      const token = await firebaseUser.getIdToken();

      // 2. Sync with MongoDB
      const data = await fetchApi('/auth/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (data) {
        localStorage.setItem('token', token);
        localStorage.setItem('authUser', JSON.stringify(data));
        setUser(data);
        navigate('/');
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Top Left Logo */}
      <div 
        className="absolute top-8 left-8 flex items-center gap-3 group cursor-pointer z-50"
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primaryLight rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white hidden md:block">ZoneIn</span>
      </div>

      <div className="w-full max-w-md relative z-10 transition-all duration-1000 transform">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 md:p-12 shadow-2xl shadow-black/50">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">Welcome Back</h1>
            <p className="text-gray-400 font-medium">Continue your focused learning flow</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors">
                  <Mail className="w-full h-full" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4.5 pl-14 pr-6 text-white placeholder:text-gray-600 focus:border-primary/50 focus:bg-white/[0.08] outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors">
                  <Lock className="w-full h-full" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4.5 pl-14 pr-6 text-white placeholder:text-gray-600 focus:border-primary/50 focus:bg-white/[0.08] outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-medium text-center animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all transform active:scale-[0.98] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-lg"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                <>
                  Access Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-gray-400 font-medium">
              New to ZoneIn? <Link to="/register" className="text-primary hover:text-primaryLight font-black transition-colors ml-1">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
