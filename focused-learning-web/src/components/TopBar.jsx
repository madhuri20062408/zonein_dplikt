import React from 'react';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const TopBar = ({ user }) => {
  const location = useLocation();
  const isSessions = location.pathname.startsWith('/study-sessions');
  const isHome = location.pathname === '/';
  
  const title = isSessions ? "Study Sessions" : "Dashboard";
  const firstName = user?.name?.split(' ')[0] || 'Learner';
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  };
  
  const subtitle = isSessions 
    ? "Track your study sessions and maintain consistency."
    : `${getGreeting()}, ${firstName}! Stay consistent and achieve your goals.`;

  return (
    <header className="h-20 bg-background border-b border-card px-8 flex items-center justify-between z-10 sticky top-0">
      {!isHome ? (
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Welcome back, {firstName}!
          </h2>
          <p className="text-sm text-gray-400 mt-1">Ready for another productive session?</p>
        </div>
      )}

      <div className="flex items-center gap-6">


        {/* Notifications removed */}

        <div className="h-8 w-px bg-gray-800 mx-2"></div>

        <div className="flex items-center gap-3 cursor-pointer hover:bg-card px-3 py-1.5 rounded-lg transition-colors">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-white leading-tight">{user?.name || "User"}</span>
            {isSessions && <span className="text-xs text-primaryLight font-medium">Pro Learner</span>}
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primaryLight p-0.5">
            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center overflow-hidden border-2 border-background">
              <span className="text-white font-bold text-sm">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default TopBar;
