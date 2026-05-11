import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Palette, Bell, Shield, Zap } from 'lucide-react';
import AccountSettings from './settings/AccountSettings';
import AppearanceSettings from './settings/AppearanceSettings';
import NotificationSettings from './settings/NotificationSettings';
import PrivacySecurity from './settings/PrivacySecurity';

const tabs = [
  { id: 'account',       label: 'Account',       icon: User,    component: AccountSettings },
  { id: 'appearance',    label: 'Appearance',     icon: Palette, component: AppearanceSettings },
  { id: 'privacy',       label: 'Privacy',        icon: Shield,  component: PrivacySecurity },
];

export default function Settings({ user, setUser }) {
  const [activeTab, setActiveTab] = useState('account');
  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component;

  return (
    <div className="flex gap-8 h-full">

      {/* LEFT SIDEBAR — Tab navigation */}
      <div className="w-56 flex-shrink-0">
        <h2 className="text-xs font-bold text-gray-500 uppercase
                       tracking-widest mb-4 px-3">Settings</h2>
        <nav className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5
                          rounded-xl text-sm font-medium transition-all
                          ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'text-gray-400 hover:text-white hover:bg-card'
                          }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* RIGHT CONTENT — Active tab */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {ActiveComponent && (
              <ActiveComponent user={user} setUser={setUser} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
