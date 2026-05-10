import React, { useState, useEffect } from 'react';
import { 
  Notebook as NotebookIcon, Search, PlayCircle, 
  Trash2, ChevronDown, ChevronUp, Loader2, 
  Filter, Calendar, FileText, Tag
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchApi } from '../api';

const Notebook = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [filterType, setFilterType] = useState('all');

  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/notes');
      setNotes(res.notes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await fetchApi(`/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleExpand = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    }) + ' · ' + date.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const filteredNotes = filterType === 'all' 
    ? notes 
    : notes.filter(n => n.type === filterType);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Retrieving your archives...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Notebook</h1>
          <p className="text-gray-400">Your saved notes, summaries, and key takeaways.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Filter className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <select 
              className="bg-card border border-white/5 rounded-xl pl-11 pr-8 py-3 text-sm text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Notes</option>
              <option value="topic_notes">Topic Notes</option>
              <option value="manual_note">Manual Notes</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredNotes.map((note) => (
            <div key={note._id} className="bg-surface border border-card rounded-[2.5rem] p-8 flex flex-col glow-card group transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${
                  note.type === 'topic_notes' 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}>
                  {note.type?.replace('_', ' ')}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{formatDate(note.createdAt)}</span>
                </div>
              </div>

              {note.videoTitle && (
                <div className="flex items-center gap-2 mb-6 p-4 bg-card/50 rounded-2xl border border-white/5 group-hover:border-primary/20 transition-colors">
                  <PlayCircle className="w-4 h-4 text-primaryLight" />
                  <span className="text-xs font-bold text-white line-clamp-1">{note.videoTitle}</span>
                </div>
              )}

              <div className="flex-1 space-y-4">
                {expandedNotes[note._id] ? (
                  <div className="one-shot-notes animate-fade-in">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">
                    {note.content}
                  </p>
                )}

                {note.content.length > 200 && (
                  <button 
                    onClick={() => toggleExpand(note._id)}
                    className="text-xs font-bold text-primary hover:text-primaryLight transition-colors flex items-center gap-2"
                  >
                    {expandedNotes[note._id] ? (
                      <><ChevronUp className="w-4 h-4" /> Show Less</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Show More</>
                    )}
                  </button>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{note.content.split(' ').length} Words</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(note._id)}
                  className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-8 text-gray-700">
            <NotebookIcon className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-black text-white mb-3">Your notebook is empty</h3>
          <p className="text-gray-500 max-w-sm">Save notes from your learning topics to build your personal knowledge base here.</p>
        </div>
      )}
    </div>
  );
};

export default Notebook;
