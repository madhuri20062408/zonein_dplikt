import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, Star, Loader2 } from 'lucide-react';
import { fetchApi } from '../../api';

const RoadmapDetail = () => {
  const { roadmapId } = useParams();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRoadmap = async () => {
      try {
        setLoading(true);
        const data = await fetchApi(`/roadmap-web/${roadmapId}`);
        setRoadmap(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadRoadmap();
  }, [roadmapId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Roadmap Detail...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-[2rem] text-center">
        <p className="font-bold text-lg mb-2">Failed to load roadmap</p>
        <p className="text-sm opacity-80">{error}</p>
        <button 
          onClick={() => navigate('/roadmaps')}
          className="mt-6 px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <header className="space-y-6">
        <button 
          onClick={() => navigate('/roadmaps')}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Back to Roadmaps</span>
        </button>
        
        <div>
          <h1 className="text-4xl font-black text-white mb-2">{roadmap.goal}</h1>
          <p className="text-gray-400">Learning roadmap for {roadmap.goal}</p>
        </div>

        <div className="bg-surface border border-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Overall Progress</p>
            <p className="text-sm font-black text-white">
              <span className="text-primary">{roadmap.completedTopics}</span> / {roadmap.totalTopics} Topics
            </p>
          </div>
          <div className="relative">
            <div className="w-full h-3 bg-card rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 shadow-[0_0_15px_rgba(124,58,237,0.5)]" 
                style={{ width: `${roadmap.progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{roadmap.progressPercent}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {roadmap.topics.map((topic, index) => (
          <div 
            key={topic._id}
            onClick={() => navigate(`/roadmap/${roadmapId}/topic/${topic._id}`)}
            className={`
              bg-surface border border-card rounded-2xl p-6 flex items-center gap-6 cursor-pointer
              transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 group
              ${topic.isCompleted ? 'border-l-4 border-l-green-500 shadow-lg shadow-green-500/5' : 'glow-card'}
            `}
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-black text-lg
              ${topic.isCompleted ? 'bg-primary text-white' : 'bg-card text-gray-600'}
            `}>
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-bold mb-1 truncate ${topic.isCompleted ? 'text-white/60 line-through' : 'text-white'}`}>
                {topic.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-1">{topic.description}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {topic.isCompleted ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Completed</span>
                </div>
              ) : topic.engagementScore > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Score: {topic.engagementScore}%</span>
                </div>
              ) : null}
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoadmapDetail;
