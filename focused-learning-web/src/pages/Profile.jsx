import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Mail, Phone, MapPin, Calendar, Edit2, CheckCircle, 
  ChevronRight, Trash2, Video, Shield, Settings, 
  Award, FileText, Activity, Zap, Search, Bell, Play, Lock, Info, X, Globe, CheckCircle2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip 
} from 'recharts';
import { io } from 'socket.io-client';
import { fetchApi } from '../api';
import { auth } from '../firebase';
import { sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

const Profile = ({ user: initialUser, setUser: setGlobalUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  
  // Password Reset States
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: OTP, 2: New Password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // Account Deletion States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  
  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    contact: '',
    state: '',
    country: '',
    bio: '',
    learningGoals: []
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const [stats, setStats] = useState({
    completedTopics: 0,
    inProgressTopics: 0,
    notStartedTopics: 0,
    overallPercentage: 0
  });
  const [activities, setActivities] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [streak, setStreak] = useState(0);
  const [dailyActivity, setDailyActivity] = useState([]);

  const handleSendOTP = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setPasswordError(null);
    try {
      const res = await fetchApi('/auth/send-password-otp', {
        method: 'POST',
        body: JSON.stringify({ email: user.email })
      });
      setResetSent(true);
      setShowResetModal(true);
      setResetStep(1);
    } catch (err) {
      console.error("OTP Error:", err);
      setPasswordError("Failed to send verification code.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    if (resetStep === 1) {
      if (otp.length !== 6) {
        setPasswordError("Please enter the 6-digit code.");
        return;
      }
      setResetStep(2);
      setPasswordError(null);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);

    try {
      await fetchApi('/auth/reset-password-with-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          otp,
          newPassword
        })
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowResetModal(false);
        setResetStep(1);
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }, 4000);
    } catch (err) {
      console.error(err);
      setPasswordError(err.message || "Failed to update password. Code may be invalid.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setPasswordError("Please enter the 6-digit code.");
      return;
    }
    
    setPasswordLoading(true);
    setPasswordError(null);
    
    try {
      await fetchApi('/auth/verify-password-otp', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, otp })
      });
      setResetStep(2);
      setPasswordError(null);
    } catch (err) {
      console.error("Verify OTP Error:", err);
      setPasswordError(err.message || "Invalid or expired verification code.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSendDeleteOTP = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await fetchApi('/auth/send-delete-otp', { method: 'POST' });
      setShowDeleteModal(true);
      setDeleteOtp('');
      setDeleteSuccess(false);
    } catch (err) {
      console.error("Delete OTP Error:", err);
      alert("Failed to send deletion code. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleVerifyAndDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteOtp.length !== 6) {
      setDeleteError("Please enter the 6-digit code.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await fetchApi('/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ otp: deleteOtp })
      });
      setDeleteSuccess(true);
      setTimeout(() => {
        // Notify extension
        window.postMessage({ type: "ZONEIN_LOGOUT" }, "*");
        
        localStorage.removeItem("token");
        localStorage.removeItem("authUser");
        sessionStorage.clear();
        auth.signOut();
        if (setGlobalUser) setGlobalUser(null);
        window.location.href = '/login'; 
      }, 3000);
    } catch (err) {
      console.error("Delete Account Error:", err);
      setDeleteError(err.message || "Failed to delete account. Code may be invalid.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = () => {
    setEditFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      preferredName: user?.preferredName || '',
      contact: user?.contact || '',
      state: user?.state || '',
      country: user?.country || '',
      bio: user?.bio || '',
      learningGoals: user?.learningGoals || []
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    try {
      const updatedUser = await fetchApi('/profile/me', {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });
      
      setUser(updatedUser);
      if (setGlobalUser) setGlobalUser(updatedUser);
      setShowEditModal(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Update Profile Error:", err);
      setEditError(err.message || "Failed to update profile.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const loadProfileData = async () => {
    try {
      // Fetch individually to prevent one failure from blocking everything
      const profileData = await fetchApi('/profile/me').catch(e => console.error("Profile fetch error:", e));
      if (profileData) setUser(profileData);

      const activityData = await fetchApi('/profile/activity').catch(e => console.error("Activity fetch error:", e));
      if (activityData) setHeatmapData(activityData);

      const roadmapData = await fetchApi('/profile/roadmap/progress').catch(e => console.error("Roadmap fetch error:", e));
      if (roadmapData) setStats(roadmapData);

      const streakData = await fetchApi('/profile/streak').catch(e => console.error("Streak fetch error:", e));
      if (streakData) {
        setStreak(streakData.currentStreak || 0);
        setActivities(streakData.recentActivity || []);
        if (streakData.dailyActivity) setDailyActivity(streakData.dailyActivity);
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUser) setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    loadProfileData();
    // Socket.io for real-time updates
    const socket = io('http://127.0.0.1:5000');
    
    if (initialUser?._id) {
      socket.emit('join', initialUser._id);
    }

    const handleUpdate = () => {
      console.log("Profile: Real-time update triggered");
      loadProfileData();
    };

    socket.on('session:progress', (data) => {
      console.log("Profile: Real-time progress received", data);
      if (data.focusStreak !== undefined) {
        setStreak(data.focusStreak);
      }
      // Refetch everything periodically or on session end
    });

    socket.on('session:update', handleUpdate);
    socket.on('activity:new', handleUpdate);
    socket.on('roadmap:update', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [initialUser?._id, location]);

  const roadmapPieData = [
    { name: 'Completed', value: stats?.completedTopics || 0, color: '#7c3aed' },
    { name: 'In Progress', value: stats?.inProgressTopics || 0, color: '#f59e0b' },
    { name: 'Not Started', value: stats?.notStartedTopics || 0, color: '#374151' },
  ];

  const tabs = ['Overview', 'Study Stats', 'Achievements', 'Certificates', 'Activity'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 bg-background text-white p-8 overflow-y-auto custom-scrollbar">
      {/* Password Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !passwordLoading && setShowResetModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-card rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <button 
                onClick={() => !passwordLoading && setShowResetModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {passwordSuccess ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Password Changed!</h3>
                  <p className="text-gray-400 text-sm">Your account is now secured. Use your new password for your next login.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primaryLight">
                      {resetStep === 1 ? <Mail className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {resetStep === 1 ? "Verify Your Email" : "Create New Password"}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {resetStep === 1 
                          ? `Enter the 6-digit code sent to ${user?.email}`
                          : "Enter and confirm your new password."}
                      </p>
                    </div>
                  </div>

                  {passwordError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={resetStep === 1 ? handleVerifyOTP : handleVerifyAndReset} className="space-y-4">
                    {resetStep === 1 ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Verification Code</label>
                        <input 
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-card border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary transition-all text-2xl font-black tracking-[0.5em] text-center"
                          required
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                          <input 
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-card border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary transition-all text-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                          <input 
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-card border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary transition-all text-sm"
                            required
                          />
                        </div>
                      </>
                    )}
                    
                    <button 
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-xl shadow-primary/40 mt-6"
                    >
                      {passwordLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        resetStep === 1 ? "Verify & Continue" : "Save New Password"
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Account Deletion Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleteLoading && !deleteSuccess && setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-red-500/20 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              {!deleteSuccess && (
                <button 
                  onClick={() => !deleteLoading && setShowDeleteModal(false)}
                  className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {deleteSuccess ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-black mb-2 text-red-400">Account Deleted</h3>
                  <p className="text-gray-400 text-sm">Your account and all data have been permanently removed. Redirecting you to login...</p>
                  <div className="mt-8 flex justify-center">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-400">Confirm Deletion</h3>
                      <p className="text-xs text-gray-400">
                        Enter the 6-digit code sent to {user?.email} to permanently delete your account.
                      </p>
                    </div>
                  </div>

                  {deleteError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
                      {deleteError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyAndDeleteAccount} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Verification Code</label>
                      <input 
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={deleteOtp}
                        onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-card border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-red-500 transition-all text-2xl font-black tracking-[0.5em] text-center"
                        required
                      />
                    </div>
                    
                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                      <p className="text-[10px] text-red-400/70 leading-relaxed">
                        <span className="font-black uppercase mr-1">Warning:</span> 
                        This action is irreversible. All your progress, notes, and roadmaps will be lost forever.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      disabled={deleteLoading}
                      className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-xl shadow-red-500/20 mt-6"
                    >
                      {deleteLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        "Permanently Delete My Account"
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Info */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-2">My Profile</h1>
        <p className="text-gray-400">Manage your profile, preferences and track your learning journey.</p>
      </div>

      {/* Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-surface border border-card rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-primary/20 p-1">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden border-2 border-primary">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-black text-primaryLight uppercase">
                    {user?.firstName?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
            </div>
            <button className="absolute bottom-2 right-2 p-2 bg-primary rounded-full shadow-lg hover:scale-110 transition-transform">
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
              <h2 className="text-3xl font-black tracking-tight">{user?.preferredName || `${user?.firstName} ${user?.lastName}`}</h2>
              <span className="px-3 py-1 bg-primary/20 text-primaryLight text-xs font-bold rounded-full border border-primary/30 uppercase tracking-widest shadow-sm">
                {user?.role || 'Learner'}
              </span>
            </div>
            <div className="space-y-2">
              <p className="flex items-center justify-center md:justify-start gap-2 text-gray-400">
                <Mail className="w-4 h-4 text-primaryLight" /> {user?.email}
              </p>
              <p className="flex items-center justify-center md:justify-start gap-2 text-gray-400">
                <Calendar className="w-4 h-4 text-primaryLight" /> Joined on {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}
              </p>
              <p className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 text-primaryLight" /> {user?.state ? `${user.state}, ${user.country}` : user?.country || 'India'}
              </p>
            </div>
          </div>

          <button 
            onClick={openEditModal}
            className="px-6 py-3 border border-primary/30 rounded-2xl text-sm font-bold text-primaryLight hover:bg-primary/10 transition-all flex items-center gap-2 group whitespace-nowrap"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        </motion.div>

        {/* Account Info Side Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface border border-card rounded-[2.5rem] p-8 shadow-xl"
        >
          <h3 className="text-xl font-bold mb-6">Account Information</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email</p>
                <p className="text-sm font-medium text-white">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Phone</p>
                <p className="text-sm font-medium text-white">{user?.phone || "+91 98765 43210"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Location</p>
                <p className="text-sm font-medium text-white">{user?.state ? `${user.state}, ${user.country}` : user?.country || 'India'}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSendOTP}
            disabled={resetLoading || resetSent}
            className={`w-full mt-8 py-4 border border-white/5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              resetSent 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-card/50 text-gray-400 hover:text-white hover:bg-card"
            }`}
          >
            {resetLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : resetSent ? (
              <><CheckCircle className="w-4 h-4" /> Code Sent to Email</>
            ) : (
              <><Lock className="w-4 h-4" /> Change Password</>
            )}
          </button>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 border-b border-card pb-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-sm font-bold transition-all relative ${
              activeTab === tab ? 'text-primaryLight' : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab" 
                className="absolute bottom-[-2px] left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.8)]"
              />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* About Me & Goals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface border border-card rounded-[2.5rem] p-8 shadow-lg">
              <h3 className="text-xl font-bold mb-6">About Me</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                {user.bio}
              </p>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6">Learning Goals</h4>
              <div className="space-y-4">
                {(user?.learningGoals || []).map((goal, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-6 h-6 rounded-full border border-primary/30 flex items-center justify-center text-primaryLight group-hover:bg-primary group-hover:text-white transition-all">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{goal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LeetCode-Style Heatmap Section */}
            <div className="bg-surface border border-card rounded-[2.5rem] p-8 shadow-lg relative overflow-hidden">
               <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                 <div className="flex items-center gap-2">
                   <h3 className="text-2xl font-black">
                     {heatmapData.length > 0 ? heatmapData.reduce((acc, curr) => acc + curr.count, 0) : 0} 
                     <span className="text-gray-500 font-medium text-lg ml-2">minutes in 2026</span>
                   </h3>
                 </div>
                 <div className="flex items-center gap-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest bg-card/50 px-6 py-3 rounded-2xl border border-white/5">
                   <div className="flex flex-col items-center">
                     <span className="text-white text-sm mb-0.5">{heatmapData.filter(d => d.count > 0).length}</span>
                     <span>Active Days</span>
                   </div>
                   <div className="w-[1px] h-8 bg-white/10"></div>
                   <div className="flex flex-col items-center">
                     <span className="text-white text-sm mb-0.5">{streak}</span>
                     <span>Max Streak</span>
                   </div>
                   <div className="w-[1px] h-8 bg-white/10"></div>
                   <select className="bg-transparent border-none outline-none text-primaryLight cursor-pointer">
                     <option>2026</option>
                     <option>2025</option>
                   </select>
                 </div>
               </div>
               
               <div className="flex flex-col gap-4">
                 <div className="flex gap-4">
                   {/* Days labels */}
                   <div className="flex flex-col justify-between py-2 text-[9px] font-bold text-gray-600 uppercase h-[130px] w-8 text-right pr-2 shrink-0">
                     <span>Mon</span>
                     <span>Tue</span>
                     <span>Wed</span>
                     <span>Thu</span>
                     <span>Fri</span>
                     <span>Sat</span>
                     <span>Sun</span>
                   </div>
                   
                   {/* The Grid Grouped by Month */}
                   <div className="flex-1 overflow-x-auto custom-scrollbar pb-4 pt-2">
                     <div className="flex gap-[10px] w-max">
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const currentDayOfWeek = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
                          
                          // Calculate start date of the grid (Monday of the week 51 weeks ago)
                          const startOfGrid = new Date(today);
                          startOfGrid.setDate(today.getDate() - currentDayOfWeek - (51 * 7));
                          
                          const months = [];
                          let lastMonth = -1;
                          
                          for (let w = 0; w < 52; w++) {
                            const weekStartDate = new Date(startOfGrid);
                            weekStartDate.setDate(startOfGrid.getDate() + w * 7);
                            const monthIdx = weekStartDate.getMonth();
                            
                            if (monthIdx !== lastMonth) {
                              months.push({ 
                                name: weekStartDate.toLocaleString('default', { month: 'short' }), 
                                weeks: [] 
                              });
                              lastMonth = monthIdx;
                            }
                            
                            const weekDays = [];
                            for (let d = 0; d < 7; d++) {
                              const date = new Date(weekStartDate);
                              date.setDate(weekStartDate.getDate() + d);
                              
                              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                              const dayData = heatmapData.find(dd => dd.date === dateStr);
                              const count = dayData ? dayData.count : 0;
                              const isFuture = date > today;
                              
                              weekDays.push({ date, count, isFuture });
                            }
                            months[months.length - 1].weeks.push(weekDays);
                          }
                          
                          return months.map((month, mIdx) => (
                            <div key={mIdx} className="flex flex-col gap-2">
                              <div className="flex gap-[4px]">
                                {month.weeks.map((week, wIdx) => (
                                  <div key={wIdx} className="grid grid-rows-7 gap-[4px]">
                                    {week.map((day, dIdx) => {
                                      let bgColor = 'bg-card';
                                      let shadow = '';
                                      
                                      if (day.isFuture) bgColor = 'bg-card/20';
                                      else if (day.count > 0 && day.count < 30) bgColor = 'bg-primary/40';
                                      else if (day.count >= 30 && day.count < 60) bgColor = 'bg-primary/70';
                                      else if (day.count >= 60 && day.count < 120) bgColor = 'bg-primary/90';
                                      else if (day.count >= 120) {
                                        bgColor = 'bg-primary';
                                        shadow = 'shadow-[0_0_15px_rgba(124,58,237,0.7)]';
                                      }
                                      
                                      return (
                                        <div 
                                          key={dIdx} 
                                          title={day.isFuture ? 'Future' : `${day.count} mins on ${day.date.toLocaleDateString()}`}
                                          className={`w-[12px] h-[12px] rounded-[3px] ${bgColor} ${shadow} transition-all duration-300 ${day.isFuture ? '' : 'hover:scale-150 hover:z-20 cursor-pointer'} border border-white/5`} 
                                        />
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                              <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest text-center mt-1">
                                {month.name}
                              </div>
                            </div>
                          ));
                        })()}
                     </div>
                   </div>
                 </div>
               </div>

               <div className="mt-2 flex items-center justify-end gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                 <span>Less Activity</span>
                 <div className="flex gap-1.5 p-1.5 bg-card/30 rounded-lg">
                   <div className="w-[10px] h-[10px] rounded-[2px] bg-card"></div>
                   <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/40"></div>
                   <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/70"></div>
                   <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/90"></div>
                   <div className="w-[10px] h-[10px] rounded-[2px] bg-primary shadow-[0_0_10px_rgba(124,58,237,0.7)]"></div>
                 </div>
                 <span>More Activity</span>
               </div>
            </div>
          </div>

          {/* Roadmap & Streak Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface border border-card rounded-[2.5rem] p-6 shadow-lg flex flex-col items-center">
              <h3 className="text-lg font-bold mb-2 self-start">Roadmap Progress</h3>
              <div className="w-full h-32 relative mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roadmapPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {roadmapPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full border border-white/5 bg-card/50 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
                    <span className="text-xl font-black text-white leading-none mb-0.5">{stats.overallPercentage}%</span>
                    <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">Overall</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full mb-4">
                <div className="text-center">
                  <p className="text-base font-black text-primaryLight leading-none mb-1">{stats.completedTopics}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-black text-amber-500 leading-none mb-1">{stats.inProgressTopics}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">In Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-black text-gray-600 leading-none mb-1">{stats.notStartedTopics}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Pending</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/roadmaps')}
                className="w-full py-3 bg-card border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-card/80 transition-all"
              >
                View Roadmap <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Streak Card */}
            <div className="bg-surface border border-card rounded-[2.5rem] p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">Study Streak 🔥</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{streak}</span>
                  <span className="text-lg font-bold text-gray-500">Days</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">Keep it up! 🔥 You're on a roll.</p>
              </div>
              <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-4 pt-2 custom-scrollbar no-scrollbar-on-mobile snap-x">
                {dailyActivity.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 shrink-0 snap-start">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        day.isActive ? 'bg-primary shadow-[0_0_15px_rgba(124,58,237,0.5)] border-2 border-primaryLight/50' : 'bg-card border border-white/5'
                      }`}>
                        {day.isActive ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <CheckCircle className="w-5 h-5 text-white" />
                          </motion.div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                        )}
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${day.isActive ? 'text-white' : 'text-gray-600'}`}>
                        {day.dayName}
                      </span>
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface border border-card rounded-[2.5rem] p-8 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <button className="text-primaryLight text-xs font-bold uppercase tracking-widest hover:underline">View All Activity</button>
            </div>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {activities.length > 0 ? activities.map((act, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-card/30 border border-white/5 rounded-2xl group hover:bg-card/50 transition-all">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primaryLight group-hover:scale-110 transition-transform">
                       <Play className={`w-5 h-5 ${act.activityType === 'dashboard_visit' ? 'text-gray-400' : ''}`} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white group-hover:text-primaryLight transition-colors">{act.title}</p>
                       <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                         {act.activityType === 'dashboard_visit' ? 'App Usage' : 'Study Activity'}
                       </p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-xs font-bold text-gray-400">{new Date(act.occurredAt || act.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                     <p className="text-[10px] font-bold text-gray-600 uppercase mt-0.5">{new Date(act.occurredAt || act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                   </div>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-8">No recent activity yet. Start learning!</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column Utilities */}
        <div className="space-y-8">
          {/* Preferences */}
          <div className="bg-surface border border-card rounded-[2.5rem] p-8 shadow-lg">
            <h3 className="text-xl font-bold mb-6">Preferences</h3>
            <div className="space-y-2">
              {[
                { label: 'Language', value: 'English' },
                { label: 'Theme', value: 'Dark' },
                { label: 'Study Reminders', value: 'Enabled' },
                { label: 'Daily Study Goal', value: user.dailyGoal },
              ].map(pref => (
                <button key={pref.label} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-card transition-all group">
                  <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">{pref.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{pref.value}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="bg-surface border border-card rounded-[2.5rem] p-8 shadow-lg">
            <h3 className="text-xl font-bold mb-6">Connected Account</h3>
            <div className="p-4 bg-card/30 border border-white/5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">YouTube</p>
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Connected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-8 shadow-lg">
            <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
              Danger Zone <Shield className="w-5 h-5" />
            </h3>
            <button 
              onClick={handleSendDeleteOTP}
              disabled={deleteLoading}
              className="w-full flex items-center justify-between p-4 bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                  {deleteLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-red-400">Delete Account</p>
                  <p className="text-[10px] font-bold text-red-500/50 uppercase tracking-widest">Permanently delete your account</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-red-500/40 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !editLoading && setShowEditModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a12]/90 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden my-auto"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Edit <span className="text-primaryLight">Profile</span></h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Update your personal information</p>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {editError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-6 relative z-10">
                {/* Identity Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-primary/50 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-focus-within:bg-primary/20 transition-colors">
                        <User className="w-4 h-4 text-primaryLight" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">First Name</label>
                        <input 
                          name="firstName"
                          value={editFormData.firstName}
                          onChange={handleEditInputChange}
                          className="w-full bg-transparent border-none p-0 text-white placeholder:text-gray-600 outline-none text-sm font-medium"
                          placeholder="Your first name"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-primary/50 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-focus-within:bg-primary/20 transition-colors">
                        <User className="w-4 h-4 text-primaryLight" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Last Name</label>
                        <input 
                          name="lastName"
                          value={editFormData.lastName}
                          onChange={handleEditInputChange}
                          className="w-full bg-transparent border-none p-0 text-white placeholder:text-gray-600 outline-none text-sm font-medium"
                          placeholder="Your last name"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nickname & Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-primary/50 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-focus-within:bg-primary/20 transition-colors">
                        <Zap className="w-4 h-4 text-primaryLight" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Preferred Name</label>
                        <input 
                          name="preferredName"
                          value={editFormData.preferredName}
                          onChange={handleEditInputChange}
                          className="w-full bg-transparent border-none p-0 text-white placeholder:text-gray-600 outline-none text-sm font-medium"
                          placeholder="Nickname"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-primary/50 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-focus-within:bg-primary/20 transition-colors">
                        <Phone className="w-4 h-4 text-primaryLight" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Contact No.</label>
                        <input 
                          name="contact"
                          value={editFormData.contact}
                          onChange={handleEditInputChange}
                          className="w-full bg-transparent border-none p-0 text-white placeholder:text-gray-600 outline-none text-sm font-medium"
                          placeholder="+91 00000 00000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-primary/50 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-focus-within:bg-primary/20 transition-colors">
                        <MapPin className="w-4 h-4 text-primaryLight" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">State / Province</label>
                        <input 
                          name="state"
                          value={editFormData.state}
                          onChange={handleEditInputChange}
                          className="w-full bg-transparent border-none p-0 text-white placeholder:text-gray-600 outline-none text-sm font-medium"
                          placeholder="Your state"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-primary/50 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-focus-within:bg-primary/20 transition-colors">
                        <Globe className="w-4 h-4 text-primaryLight" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Country</label>
                        <input 
                          name="country"
                          value={editFormData.country}
                          onChange={handleEditInputChange}
                          className="w-full bg-transparent border-none p-0 text-white placeholder:text-gray-600 outline-none text-sm font-medium"
                          placeholder="Your country"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-primary/50 group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-focus-within:bg-primary/20 transition-colors mt-1">
                      <FileText className="w-4 h-4 text-primaryLight" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Short Bio</label>
                      <textarea 
                        name="bio"
                        value={editFormData.bio}
                        onChange={handleEditInputChange}
                        className="w-full bg-transparent border-none p-0 text-white placeholder:text-gray-600 outline-none text-sm font-medium min-h-[80px] resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-4 border border-white/5 rounded-2xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={editLoading}
                    className="flex-[2] py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                  >
                    {editLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>Update Profile <CheckCircle className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
