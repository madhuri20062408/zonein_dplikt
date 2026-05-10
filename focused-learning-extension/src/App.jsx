import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Welcome from './components/Welcome';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import VerifyEmail from './components/VerifyEmail';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('welcome'); 
  const storageCheckedRef = React.useRef(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['authUser', 'token', 'currentView'], (result) => {
        storageCheckedRef.current = true;
        if (result.token) setToken(result.token);
        if (result.authUser) setUser(result.authUser);
        if (result.currentView && !result.authUser) setView(result.currentView);
        
        // Ensure loading is resolved so we can show the appropriate screen (Dashboard, Syncing, or Login)
        setLoading(false);
      });
    } else {
      storageCheckedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (changes) => {
        if (changes.token) setToken(changes.token.newValue);
        if (changes.authUser) {
          setUser(changes.authUser.newValue);
          if (changes.authUser.newValue) setLoading(false);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Extension: Auth listener triggered. Firebase User =", firebaseUser ? firebaseUser.email : "null");
      
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);

        if (!firebaseUser.emailVerified && firebaseUser.providerData[0].providerId === 'password') {
          setView('verify');
          setLoading(false);
          return;
        }

        try {
          const response = await fetch("http://localhost:5000/api/auth/sync", {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          if (response.ok) {
            const mongoUser = await response.json();
            setUser(mongoUser);
            if (typeof chrome !== 'undefined' && chrome.storage) {
              chrome.storage.local.set({ token: idToken, authUser: mongoUser, customToken: mongoUser.customToken });
            }
          }
        } catch (err) {
          console.error("Extension: Auth sync error:", err);
          // If sync fails but we have cached user, use it
          const result = await chrome.storage.local.get(['authUser']);
          if (result.authUser) {
            setUser(result.authUser);
          }
          setLoading(false);
        }
      } else {
        console.log("Extension: Firebase user is null. Verifying storage fallback...");
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['authUser', 'token']);
          if (result.token) {
            setToken(result.token);
            if (result.authUser) {
              setUser(result.authUser);
              setLoading(false);
              return;
            }
          }
        }
        
        if (storageCheckedRef.current && !token) {
          console.log("Extension: No session found. Switching to welcome view.");
          setUser(null);
          setToken(null);
          if (view !== 'login' && view !== 'register') setView('welcome');
          setLoading(false);
        }
      }
      
      if (storageCheckedRef.current && (user || !token)) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const screenVariants = {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div className="w-full h-full overflow-hidden bg-background text-[13px]">
      <AnimatePresence mode="wait">
        {user ? (
          <motion.div key="dashboard" {...screenVariants} className="w-full h-full">
            <Dashboard user={user} setUser={setUser} />
          </motion.div>
        ) : token ? (
          <motion.div key="syncing" {...screenVariants} className="w-full h-full flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-xs animate-pulse font-medium">Syncing profile...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="logged-out" {...screenVariants} className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-background">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
              <img src="/icons/logo.png" className="w-12 h-12" alt="Logo" />
            </div>
            <h1 className="text-2xl font-black text-white mb-4 tracking-tight">ZoneIn Locked</h1>
            <p className="text-gray-400 mb-10 leading-relaxed text-xs">
              Please log in to your account on the web to access your personalized learning dashboard here.
            </p>
            <button 
              onClick={() => window.open('http://localhost:5173', '_blank')}
              className="w-full py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/40 text-xs"
            >
              Login on Website
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
