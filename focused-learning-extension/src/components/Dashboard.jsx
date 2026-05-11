import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Flame, 
  Clock, 
  Shield, 
  ExternalLink, 
  Trophy,
  Power,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Dashboard = ({ user, setUser }) => {
  const [stats, setStats] = useState({ 
    blocked: 0, 
    watchTimeSeconds: 0, 
    streak: 0,
    dailyActivity: [],
    isFocusMode: true,
    activeRoadmap: null,
    loading: true
  });
  const [showRoadmapMenu, setShowRoadmapMenu] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, message: "" });

  useEffect(() => {
    const fetchStats = async (localBlocked, localWatchTime) => {
      try {
        const token = await new Promise(resolve => {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['token'], (res) => resolve(res.token));
          } else {
            resolve(localStorage.getItem('token'));
          }
        });
        if (!token) return;

        // First, push local stats to ensure backend is up to date
        if (localBlocked !== undefined) {
          await fetch("http://localhost:5000/api/analytics/sync-today-stats", {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ blockedCount: localBlocked, watchTimeSeconds: localWatchTime })
          });
        }

        const [statsRes, roadmapRes] = await Promise.all([
          fetch("http://localhost:5000/api/analytics/dashboard/stats", {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch("http://localhost:5000/api/roadmap/active", {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const statsData = await statsRes.json();
        const roadmapData = roadmapRes.ok ? await roadmapRes.json() : null;

        if (statsRes.ok) {
          setStats(prev => ({
            ...prev,
            streak: statsData.streak || prev.streak,
            // Trust the backend as the source of truth after sync
            blocked: statsData.totalBlocked ?? prev.blocked,
            watchTimeSeconds: statsData.totalWatchTime ?? prev.watchTimeSeconds,
            dailyActivity: statsData.dailyActivity || prev.dailyActivity,
            activeRoadmap: roadmapData,
            loading: false
          }));
          
          // Update local storage to match backend truth
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 
              blockedCount: statsData.totalBlocked, 
              todayWatchTime: statsData.totalWatchTime 
            });
          }
        }
      } catch (e) {
        console.error("Fetch Stats Error:", e);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['blockedCount', 'todayWatchTime', 'dailyActivity', 'isFocusMode'], (result) => {
        let blocked = result.blockedCount || 0;
        let watchTime = result.todayWatchTime || 0;
        
        // Emergency cleanup for runaway counts in local storage
        if (blocked > 1000) {
          blocked = 0;
          chrome.storage.local.set({ blockedCount: 0 });
        }
        // Cap watch time to sane daily limit (e.g. 16 hours)
        if (watchTime > 16 * 3600) {
          watchTime = 0;
          chrome.storage.local.set({ todayWatchTime: 0 });
        }

        setStats(prev => ({
          ...prev,
          blocked: blocked,
          watchTimeSeconds: watchTime,
          dailyActivity: result.dailyActivity || [],
          isFocusMode: result.isFocusMode !== false
        }));
        
        fetchStats(blocked, watchTime);
      });
      
      const listener = (changes) => {
        if (changes.blockedCount) {
          const newVal = changes.blockedCount.newValue;
          if (newVal > 1000) {
            chrome.storage.local.set({ blockedCount: 0 });
            setStats(s => ({ ...s, blocked: 0 }));
          } else {
            setStats(s => ({ ...s, blocked: newVal }));
          }
        }
        if (changes.todayWatchTime) setStats(s => ({ ...s, watchTimeSeconds: changes.todayWatchTime.newValue }));
        if (changes.isFocusMode) setStats(s => ({ ...s, isFocusMode: changes.isFocusMode.newValue }));
        if (changes.dailyActivity) setStats(s => ({ ...s, dailyActivity: changes.dailyActivity.newValue }));
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const toggleFocusMode = () => {
    const nextMode = !stats.isFocusMode;
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "TOGGLE_FOCUS_MODE", isFocusMode: nextMode });
    }
    setStats(s => ({ ...s, isFocusMode: nextMode }));
  };

  const handleDeleteRoadmap = async () => {
    if (!stats.activeRoadmap) return;
    
    const funnyMessages = [
      "Wait! Are you sure? Your roadmap will be sent to the digital graveyard! 🪦 Digital tears will be shed. 😭",
      "Whoa there! Incinerating this goal? Don't let the distractions win! 🚫🔥",
      "Are you sure you want to throw all this hard work into the abyss? Even the AI is feeling sad now. 🤖💔",
      "Deleting this? Your future self is judging you... gently. 🧐 Are you absolutely sure?"
    ];
    const message = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    setDeleteConfirmation({ isOpen: true, message });
    setShowRoadmapMenu(false);
  };

  const confirmDelete = async () => {
    try {
      const token = await new Promise(resolve => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['token'], (res) => resolve(res.token));
        } else {
          resolve(localStorage.getItem('token'));
        }
      });
      
      await fetch(`http://localhost:5000/api/roadmap-web/${stats.activeRoadmap._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setStats(prev => ({ ...prev, activeRoadmap: null }));
      setDeleteConfirmation({ isOpen: false, message: "" });
    } catch (e) {
      console.error("Delete Roadmap Error:", e);
    }
  };

  const formatWatchTimeDetailed = (totalSeconds) => {
    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes === 0) return "0m";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let res = "";
    if (hours > 0) res += `${hours}h `;
    res += `${minutes}m`;
    return res.trim();
  };


  return (
    <div className="flex flex-col h-full bg-[#050816] text-white p-5 relative overflow-hidden select-none font-sans">
      <header className="flex items-center justify-between p-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/icons/logo.png" className="w-full h-full object-cover" alt="Logo" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">ZoneIn</h1>
            <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-500">Learning Assistant</p>
          </div>
        </div>
        <button onClick={toggleFocusMode} className={`relative w-12 h-6 rounded-full transition-all duration-300 ${stats.isFocusMode ? 'bg-primary' : 'bg-gray-800'} border border-white/10`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300 ${stats.isFocusMode ? 'left-[26px]' : 'left-0.5'} flex items-center justify-center`}>
            <Power className={`w-3 h-3 ${stats.isFocusMode ? 'text-primary' : 'text-gray-400'}`} />
          </div>
        </button>
      </header>

      <div className="flex-1 space-y-4 flex flex-col justify-center">
        <section className={`bg-white/5 border rounded-[24px] p-5 transition-all ${stats.isFocusMode ? 'border-primary/20 shadow-lg shadow-primary/5' : 'border-white/5 opacity-70'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-500 mb-0.5">Focus Streak</p>
              <h2 className="text-xl font-black">{stats.streak} Days</h2>
            </div>
            <Trophy className={`w-5 h-5 transition-colors ${stats.isFocusMode ? 'text-yellow-500' : 'text-gray-600'}`} />
          </div>
          <div className="flex items-center gap-2 px-1 overflow-x-auto pb-2 custom-scrollbar no-scrollbar snap-x">
            {stats.dailyActivity.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 snap-start">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${day.isActive ? 'bg-orange-500/20 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-white/5 border border-white/5'}`}>
                    <Flame className={`w-5 h-5 transition-all ${day.isActive ? 'text-orange-500 fill-orange-500' : 'text-gray-700 stroke-[1.5px]'}`} />
                  </div>
                  <span className={`text-[7px] font-black uppercase tracking-tighter ${day.isActive ? 'text-gray-400' : 'text-gray-700'}`}>{day.dayName}</span>
                </div>
            ))}
          </div>
        </section>

        {/* Current Roadmap Section */}
        {stats.activeRoadmap && (
          <section className="bg-primary/5 border border-primary/20 rounded-[24px] p-4 relative group">
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-primary mb-0.5">Current Goal</p>
                <h3 className="text-sm font-black truncate max-w-[180px]">{stats.activeRoadmap.goal}</h3>
              </div>
              <div className="flex items-center gap-1">
                <div className="relative z-20">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowRoadmapMenu(!showRoadmapMenu);
                    }}
                    className="p-1 text-gray-500 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  
                  {showRoadmapMenu && (
                    <div key="roadmap-menu-compact">
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRoadmapMenu(false);
                        }}
                      ></div>
                      <div 
                        className="absolute right-0 top-6 w-28 bg-[#1a1c2e] border border-white/10 rounded-lg shadow-xl z-40 py-1 overflow-hidden"
                      >
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (typeof chrome !== 'undefined' && chrome.storage) {
                              chrome.storage.local.set({ todayWatchTime: 0, blockedCount: 0 });
                              setStats(s => ({ ...s, watchTimeSeconds: 0, blocked: 0 }));
                              setShowRoadmapMenu(false);
                            }
                          }}
                          className="w-full px-2 py-1.5 flex items-center gap-2 text-blue-400 hover:bg-blue-500/10 transition-colors font-bold text-[9px] text-left border-b border-white/5"
                        >
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          RESET STATS
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteRoadmap();
                          }}
                          className="w-full px-2 py-1.5 flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors font-bold text-[9px] text-left"
                        >
                          <Trash2 className="w-2.5 h-2.5 shrink-0" />
                          DELETE
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
            
            {/* Next Topic */}
            {(() => {
              const nextTopic = stats.activeRoadmap.topics.find(t => !t.isCompleted);
              if (!nextTopic) return null;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                    <p className="text-[10px] font-bold text-gray-400">Next: {nextTopic.title}</p>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${Math.round((stats.activeRoadmap.completedTopics / stats.activeRoadmap.totalTopics) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-4 flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-[0.1em] font-bold text-gray-500 mb-0.5">Time Focused</p>
              <h3 className="text-sm font-black tabular-nums leading-none">{formatWatchTimeDetailed(stats.watchTimeSeconds)}</h3>
            </div>
            <div className={`py-1 px-2 rounded-full text-[6px] font-black uppercase tracking-widest border transition-all ${stats.isFocusMode ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}>
              {stats.isFocusMode ? 'Active' : 'Idle'}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[24px] p-4 flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-[0.1em] font-bold text-gray-500 mb-0.5">Blocked</p>
              <h3 className="text-sm font-black tabular-nums leading-none">{stats.blocked}</h3>
            </div>
            <div className="py-1 px-2 rounded-full text-[6px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/30 text-green-400">
              Shielded
            </div>
          </div>
        </div>
      </div>

      {/* Posh Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmation({ isOpen: false, message: "" })}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative w-full max-w-[280px] bg-surface border border-white/10 rounded-[2rem] p-6 shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">Wait!</h2>
              <p className="text-[10px] text-gray-400 mb-6 leading-relaxed">
                {deleteConfirmation.message}
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-2.5 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  INCINERATE
                </button>
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: false, message: "" })}
                  className="w-full py-2.5 bg-white/5 text-gray-400 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  BACK TO SAFETY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
