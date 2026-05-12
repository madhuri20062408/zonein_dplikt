import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Pause, Check } from 'lucide-react';
import { io } from 'socket.io-client';
import { fetchApi } from '../api';

const socket = io('https://zonein-3.onrender.com/study-session');

const SessionModal = ({ isOpen, onClose, onSessionComplete }) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: Active, 3: Summary
  const [topic, setTopic] = useState('');
  const [subtopicInput, setSubtopicInput] = useState('');
  const [subtopics, setSubtopics] = useState([]);
  const [targetHours, setTargetHours] = useState('');
  const [targetMins, setTargetMins] = useState('');
  
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const timerRef = useRef(null);

  // If there's an active session in DB, we should ideally resume it
  // For simplicity, we just handle the flow here

  useEffect(() => {
    if (step === 2 && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newTime = prev + 1;
          if (activeSession) {
            socket.emit('session:tick', { session_id: activeSession._id, elapsed_seconds: newTime });
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step, isPaused, activeSession]);

  const handleAddSubtopic = (e) => {
    e.preventDefault();
    if (subtopicInput.trim()) {
      setSubtopics([...subtopics, { name: subtopicInput.trim(), isCompleted: false }]);
      setSubtopicInput('');
    }
  };

  const removeSubtopic = (index) => {
    setSubtopics(subtopics.filter((_, i) => i !== index));
  };

  const startSession = async () => {
    if (!topic) return;
    
    const targetDuration = (parseInt(targetHours || 0) * 3600) + (parseInt(targetMins || 0) * 60);
    
    try {
      await fetchApi('/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ goal: topic, subtopics, targetDuration })
      });
      onSessionComplete(); // Tell StudySessions to fetch active session
      onClose(); // Hide modal immediately
    } catch (err) {
      alert("Failed to start session: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface border border-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Start Study Session</h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Main Topic</label>
              <input 
                type="text" 
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="What are you studying?" 
                className="w-full bg-background border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Subtopics (Optional)</label>
              <form onSubmit={handleAddSubtopic} className="flex gap-2">
                <input 
                  type="text" 
                  value={subtopicInput}
                  onChange={e => setSubtopicInput(e.target.value)}
                  placeholder="Add a subtopic" 
                  className="flex-1 bg-background border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                />
                <button type="submit" className="bg-primary/20 text-primaryLight hover:bg-primary/30 px-4 rounded-lg text-sm font-medium transition-colors border border-primary/30">
                  Add
                </button>
              </form>
              <div className="flex flex-wrap gap-2 mt-3">
                {subtopics.map((st, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-card border border-gray-800 text-gray-300 px-3 py-1.5 rounded-full text-xs">
                    {st.name}
                    <button onClick={() => removeSubtopic(i)} className="text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Target Duration (Optional)</label>
              <div className="flex gap-4">
                <input type="number" min="0" placeholder="Hours" value={targetHours} onChange={e => setTargetHours(e.target.value)} className="w-1/2 bg-background border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm" />
                <input type="number" min="0" max="59" placeholder="Minutes" value={targetMins} onChange={e => setTargetMins(e.target.value)} className="w-1/2 bg-background border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm" />
              </div>
            </div>

            <button 
              onClick={startSession}
              disabled={!topic}
              className="w-full bg-primary hover:bg-primaryLight disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-primary/20 mt-4"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;
