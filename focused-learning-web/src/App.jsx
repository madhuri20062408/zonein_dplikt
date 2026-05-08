import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Home from './pages/Home';
import Analytics from './pages/Analytics';
import StudySessions from './pages/StudySessions';
import Login from './pages/Login';
import Register from './pages/Register';
import { fetchApi } from './api';
import { Lock, Zap, ArrowRight, ExternalLink } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const loadUser = async () => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromExtension = params.get("token");
    
    if (tokenFromExtension) {
      localStorage.setItem("token", tokenFromExtension);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const token = localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      try {
        const userData = await fetchApi('/auth/me');
        setUser(userData);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    } else {
      localStorage.removeItem("token");
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    // Real-time check for token (sync across tabs/extension actions)
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token || token === "undefined" || token === "null") {
        if (user) {
          console.log("Session lost, locking app...");
          setUser(null);
        }
      } else if (!user && token) {
        // If token appears, try to load user
        loadUser();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Strictly show the Auth screen if not logged in (unless on login/register routes)
  const AuthOverlay = () => (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primaryLight rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="bg-surface border border-card max-w-md w-full rounded-[2.5rem] p-12 shadow-2xl shadow-primary/20 relative z-10 animate-scale-in text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
          <Lock className="w-12 h-12 text-primaryLight" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Access Restricted</h1>
        <p className="text-gray-400 mb-10 leading-relaxed">
          ZoneIn is currently locked. Please log in to your account to access your personalized learning dashboard.
        </p>
        
        <div className="space-y-4">
          <Link 
            to="/login"
            className="w-full py-5 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-xl shadow-primary/40 text-lg"
          >
            Login on Web <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="p-6 bg-card/50 border border-white/5 rounded-2xl text-left">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Or use the extension:</h4>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-surface border border-card rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primaryLight" />
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Click the <span className="text-white font-bold">ZoneIn icon</span> in your toolbar to log in and sync automatically.
              </p>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-xs text-gray-600">
          Don't have an account? <Link to="/register" className="text-primary hover:underline font-bold">Register Now</Link>
        </p>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="flex h-screen bg-background overflow-hidden relative">
        <Routes>
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register setUser={setUser} /> : <Navigate to="/" />} />
          
          {/* Protected Routes */}
          <Route path="*" element={
            user ? (
              <div className="flex h-screen bg-background overflow-hidden relative w-full">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <TopBar user={user} />
                  <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <Routes>
                      <Route path="/" element={<Home user={user} />} />
                      <Route path="/analytics" element={<Analytics user={user} />} />
                      <Route path="/study-sessions" element={<StudySessions user={user} />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </main>
                </div>
              </div>
            ) : (
              <AuthOverlay />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
