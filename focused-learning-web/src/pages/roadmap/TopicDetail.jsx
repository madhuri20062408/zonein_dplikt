import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, CheckCircle, PlayCircle, Loader2, 
  BookOpen, Edit3, Award, Send, RefreshCw, 
  ExternalLink, FileText, Check, AlertTriangle, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchApi } from '../../api';

const TopicDetail = () => {
  const { roadmapId, topicId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States for interactive features
  const [notesState, setNotesState] = useState("");
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [showNotebookSaved, setShowNotebookSaved] = useState(false);
  
  // YouTube tracking
  const playerRef = useRef(null);
  const trackingIntervalRef = useRef(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetchApi(`/roadmap-web/${roadmapId}/topic/${topicId}`);
      setData(res);
      setNotesState(res.notes || "");
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, [roadmapId, topicId]);

  // YouTube IFrame API Setup
  useEffect(() => {
    if (!data?.primaryVideo) return;

    const onPlayerReady = (event) => {
      console.log("Player Ready");
    };

    const onPlayerStateChange = (event) => {
      if (event.data === window.YT.PlayerState.PLAYING) {
        startTracking();
      } else {
        stopTracking();
      }
    };

    const startTracking = () => {
      if (trackingIntervalRef.current) return;
      trackingIntervalRef.current = setInterval(async () => {
        if (playerRef.current && playerRef.current.getDuration) {
          try {
            const res = await fetchApi(`/roadmap-web/${roadmapId}/topic/${topicId}/video-watch`, {
              method: 'POST',
              body: JSON.stringify({
                videoId: data.primaryVideo.videoId,
                videoTitle: data.primaryVideo.videoTitle,
                watchSeconds: 5,
                totalSeconds: playerRef.current.getDuration()
              })
            });
            setData(prev => ({
              ...prev,
              watchPercentage: res.watchPercentage,
              engagementScore: res.engagementScore
            }));
          } catch (err) {
            console.error("Tracking failed", err);
          }
        }
      }, 5000);
    };

    const stopTracking = () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        playerRef.current = new window.YT.Player('yt-player', {
          videoId: data.primaryVideo.videoId,
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        });
      };
    } else {
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: data.primaryVideo.videoId,
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    }

    return () => {
      stopTracking();
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [data?.primaryVideo]);

  const toggleComplete = async () => {
    try {
      const res = await fetchApi(`/roadmap-web/${roadmapId}/topic/${topicId}/complete`, { method: 'PATCH' });
      setData(prev => ({ ...prev, isCompleted: res.isCompleted }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateNotes = async () => {
    try {
      setGeneratingNotes(true);
      const res = await fetchApi(`/roadmap-web/${roadmapId}/topic/${topicId}/generate-notes`, { method: 'POST' });
      setData(prev => ({ ...prev, notes: res.notes, notesSource: res.notesSource }));
      setNotesState(res.notes);
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingNotes(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      // 1. Save to Roadmap Progress
      await fetchApi(`/roadmap-web/${roadmapId}/topic/${topicId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notesState })
      });

      // 2. Also Save/Sync with Notebook
      await fetchApi('/notes', {
        method: 'POST',
        body: JSON.stringify({
          content: notesState,
          roadmapId,
          topicId,
          videoId: data?.primaryVideo?.videoId,
          videoTitle: data?.primaryVideo?.videoTitle,
          type: "topic_notes"
        })
      });

      setShowSaved(true);
      setTimeout(() => {
        setShowSaved(false);
        navigate('/notebook');
      }, 1000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      setGeneratingQuiz(true);
      const res = await fetchApi(`/roadmap-web/${roadmapId}/topic/${topicId}/generate-quiz`, { method: 'POST' });
      setData(prev => ({ ...prev, quizQuestions: res.quizQuestions }));
      setQuizResults(null);
      setSelectedAnswers({});
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    const answersArray = Object.keys(selectedAnswers).sort().map(k => selectedAnswers[k]);
    
    try {
      setSubmittingQuiz(true);
      const res = await fetchApi(`/roadmap-web/${roadmapId}/topic/${topicId}/submit-quiz`, {
        method: 'POST',
        body: JSON.stringify({ answers: answersArray })
      });
      
      // Update local data manually instead of a full refresh to prevent rendering glitches
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          quizScore: res.score,
          engagementScore: res.engagementScore,
          isCompleted: res.engagementScore >= 80 ? true : prev.isCompleted
        };
      });
      
      // Set results to show the results view
      setQuizResults(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizResults(null);
    setSelectedAnswers({});
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <BookOpen className="w-6 h-6 text-primary absolute inset-0 m-auto" />
        </div>
        <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">Synchronizing Topic Data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center max-w-md mx-auto animate-fade-in">
        <div className="w-24 h-24 bg-red-500/10 rounded-[3rem] flex items-center justify-center glow-card border border-red-500/20">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white">Connection Lost</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={() => loadData()}
          className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-red-500/30"
        >
          Try Again
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fade-in">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Preparing Topic Details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <button onClick={() => navigate(`/roadmap/${roadmapId}`)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Back to Roadmap</span>
          </button>
          <h1 className="text-3xl font-black text-white">Topic: {data.topicTitle}</h1>
        </div>
        <button 
          onClick={toggleComplete}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${
            data.isCompleted ? 'bg-green-500 text-white' : 'bg-primary hover:bg-primaryDark text-white shadow-primary/30'
          }`}
        >
          {data.isCompleted ? <><CheckCircle className="w-5 h-5" /> Completed</> : "Mark as Completed"}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel 1: Learning Section */}
        <div className="bg-surface border border-card rounded-[2.5rem] p-8 space-y-8 glow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-black text-white">1. Learning Section</h2>
          </div>

          <div className="relative">
            {data.primaryVideo ? (
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/5" id="yt-player"></div>
            ) : (
              <div className="w-full aspect-video bg-card/50 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <PlayCircle className="w-8 h-8 text-primary" />
                </div>
                <p className="text-white font-bold mb-2">No video tracked yet</p>
                <a 
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.topicTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-bold flex items-center gap-2 mb-4"
                >
                  Search YouTube for: {data.topicTitle} <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">
                  Watch a video on YouTube while the ZoneIn extension is active — it will automatically track your watch time and the video will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Engagement Overview</h3>
            <div className="space-y-4">
              {[
                { label: 'Watch Percentage', val: data.watchPercentage, color: 'bg-blue-500' },
                { label: 'Active Time', val: data.activeTimePercent, color: 'bg-orange-500' },
                { label: 'Quiz Score', val: data.quizScore, color: 'bg-green-500' },
                { label: 'Engagement Score', val: data.engagementScore, color: 'bg-primary' }
              ].map(bar => (
                <div key={bar.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-400 uppercase tracking-wider">{bar.label}</span>
                    <span className="text-white">{bar.val}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} transition-all duration-1000`} style={{ width: `${bar.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Summary */}
        <div className="bg-surface border border-card rounded-[2.5rem] p-8 flex flex-col glow-card">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-500" />
              </div>
              <h2 className="text-xl font-black text-white">2. Study Notes</h2>
            </div>
            <button 
              onClick={handleGenerateNotes}
              disabled={generatingNotes}
              className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              {generatingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Generate Notes
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
            {generatingNotes ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-gray-500 animate-pulse">Analyzing content...</p>
              </div>
            ) : data.notes ? (
              <div className="one-shot-notes">
                <ReactMarkdown>{data.notes}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-card rounded-3xl flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm max-w-[200px]">Click Generate Notes to create AI-powered study guides for this topic.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Notes Editor */}
        <div className="bg-surface border border-card rounded-[2.5rem] p-8 flex flex-col glow-card">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-black text-white">3. Notes</h2>
          </div>

          <textarea 
            className="flex-1 w-full bg-[#0f1117] border border-white/5 rounded-2xl p-6 text-sm text-gray-300 focus:outline-none focus:border-primary/30 transition-all resize-none min-h-[300px]"
            value={notesState}
            onChange={(e) => setNotesState(e.target.value)}
            placeholder="Capture your thoughts, formulas, and key takeaways here..."
          ></textarea>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showSaved && <span className="text-xs font-bold text-green-500 flex items-center gap-1 animate-fade-in"><Check className="w-3 h-3" /> Saved!</span>}
              <button 
                onClick={handleSaveNotes}
                className="px-8 py-3 bg-primary hover:bg-primaryDark text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Panel 4: Quiz */}
        <div className="bg-surface border border-card rounded-[2.5rem] p-8 flex flex-col glow-card">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-xl font-black text-white">4. Quiz</h2>
            </div>
            {!quizResults && data.quizQuestions?.length > 0 && (
              <button 
                onClick={handleGenerateQuiz}
                disabled={generatingQuiz}
                className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-500/20 rounded-xl text-xs font-bold transition-all"
              >
                Reset Quiz
              </button>
            )}
            {(!data.quizQuestions || data.quizQuestions.length === 0) && (
              <button 
                onClick={handleGenerateQuiz}
                disabled={generatingQuiz || !data.notes}
                className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {generatingQuiz ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Generate Quiz
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
            {generatingQuiz ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                  <Award className="w-6 h-6 text-orange-500 absolute inset-0 m-auto" />
                </div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Drafting Questions...</p>
              </div>
            ) : submittingQuiz ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center animate-fade-in">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                  <Award className="w-8 h-8 text-primary absolute inset-0 m-auto animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white">Evaluating Quiz...</h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Analyzing your answers and <br/> syncing your focus profile</p>
              </div>
            ) : quizResults ? (
              <div className="space-y-8 animate-fade-in">
                <div className={`p-8 rounded-[2rem] border text-center ${
                  (quizResults?.score || 0) >= 80 ? 'bg-green-500/10 border-green-500/20' : 
                  (quizResults?.score || 0) >= 50 ? 'bg-orange-500/10 border-orange-500/20' : 
                  'bg-red-500/10 border-red-500/20'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Quiz Results</p>
                  <h3 className={`text-4xl font-black mb-2 ${
                    (quizResults?.score || 0) >= 80 ? 'text-green-500' : 
                    (quizResults?.score || 0) >= 50 ? 'text-orange-500' : 
                    'text-red-500'
                  }`}>{quizResults?.score || 0}%</h3>
                  <p className="text-sm font-bold text-gray-400">
                    Correct Answers: {quizResults?.correctAnswers || 0} / {quizResults?.totalQuestions || 0}
                  </p>
                </div>

                <div className="space-y-6">
                  {data?.quizQuestions?.map((q, qIndex) => (
                    <div key={qIndex} className="p-6 bg-card/30 rounded-2xl border border-white/5">
                      <p className="text-sm font-bold text-white mb-4">Q{qIndex + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 gap-2">
                        {q?.options?.map((opt, oIndex) => {
                          const isCorrect = oIndex === q.correctIndex;
                          const isSelected = selectedAnswers[qIndex] === oIndex;
                          let style = "bg-card border-white/5 text-gray-500";
                          if (isCorrect) style = "bg-green-500/20 border-green-500/40 text-green-500";
                          else if (isSelected && !isCorrect) style = "bg-red-500/20 border-red-500/40 text-red-500";
                          
                          return (
                            <div key={oIndex} className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between ${style}`}>
                              {opt}
                              {isCorrect && <CheckCircle className="w-4 h-4" />}
                              {isSelected && !isCorrect && <X className="w-4 h-4" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleRetakeQuiz}
                  className="w-full py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Retake Quiz
                </button>
              </div>
            ) : data.quizQuestions?.length > 0 ? (
              <div className="space-y-8 animate-fade-in">
                {data.quizQuestions.map((q, qIndex) => (
                  <div key={qIndex} className="space-y-4">
                    <p className="text-sm font-bold text-white">Q{qIndex + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 gap-3">
                      {q.options.map((opt, oIndex) => (
                        <button 
                          key={oIndex}
                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIndex]: oIndex }))}
                          className={`
                            w-full p-4 rounded-xl border text-left text-xs font-bold transition-all
                            ${selectedAnswers[qIndex] === oIndex 
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' 
                              : 'bg-card border-white/5 text-gray-500 hover:border-white/20'}
                          `}
                        >
                          <span className="mr-3 opacity-50">{String.fromCharCode(65 + oIndex)}.</span> {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button 
                  disabled={Object.keys(selectedAnswers).length < data.quizQuestions.length || submittingQuiz}
                  onClick={handleSubmitQuiz}
                  className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-30 text-white font-black rounded-2xl transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-2"
                >
                  {submittingQuiz ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Quiz
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-card rounded-3xl flex items-center justify-center mb-6">
                  <Award className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm max-w-[200px]">
                  {data.notes ? "Click Generate Quiz to create questions based on your notes." : "Generate notes first to unlock the quiz."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetail;
