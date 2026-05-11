import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, CartesianGrid } from 'recharts';
import { Clock, Target, ShieldAlert, CheckCircle, PlayCircle, Notebook, ChevronRight, BookOpen } from 'lucide-react';
import { fetchApi } from '../api';

const StatCard = ({ icon: Icon, title, value, subLabel, colorClass, isProgress, progress }) => (
  <div className="bg-surface rounded-xl p-6 border border-card glow-card animate-fade-in flex flex-col justify-between h-full">
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-full ${colorClass} bg-opacity-20 flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-white mb-2">{value}</p>
        {!isProgress && subLabel && (
          <p className="text-xs font-medium text-green-400">{subLabel}</p>
        )}
      </div>
    </div>
    {isProgress && (
      <div className="mt-4">
        <div className="w-full bg-background rounded-full h-1.5 mb-2 overflow-hidden">
          <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress || 0}%` }}></div>
        </div>
        <p className="text-xs font-medium text-green-400 text-right">{subLabel}</p>
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1c2e] border border-primary/30 p-3 rounded-lg shadow-2xl backdrop-blur-md">
        <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mb-1">{label}</p>
        <p className="text-primaryLight text-sm font-black">
          {payload[0].value.toFixed(1)} Hours
        </p>
      </div>
    );
  }
  return null;
};

const Analytics = ({ user }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [weeklyHours, setWeeklyHours] = useState([]);
  const [monthlyHours, setMonthlyHours] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sumRes, weekRes, monthRes, mapRes, actRes] = await Promise.all([
          fetchApi('/analytics/summary'),
          fetchApi('/analytics/weekly-hours'),
          fetchApi(`/analytics/monthly-hours?month=${selectedMonth}&year=${selectedYear}`),
          fetchApi('/analytics/current-roadmap'),
          fetchApi('/analytics/recent-activity')
        ]);
        setSummary(sumRes);
        setWeeklyHours(weekRes);
        setMonthlyHours(monthRes);
        setRoadmaps(mapRes);
        setActivities(actRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Listen for real-time updates from the extension
    const messageListener = (event) => {
      // Check if message is from our extension
      if (event.data && event.data.type === 'ZONEIN_STATS_UPDATE') {
        const { blockedCount, watchTimeSeconds } = event.data;
        const totalMinutes = Math.round(watchTimeSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        setSummary(prev => prev ? ({
          ...prev,
          distractionsBlocked: blockedCount,
          totalStudyHours: timeStr
        }) : prev);
      }
    };

    window.addEventListener('message', messageListener);
    
    // Also support chrome.runtime messages if we are running in an environment that supports it
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessageExternal) {
      chrome.runtime.onMessageExternal.addListener((request) => {
        if (request.type === 'ZONEIN_STATS_UPDATE') {
          const { blockedCount, watchTimeSeconds } = request;
          const totalMinutes = Math.round(watchTimeSeconds / 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          setSummary(prev => prev ? ({
            ...prev,
            distractionsBlocked: blockedCount,
            totalStudyHours: timeStr
          }) : prev);
        }
      });
    }

    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, [selectedMonth, selectedYear]);

  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { greeting: 'Good morning', message: 'Ready to start your day with some focus?' };
    } else if (hour >= 12 && hour < 17) {
      return { greeting: 'Good afternoon', message: 'Keeping up the momentum?' };
    } else if (hour >= 17 && hour < 21) {
      return { greeting: 'Good evening', message: 'Gearing up for a productive evening?' };
    } else {
      return { greeting: 'Good night', message: 'Burning the midnight oil? Stay focused!' };
    }
  };

  if (loading) {
    return <div className="text-white p-8">Loading analytics... (skeleton goes here)</div>;
  }

  if (error) {
    return <div className="text-red-400 p-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6 pb-20 w-full max-w-[1800px] mx-auto px-2 lg:px-6">
      {/* Greeting Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          {getGreetingData().greeting}, {user?.name?.split(' ')[0] || 'Learner'}! 👋
        </h1>
        <p className="text-gray-400">{getGreetingData().message}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Clock}
          title="Today's Study"
          value={summary?.totalStudyHours}
          subLabel={`${summary?.weeklyStudyHoursChange >= 0 ? '▲' : '▼'} ${Math.abs(summary?.weeklyStudyHoursChange || 0).toFixed(1)}h this week`}
          colorClass="bg-primary text-primary"
        />
        <StatCard
          icon={Target}
          title="Focus Score"
          value={`${summary?.focusScore || 0} /100`}
          subLabel={`${summary?.weeklyFocusScoreChange >= 0 ? '▲' : '▼'} ${Math.abs(summary?.weeklyFocusScoreChange || 0)} points this week`}
          colorClass="bg-orange-500 text-orange-500"
        />
        <StatCard
          icon={ShieldAlert}
          title="Today's Blocked"
          value={summary?.distractionsBlocked || 0}
          subLabel={`${summary?.weeklyDistractionsChange || 0} this week`}
          colorClass="bg-red-500 text-red-500"
        />
        <StatCard
          icon={CheckCircle}
          title="Topics Completed"
          value={`${summary?.topicsCompleted || 0} / ${summary?.totalTopics || 0}`}
          subLabel={`${Math.round(((summary?.topicsCompleted || 0) / (summary?.totalTopics || 1)) * 100)}% Completed`}
          colorClass="bg-green-500 text-green-500"
          isProgress={true}
          progress={((summary?.topicsCompleted || 0) / (summary?.totalTopics || 1)) * 100}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <div className="bg-surface rounded-xl p-6 border border-card animate-fade-in flex flex-col h-full min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Weekly Study Hours</h3>
            <select className="bg-background border border-gray-800 text-xs text-gray-300 rounded px-2 py-1 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a3e" />
                <XAxis dataKey="day" stroke="#6b7280" tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" tickLine={false} axisLine={false} domain={[0, 'dataMax + 1']} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(124, 58, 237, 0.1)'}} />
                <Bar dataKey="hours" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="bg-surface rounded-xl p-6 border border-card animate-fade-in flex flex-col h-full min-h-[350px]" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Monthly Study Hours</h3>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-background border border-gray-800 text-xs text-gray-300 rounded px-2 py-1 outline-none cursor-pointer hover:border-primary transition-colors"
            >
              {months.map((month, idx) => {
                const isFuture = new Date(selectedYear, idx, 1) > new Date();
                return (
                  <option key={idx} value={idx} disabled={isFuture}>
                    {month} {isFuture ? "(Locked)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a3e" />
                <XAxis dataKey="week" stroke="#6b7280" tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#1a1a2e'}} />
                <Bar dataKey="hours" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="goal" stroke="#c4b5fd" strokeWidth={2} dot={{ fill: '#c4b5fd', r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Continue Learning */}
        <div className="flex flex-col gap-6 h-full">
          <div className="bg-surface rounded-xl p-6 border border-card animate-fade-in flex-1 overflow-y-auto max-h-[400px]" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-bold text-white mb-6 sticky top-0 bg-surface z-10 py-1">Continue Learning</h3>
            <div className="space-y-4">
              {roadmaps.length > 0 ? (
                roadmaps.map((rm) => (
                  <div key={rm.roadmapId} className="flex items-center gap-5 bg-background rounded-lg p-5 border border-gray-800 hover:border-primary/50 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                      <BookOpen className="w-6 h-6 text-primaryLight" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold mb-1 truncate max-w-[200px]">{rm.roadmapTitle}</h4>
                      <p className="text-sm text-gray-400 mb-3">Step {rm.currentStep} of {rm.totalSteps} - <span className="text-primaryLight">{rm.currentTopicTitle}</span></p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-surface h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${(rm.completedCount / (rm.totalSteps || 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-primaryLight">{Math.round((rm.completedCount / (rm.totalSteps || 1)) * 100)}%</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/roadmap/${rm.roadmapId}/topic/${rm.currentTopicId}`)}
                      className="bg-primary hover:bg-primaryLight text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                    >
                      Continue
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No active roadmaps found.</p>
                  <button onClick={() => navigate('/roadmaps')} className="text-primary text-xs font-bold mt-2 hover:underline">Create a Roadmap</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Roadmap', path: '/roadmaps', icon: BookOpen },
              { name: 'Notebook', path: '/notebook', icon: Notebook }
            ].map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => navigate(item.path)}
                className="bg-surface rounded-xl p-6 border border-card cursor-pointer hover:border-primary/50 transition-all group flex flex-col items-center text-center glow-card"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                  <item.icon className="w-6 h-6 text-primaryLight" />
                </div>
                <h4 className="text-white font-black text-sm mb-1">{item.name}</h4>
                <p className="text-xs text-gray-500">View your {item.name.toLowerCase()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-xl p-6 border border-card animate-fade-in flex flex-col h-[380px]" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <button 
              onClick={() => setShowAllActivities(!showAllActivities)}
              className="text-primaryLight text-xs hover:underline transition-all"
            >
              {showAllActivities ? "Show Less" : "View All"}
            </button>
          </div>
          <div className="flex-1 pr-2 space-y-4 custom-scrollbar overflow-y-auto">
            {activities.slice(0, showAllActivities ? activities.length : 10).map((act) => (
              <div key={act._id} className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-background transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${act.activityType === 'watched' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                    {act.activityType === 'watched' ? <PlayCircle className="w-5 h-5" /> : <Notebook className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    {act.videoUrl ? (
                      <a 
                        href={act.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm font-medium text-white mb-0.5 hover:text-primaryLight transition-colors block"
                      >
                        {act.title}
                      </a>
                    ) : (
                      <h4 className="text-sm font-medium text-white mb-0.5">{act.title}</h4>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">{act.description.split('. Focus Score:')[0]} • {new Date(act.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      {act.description.includes('Focus Score:') && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primaryLight border border-primary/20">
                          Score: {act.description.split('Focus Score: ')[1]}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
