import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, BookOpen, ChevronRight, PlayCircle, 
  CheckCircle, Star, Loader2, Search, X,
  MoreVertical, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../../api';
import { io } from 'socket.io-client';

const RoadmapList = ({ user }) => {
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState([]);
  const [activity, setActivity] = useState([]);
  const [overall, setOverall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, message: "" });

  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    if (user?._id) {
      socket.emit('join', user._id);
    }

    socket.on('activity', (newActivity) => {
      setActivity(prev => {
        // Add new activity at the top and keep only last 10
        const updated = [newActivity, ...prev];
        return updated.slice(0, 10);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roadmapsData, activityData, overallData] = await Promise.all([
        fetchApi('/roadmap-web/all'),
        fetchApi('/roadmap-web/recent-activity'),
        fetchApi('/roadmap-web/overall-progress')
      ]);
      setRoadmaps(roadmapsData);
      setActivity(activityData);
      setOverall(overallData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!newGoal) return;
    try {
      setGenerating(true);
      setError(null);
      await fetchApi('/roadmap-web/generate', {
        method: 'POST',
        body: JSON.stringify({ goal: newGoal })
      });
      setIsModalOpen(false);
      setNewGoal("");
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRoadmap = async (id) => {
    const funnyMessages = [
      "Wait! Are you sure? Your roadmap will be sent to the digital graveyard! 🪦 Digital tears will be shed. 😭",
      "Whoa there! Incinerating this goal? Don't let the distractions win! 🚫🔥",
      "Are you sure you want to throw all this hard work into the abyss? Even the AI is feeling sad now. 🤖💔",
      "Deleting this? Your future self is judging you... gently. 🧐 Are you absolutely sure?"
    ];
    const message = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    setDeleteConfirmation({ isOpen: true, id, message });
    setActiveMenuId(null);
  };

  const confirmDelete = async () => {
    try {
      await fetchApi(`/roadmap-web/${deleteConfirmation.id}`, {
        method: 'DELETE'
      });
      setDeleteConfirmation({ isOpen: false, id: null, message: "" });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const cardColors = [
    { bg: 'bg-green-500/10', text: 'text-green-500' },
    { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    { bg: 'bg-orange-500/10', text: 'text-orange-500' },
    { bg: 'bg-pink-500/10', text: 'text-pink-500' }
  ];

  if (loading && !roadmaps.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Your Learning Roadmaps</h1>
          <p className="text-gray-400">Track and manage your structured learning paths.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primaryDark text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary/30"
        >
          <Plus className="w-5 h-5" />
          Generate Roadmap
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roadmaps.map((roadmap, i) => {
          const color = cardColors[i % cardColors.length];
          return (
            <div 
              key={roadmap._id} 
              onClick={() => navigate(`/roadmap/${roadmap._id}`)}
              className="bg-surface border border-card rounded-[2rem] p-6 group hover:border-primary/30 transition-all glow-card relative cursor-pointer"
            >
              <div className="flex items-center justify-between mb-6 pr-12">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 ${color.bg} rounded-2xl flex items-center justify-center shrink-0`}>
                    <BookOpen className={`w-6 h-6 ${color.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white truncate">{roadmap.goal}</h3>
                </div>
              </div>
              
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === roadmap._id ? null : roadmap._id);
                  }}
                  className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {activeMenuId === roadmap._id && (
                  <div key="menu-container-refined">
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(null);
                      }}
                    ></div>
                    <div 
                      className="absolute right-0 top-8 w-40 bg-[#1a1c2e] border border-white/10 rounded-xl shadow-2xl z-40 py-1 overflow-hidden"
                    >
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteRoadmap(roadmap._id);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors font-bold text-[10px] text-left"
                      >
                        <Trash2 className="w-3 h-3 shrink-0" />
                        DELETE
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</p>
                  <span className="text-sm font-black text-white">{roadmap.progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-card rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${roadmap.progressPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400">
                  {roadmap.completedTopics} / {roadmap.totalTopics} Topics Completed
                </p>
              </div>

            </div>
          );
        })}

        {!roadmaps.length && !loading && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No roadmaps yet.</h3>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-primary font-bold hover:underline"
            >
              Generate your first roadmap
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-surface border border-card rounded-[2.5rem] p-8">
          <h2 className="text-xl font-black text-white mb-8">Recent Activity</h2>
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
            {activity.map((item, i) => {
              const icons = {
                watched: { icon: PlayCircle, bg: 'bg-orange-500/10', text: 'text-orange-500' },
                completed: { icon: CheckCircle, bg: 'bg-green-500/10', text: 'text-green-500' },
                quiz: { icon: Star, bg: 'bg-purple-500/10', text: 'text-purple-500' },
                default: { icon: BookOpen, bg: 'bg-blue-500/10', text: 'text-blue-500' }
              };
              const style = icons[item.type] || icons.default;
              
              const videoUrl = item.videoId 
                ? `https://www.youtube.com/watch?v=${item.videoId}` 
                : item.videoUrl;

              const content = (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${style.bg} rounded-xl flex items-center justify-center transition-all group-hover:scale-110`}>
                      <style.icon className={`w-5 h-5 ${style.text}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold text-white transition-colors line-clamp-1 ${videoUrl ? 'group-hover:text-primary group-hover:underline' : ''}`}>
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.type}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">{getTimeAgo(item.occurredAt)}</span>
                </div>
              );

              return videoUrl ? (
                <a 
                  key={i} 
                  href={videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block no-underline"
                >
                  {content}
                </a>
              ) : (
                <div key={i}>{content}</div>
              );
            })}
            {!activity.length && (
              <p className="text-center text-gray-500 py-10">No recent activity yet.</p>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-surface border border-card rounded-[2.5rem] p-8">
          <h2 className="text-xl font-black text-white mb-8">Overall Progress</h2>
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 mb-10">
              <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle 
                  cx="60" cy="60" r="50" 
                  className="stroke-card fill-none" 
                  strokeWidth="10" 
                />
                <circle 
                  cx="60" cy="60" r="50" 
                  className="stroke-primary fill-none transition-all duration-1000" 
                  strokeWidth="10" 
                  strokeDasharray="314.16"
                  strokeDashoffset={314.16 * (1 - (overall?.overallPercent || 0) / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{overall?.overallPercent || 0}%</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Completed</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              {[
                { label: 'Completed Topics', val: overall?.completedTopics, color: 'text-green-500' },
                { label: 'In Progress', val: overall?.inProgressTopics, color: 'text-orange-500' },
                { label: 'Not Started', val: overall?.notStartedTopics, color: 'text-gray-500' },
                { label: 'Total Topics', val: overall?.totalTopics, color: 'text-white' }
              ].map(stat => (
                <div key={stat.label} className="bg-card/50 p-4 rounded-2xl border border-white/5">
                  <p className={`text-xl font-black ${stat.color} mb-1`}>{stat.val || 0}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/90 backdrop-blur-md transition-all"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-surface border border-card w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-black text-white mb-2">Generate New Roadmap</h2>
            <p className="text-gray-400 mb-8">What do you want to learn? Let AI build your path.</p>
            
            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <input 
                  id="roadmap-goal-input"
                  type="text" 
                  value={newGoal}
                  onChange={(e) => {
                    console.log("Input Change:", e.target.value);
                    setNewGoal(e.target.value);
                  }}
                  placeholder="e.g. Modern Web Development with React"
                  className="w-full bg-card border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-all relative z-10 text-lg"
                  disabled={generating}
                  autoFocus
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={generating || !newGoal.trim()}
                className="w-full py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating your roadmap...
                  </>
                ) : (
                  <>Generate Roadmap</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Posh Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmation({ isOpen: false, id: null, message: "" })}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface border-2 border-white/5 rounded-[2.5rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-4">Wait a second!</h2>
              <p className="text-gray-400 mb-10 leading-relaxed font-medium px-4">
                {deleteConfirmation.message}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                >
                  INCINERATE IT
                </button>
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: false, id: null, message: "" })}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold transition-all active:scale-[0.98]"
                >
                  KEEP IT SAFE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoadmapList;
