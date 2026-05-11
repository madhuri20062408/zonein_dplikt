import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, History, Save, Target, Download, Trash2, Lock, Smartphone, ChevronRight } from 'lucide-react';
import { fetchApi } from '../../api';

const PrivacySecurity = () => {
  const [settings, setSettings] = useState({
    activeTracking: true,
    watchHistoryTracking: true
  });
  const [loading, setLoading] = useState(true);
  const [savedStatus, setSavedStatus] = useState({ activeTracking: false, watchHistoryTracking: false });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetchApi('/privacy');
        if (data) setSettings(data);
      } catch (err) {
        console.error("Failed to load privacy settings", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleToggle = async (key) => {
    const newVal = !settings[key];
    const newSettings = { ...settings, [key]: newVal };
    setSettings(newSettings);
    try {
      await fetchApi('/privacy', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: newVal })
      });
      
      // Show saved indicator
      setSavedStatus(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSavedStatus(prev => ({ ...prev, [key]: false }));
      }, 2000);
      
    } catch (err) {
      console.error("Failed to update settings", err);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    try {
      const data = await fetchApi('/data/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `focuslearn_data_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export data: " + err.message);
    }
  };

  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear your watch history? This will reset all your video progress and remove them from your recent activity. This cannot be undone.")) {
      setIsClearing(true);
      try {
        await fetchApi('/data/clear-watch-history', { method: 'POST' });
        alert("Watch History Deleted! Your progress and activity logs have been cleared.");
      } catch (err) {
        alert("Failed to clear watch history: " + err.message);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleDeleteData = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      await fetchApi('/data/delete-all-data', { method: 'DELETE' });
      alert("All your data has been permanently deleted.");
      window.location.href = '/';
    } catch (err) {
      alert("Failed to delete data: " + err.message);
      setIsDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy & Security</h1>
        <p className="text-gray-400">Manage your privacy settings and data security.</p>
      </div>

      <div className="grid gap-6">
        {/* Data & Privacy Card */}
        <section className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primaryLight" />
            Data & Privacy
          </h2>

          <div className="space-y-4">
            {[
              { key: 'activeTracking', title: 'Active Tracking', desc: 'Allow tracking of your study activity', icon: Target },
              { key: 'watchHistoryTracking', title: 'Watch History Tracking', desc: 'Track watched videos for better insights', icon: History }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primaryLight" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{item.title}</h3>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {savedStatus[item.key] && (
                    <motion.span 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-green-400 text-xs font-bold"
                    >
                      Saved!
                    </motion.span>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings[item.key]}
                      onChange={() => handleToggle(item.key)}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-[0_0_10px_rgba(139,92,246,0.3)]"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Management Card */}
        <section className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primaryLight" />
            Data Management
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Download className="w-5 h-5 text-primaryLight" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Export My Data</h3>
                  <p className="text-xs text-gray-400">Download all your data and analytics</p>
                </div>
              </div>
              <button 
                onClick={handleExportData}
                className="px-6 py-2 border border-primary/30 text-primaryLight rounded-xl hover:bg-primary/10 transition-all font-medium text-sm"
              >
                Export
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-primaryLight" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Clear Watch History</h3>
                  <p className="text-xs text-gray-400">Clear all tracked watch history</p>
                </div>
              </div>
              <button 
                onClick={handleClearHistory}
                disabled={isClearing}
                className="px-6 py-2 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition-all font-medium text-sm disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Clear'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Delete All Data</h3>
                  <p className="text-xs text-gray-400">Permanently delete all your data</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </section>

        {/* Security section removed */}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            
            <h3 className="text-2xl font-bold text-white text-center mb-2">Delete All Data?</h3>
            <p className="text-gray-400 text-center mb-8">
              This will permanently wipe all your roadmaps, notes, and session history from our database. This action <span className="text-red-400 font-bold underline">cannot be undone</span>.
            </p>

            <div className="space-y-4">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Type <span className="text-white">DELETE</span> to confirm</p>
              <input 
                type="text" 
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all text-center font-mono"
              />
              
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-6 py-3 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition-all font-medium"
                >
                  Cancel
                </button>
                <button 
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  onClick={handleDeleteData}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                    deleteConfirmText === 'DELETE' && !isDeleting
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                      : 'bg-red-500/20 text-red-500/50 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? 'Deleting...' : 'Wipe Everything'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default PrivacySecurity;