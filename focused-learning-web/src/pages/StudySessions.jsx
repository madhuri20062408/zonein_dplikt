import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Disc, Timer, Play, Pause, Square, Trash2, CheckCircle, Circle, ShieldAlert } from 'lucide-react';
import SessionModal from '../components/SessionModal';
import { fetchApi } from '../api';

const StatCard = ({ icon: Icon, title, value, colorClass }) => (
  <div className="bg-surface rounded-xl p-6 border border-card glow-card animate-fade-in flex flex-col justify-between h-full">
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-full ${colorClass} bg-opacity-20 flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  </div>
);

const StudySessions = ({ user }) => {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [privacySettings, setPrivacySettings] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, histRes, privacyRes] = await Promise.all([
        fetchApi('/sessions/summary'),
        fetchApi(`/sessions/history?page=${page}&limit=4`),
        fetchApi('/privacy')
      ]);
      setSummary(sumRes);
      setHistory(histRes.sessions || []);
      setTotalPages(histRes.totalPages || 1);
      setPrivacySettings(privacyRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const active = await fetchApi('/sessions/active');
      if (active && active.isActive) {
        setActiveSession(active);
        const elapsed = Math.floor((Date.now() - new Date(active.startTime).getTime()) / 1000);
        setElapsedSeconds(elapsed);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      setActiveSession(null);
    }
  };

  useEffect(() => {
    fetchData();
    fetchActiveSession();
  }, [page]);

  useEffect(() => {
    let interval;
    if (activeSession && !activeSession.isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          
          // Break Reminder Logic
          if (user?.notifications?.sessionBreakReminder) {
            const intervalText = user.notifications.breakInterval || "45 Minutes";
            const intervalSecs = (parseInt(intervalText) || 45) * 60;
            
            // If we just hit the exact interval (or multiples)
            if (next > 0 && next % intervalSecs === 0) {
              if (Notification.permission === "granted") {
                new Notification("Time for a break!", {
                  body: `You've been studying for ${intervalText}. Take 5 minutes to rest!`,
                  icon: "/logo192.png"
                });
              } else {
                alert(`☕ Time for a break! You've been studying for ${intervalText}.`);
              }
            }
          }
          
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, user]);

  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const togglePause = async () => {
    if (!activeSession) return;
    try {
      const endpoint = activeSession.isPaused ? 'resume' : 'pause';
      const body = endpoint === 'pause' ? { elapsedSeconds } : {};
      const updated = await fetchApi(`/sessions/${activeSession._id}/${endpoint}`, { 
        method: 'PATCH',
        body
      });
      setActiveSession(updated);
    } catch (err) {
      console.error("Failed to pause/resume", err);
    }
  };

  const endActiveSession = async () => {
    if (!activeSession) return;
    try {
      await fetchApi(`/sessions/${activeSession._id}/end`, {
        method: 'POST',
        body: { durationSeconds: elapsedSeconds, distractionsBlocked: 0 }
      });
      setActiveSession(null);
      fetchData();
    } catch (err) {
      console.error("Failed to end session", err);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Are you sure you want to delete this study session from history?")) return;
    try {
      await fetchApi(`/sessions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSubtopic = async (index, isCompleted) => {
    if (!activeSession) return;
    try {
      const updated = await fetchApi(`/sessions/${activeSession._id}/subtopic`, {
        method: 'PATCH',
        body: { index, isCompleted }
      });
      setActiveSession(updated);
    } catch (err) {
      console.error("Failed to update subtopic", err);
    }
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (score >= 70) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  if (loading && !summary) {
    return <div className="text-white p-8">Loading sessions...</div>;
  }

  if (error) {
    return <div className="text-red-400 p-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6 pb-20 w-full max-w-[1600px] mx-auto px-2 lg:px-6 relative min-h-full">
      {privacySettings && privacySettings.activeTracking === false && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4 text-yellow-500 animate-fade-in mb-6">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            Active Tracking is OFF. Your study time and session history are not being recorded. 
            <a href="/settings" className="ml-2 underline font-bold hover:text-yellow-400">Enable it in Privacy Settings</a>.
          </p>
        </div>
      )}
      {/* Tab Bar & Action */}
      <div className="flex justify-between items-center mb-8 border-b border-card pb-4">
        <div className="flex gap-6">
          <button className="text-primaryLight border-b-2 border-primary pb-4 font-medium -mb-[17px] transition-colors">
            All Sessions
          </button>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primaryLight text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Disc className="w-4 h-4" /> Start New Study Session
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Calendar}
          title="Total Sessions"
          value={summary?.totalSessions || 0}
          colorClass="bg-primary text-primary"
        />
        <StatCard
          icon={Clock}
          title="Total Time"
          value={summary?.totalTime || '0h 0m'}
          colorClass="bg-green-500 text-green-500"
        />
        <StatCard
          icon={Timer}
          title="Avg. Session Time"
          value={summary?.avgSessionTime || '0m'}
          colorClass="bg-orange-500 text-orange-500"
        />
        <StatCard
          icon={Clock}
          title="Longest Session"
          value={summary?.longestSession || '0h 0m'}
          colorClass="bg-blue-500 text-blue-500"
        />
      </div>

      {/* History Table */}
      <div className="bg-surface rounded-xl border border-card overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card/50 border-b border-gray-800">
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Topic</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Progress Score</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
               {activeSession && page === 1 && (
                <tr className="bg-primary/10 border-l-4 border-primary hover:bg-primary/15 transition-colors">
                  <td className="py-4 px-6 text-sm font-bold text-primaryLight">
                    Active Now
                  </td>
                  <td className="py-4 px-6 text-sm font-medium text-white">
                    <div className="flex flex-col gap-3">
                      <span className="font-bold">{activeSession.goal || 'General Study'}</span>
                      {activeSession.subtopics && activeSession.subtopics.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                            <span>Progress</span>
                            <span>{Math.round((activeSession.subtopics.filter(s => s.isCompleted).length / activeSession.subtopics.length) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500" 
                              style={{ width: `${(activeSession.subtopics.filter(s => s.isCompleted).length / activeSession.subtopics.length) * 100}%` }}
                            ></div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {activeSession.subtopics.map((st, i) => (
                              <button 
                                key={i}
                                onClick={() => toggleSubtopic(i, !st.isCompleted)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${st.isCompleted ? 'bg-primary/20 border-primary/40 text-primaryLight' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
                              >
                                {st.isCompleted ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                                {st.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm font-mono tracking-wider">
                    <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-1">Elapsed Time</span>
                        <span className="text-2xl font-black text-primaryLight drop-shadow-[0_0_8px_rgba(139,92,246,0.4)] font-mono">
                          {formatTime(elapsedSeconds)}
                        </span>
                      </div>
                      <div className="flex gap-2 ml-auto">
                        <button 
                          onClick={togglePause} 
                          className={`p-2 rounded-xl transition-all border ${activeSession.isPaused ? 'bg-primary/20 border-primary/40 text-primaryLight hover:bg-primary/30' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`} 
                          title={activeSession.isPaused ? 'Resume' : 'Pause'}
                        >
                          {activeSession.isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={endActiveSession} 
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all group" 
                          title="End Session"
                        >
                          <Square className="w-5 h-5 group-hover:fill-current transition-all" />
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-center text-sm font-bold text-primaryLight">
                    {activeSession.subtopics?.length > 0 
                      ? `${Math.round((activeSession.subtopics.filter(s => s.isCompleted).length / activeSession.subtopics.length) * 100)}%`
                      : '-'}
                  </td>
                  <td className="py-4 px-6 text-right">-</td>
                </tr>
              )}
              {history.map((session, idx) => (
                <tr key={session._id} className="hover:bg-card/30 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-300">
                    {new Date(session.startTime || session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-4 px-6 text-sm font-medium text-white">
                    <div className="flex flex-col gap-2">
                      <span className="font-bold">{session.topic || session.goal || 'Untitled Session'}</span>
                      {session.subtopics && session.subtopics.length > 0 && (
                        <div className="space-y-2 w-full max-w-[200px]">
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-gray-600 font-bold">
                            <span>Completion</span>
                            <span>{Math.round((session.subtopics.filter(s => s.isCompleted).length / session.subtopics.length) * 100)}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500/50 transition-all duration-500" 
                              style={{ width: `${(session.subtopics.filter(s => s.isCompleted).length / session.subtopics.length) * 100}%` }}
                            ></div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {session.subtopics.map((st, i) => (
                              <div 
                                key={i}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${st.isCompleted ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-gray-600'}`}
                              >
                                {st.isCompleted ? <CheckCircle className="w-2.5 h-2.5" /> : <Circle className="w-2.5 h-2.5" />}
                                {st.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-300">{session.durationMinutes}m</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full border border-green-500/20 bg-green-500/10 text-green-500 text-xs font-bold">
                      {session.subtopics?.length > 0 
                        ? `${Math.round((session.subtopics.filter(s => s.isCompleted).length / session.subtopics.length) * 100)}%`
                        : '0%'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => handleDeleteSession(session._id)}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && !activeSession && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">No past sessions found. Start studying!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-8 border-t border-gray-800/50 flex flex-col items-center justify-center gap-4">
          <span className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em]">
            Page <span className="text-primaryLight">{page}</span> of <span className="text-white">{Math.max(1, totalPages)}</span>
          </span>
          <div className="flex gap-4">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-8 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-2xl border border-white/10 disabled:opacity-20 hover:bg-white/5 active:scale-95"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-8 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primaryLight hover:shadow-primary/40 disabled:bg-gray-800 disabled:text-gray-600 disabled:shadow-none active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      </div>



      {/* Session Modal */}
      <SessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSessionComplete={() => {
          fetchActiveSession();
          fetchData();
        }}
      />
    </div>
  );
};

export default StudySessions;
