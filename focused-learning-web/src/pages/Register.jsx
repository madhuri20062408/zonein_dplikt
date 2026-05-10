import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, XCircle, Phone, Globe, MapPin } from 'lucide-react';
import { fetchApi } from '../api';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';

const Register = ({ setUser }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    contact: '',
    state: '',
    country: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'Contains a number', test: (p) => /\d/.test(p) },
    { label: 'Contains special character', test: (p) => /[!@#$%^&*]/.test(p) },
    { label: 'Passwords match', test: (p) => p === formData.confirmPassword && p !== '' }
  ];

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Final validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // 1. Firebase Register
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await updateProfile(userCredential.user, { 
        displayName: formData.preferredName || `${formData.firstName} ${formData.lastName}` 
      });
      
      // 2. Send Verification Email
      await sendEmailVerification(userCredential.user);
      
      // Force refresh token and add a small delay to avoid clock skew/propagation issues
      await new Promise(resolve => setTimeout(resolve, 1000));
      const token = await userCredential.user.getIdToken(true);

      // 3. Sync with MongoDB
      await fetchApi('/auth/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      setIsVerifying(true);
    } catch (err) {
      console.error("Register Error:", err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    setLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        const token = await auth.currentUser.getIdToken();
        const userData = await fetchApi('/auth/sync', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        localStorage.setItem('token', token);
        localStorage.setItem('authUser', JSON.stringify(userData));
        setUser(userData);
        navigate('/');
      } else {
        setError('Email not verified yet. Please check your inbox.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 shadow-2xl">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black mb-4">Verify Email</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              We've sent a link to <span className="text-white font-bold">{formData.email}</span>. 
              Click it to activate your account.
            </p>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-medium mb-6 animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button 
                onClick={checkVerification}
                disabled={loading}
                className="w-full py-5 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group"
              >
                {loading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : "I've Verified"}
              </button>
              <button 
                onClick={async () => {
                  setError('');
                  await sendEmailVerification(auth.currentUser);
                  alert('Sent!');
                }}
                className="text-gray-500 hover:text-white font-bold transition-colors text-sm"
              >
                Resend link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden py-20">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div 
        className="absolute top-8 left-8 flex items-center gap-3 group cursor-pointer z-50"
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primaryLight rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white hidden md:block">ZoneIn</span>
      </div>

      <div className="w-full max-w-[500px] relative z-10">
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-8 md:p-12 shadow-2xl shadow-black/50">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Create Account</h1>
            <p className="text-gray-400 font-medium text-sm">Join the next generation of learners</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="First"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                  required
                />
              </div>
              <div className="relative group">
                <input 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address"
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="Contact"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                  required
                />
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  name="preferredName"
                  value={formData.preferredName}
                  onChange={handleInputChange}
                  placeholder="Nick Name"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="State"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                  required
                />
              </div>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="Country"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Creation */}
            <div className="space-y-3 pt-2">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create Password"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-12 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input 
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm Password"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-11 pr-12 text-white text-sm placeholder:text-gray-600 focus:border-primary/50 outline-none transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Indicators */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-2 py-2">
              {passwordRequirements.map((req, idx) => {
                const isMet = req.test(formData.password);
                return (
                  <div key={idx} className={`flex items-center gap-2 transition-all duration-300 ${isMet ? 'opacity-100 translate-x-0' : 'opacity-40 -translate-x-1'}`}>
                    {isMet ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-gray-600" />}
                    <span className={`text-[10px] font-bold ${isMet ? 'text-green-500' : 'text-gray-500'}`}>{req.label}</span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group mt-4 text-base"
            >
              {loading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                <>
                  Verify Email <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-400 font-medium text-sm">
              Already a member? <Link to="/login" className="text-primary hover:text-primaryLight font-black transition-colors ml-1">Log In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
