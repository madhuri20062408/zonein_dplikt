import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Lock, 
  ChevronLeft, 
  ArrowRight,
  Loader2,
  AlertCircle,
  BookOpen,
  ChevronDown,
  Search,
  CheckCircle2,
  FileText,
  Phone,
  MapPin,
  Globe
} from 'lucide-react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';

const GOALS = [
  "Web Development", "AI", "Machine Learning", "DSA", "Cybersecurity", 
  "Data Science", "ReactJS", "Java", "Python", "Full Stack", 
  "UI/UX", "Competitive Programming", "Cloud Computing", "Others"
];

const Register = ({ onBack, onRegisterSuccess, onVerificationRequired }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    state: '',
    country: 'India',
    bio: '',
    learningGoal: 'Web Development',
    password: '',
    confirmPassword: ''
  });
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const filteredGoals = GOALS.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Firebase Profile
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // 3. Send Email Verification
      try {
        await sendEmailVerification(user);
        console.log("Verification email sent successfully");
      } catch (emailErr) {
        console.error("Error sending verification email:", emailErr);
      }

      // 4. Get ID Token
      const token = await user.getIdToken();

      // 5. Sync with MongoDB
      const API_BASE = "http://127.0.0.1:5000/api";
      const response = await fetch(`${API_BASE}/auth/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const mongoUser = await response.json();
      if (!response.ok) throw new Error(mongoUser.message || 'Sync failed');

      // 6. Save to chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ token: token, authUser: mongoUser });
      }

      setSuccess(true);
      // Removed manual onRegisterSuccess call to let App.jsx handle verification gate
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col h-full bg-background text-white p-8 items-center justify-center text-center">
        <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-black mb-3">Check Your Email!</h2>
        <p className="text-gray-400 text-xs mb-4">A verification link has been sent to <strong>{formData.email}</strong>.</p>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 3 }} className="h-full bg-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-white selection:bg-primary/30 relative">
      <header className="flex items-center p-6 border-b border-white/5 bg-background/50 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1 text-center pr-8">
          <h2 className="text-lg font-black">Join ZoneIn</h2>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest tracking-tighter">Firebase Registration</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
        <form onSubmit={handleRegister} className="space-y-6 pb-12">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">First Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" className="input-field" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">Last Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" className="input-field" required />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="name@example.com" className="input-field" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="input-field" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">Confirm</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" className="input-field" required />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group px-1">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1" required />
            <span className="text-[10px] text-gray-400">I agree to the Firebase Privacy Policy and Terms.</span>
          </label>

          {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-xs">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><span>Sign Up</span><ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      </div>

      <footer className="p-6 text-center border-t border-white/5 bg-background">
        <p className="text-gray-500 text-xs">
          Already have an account? <button onClick={onBack} className="text-primary font-black">Login</button>
        </p>
      </footer>
    </div>
  );
};

export default Register;
