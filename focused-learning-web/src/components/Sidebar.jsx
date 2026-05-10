import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, BarChart2, CheckCircle, User, Settings, LogOut, Mail, Info, Clock, Notebook as NotebookIcon, ShieldAlert, Home } from 'lucide-react';
import { useState, useEffect } from 'react';

const EXTENSION_ID = "YOUR_EXTENSION_ID"; // The user will need to update this or we can find it

const Sidebar = () => {
  const location = useLocation();
  const [isFocusMode, setIsFocusMode] = useState(true);

  useEffect(() => {
    console.log("ZoneIn Sidebar v2.1 Active");
  }, []);

  // Sync with extension if available
  useEffect(() => {
    if (window.chrome && window.chrome.runtime) {
      // In a real app, we'd use a specific Extension ID if externally_connectable is set
      // For local dev, we can also use messages if the extension injected a content script
    }
  }, []);

  const handleToggleFocus = () => {
    const newState = !isFocusMode;
    setIsFocusMode(newState);
    
    // Attempt to communicate with extension
    if (window.chrome && window.chrome.runtime) {
      try {
        // This requires the extension to be externally_connectable or a content script to be present
        window.postMessage({ type: "ZONEIN_TOGGLE_FOCUS", isFocusMode: newState }, "*");
      } catch (e) {
        console.error("Failed to send message to extension", e);
      }
    }
  };

  const navItems = [
    { items: [
      { name: "Home", path: "/", icon: Home },
    ]},
    { section: "LEARNING", items: [
      { name: "Roadmap", path: "/roadmaps", icon: BookOpen },
      { name: "Notebook", path: "/notebook", icon: NotebookIcon },
    ]},
    { section: "ANALYTICS", items: [
      { name: "Learning Analytics", path: "/analytics", icon: BarChart2 },
      { name: "Study Sessions", path: "/study-sessions", icon: Clock },
    ]},
    { section: "ACCOUNT", items: [
      { name: "Profile", path: "/profile", icon: User },
      { name: "Settings", path: "#", icon: Settings },
      { name: "Contact Us", path: "#", icon: Mail },
      { name: "Sign Out", path: "#", icon: LogOut },
    ]}
  ];

  const handleLogout = (e) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to sign out?")) {
      console.log("Logging out...");
      
      // Notify extension
      window.postMessage({ type: "ZONEIN_LOGOUT" }, "*");

      localStorage.removeItem("token");
      sessionStorage.clear();
      window.location.href = "/"; 
    }
  };

  return (
    <div className="w-64 bg-surface border-r border-card flex flex-col justify-between">
      <div className="p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primaryLight flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">Z</span>
            ZoneIn
          </h1>
          <p className="text-xs text-gray-400 mt-1 pl-10">AI-Powered Learning</p>
        </div>

        {navItems.map((group, idx) => (
          <div key={idx} className="mb-6">
            {group.section && <h3 className="text-xs font-semibold text-gray-500 mb-3 px-3 uppercase tracking-wider">{group.section}</h3>}
            <ul className="space-y-1">
              {group.items.map((item, itemIdx) => {
                if (item.name === "Sign Out") {
                  return (
                    <li key={itemIdx}>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-red-500/10 transition-colors group"
                      >
                        <item.icon className="w-4 h-4 group-hover:text-red-400" />
                        <span className="group-hover:text-red-400">Sign Out</span>
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={itemIdx}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive && item.path !== '#'
                            ? 'bg-primary text-white font-medium shadow-md shadow-primary/20'
                            : 'text-gray-400 hover:text-white hover:bg-card'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-6">
        <div className="bg-card rounded-xl p-4 border border-gray-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:bg-primary/20 transition-colors"></div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Extension Active</span>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isFocusMode ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-primaryLight" />
            {isFocusMode ? "You're in Focus Mode!" : "Focus Mode is OFF"}
          </p>
          <button 
            onClick={handleToggleFocus}
            className={`w-full py-2 border text-xs font-medium rounded-lg transition-colors ${
              isFocusMode 
                ? "border-primary text-primaryLight hover:bg-primary/10" 
                : "border-gray-600 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {isFocusMode ? "Toggle Off" : "Toggle On"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
