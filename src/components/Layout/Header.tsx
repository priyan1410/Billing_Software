import React, { useState, useEffect } from 'react';
import { Plus, Settings2, LogOut, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

export const Header: React.FC = () => {
  const { activeSection, setActiveSection } = useAppStore();
  const { user, restaurantDetails, logout } = useAuthStore();
  const [clock, setClock] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const titles: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    billing: 'Billing POS & Receipts',
    tokens: 'Token Generator & Printer',
    expenses: 'Expense Tracker & Daily Ledger',
    restaurant: 'Restaurant Hub & Financial Analysis',
    'db-settings': 'Database Connection & Setup',
    settings: 'Restaurant Settings & Configuration'
  };

  const handleLogout = () => {
    setShowMenu(false);
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <header className="h-16 bg-olive-900 border-b border-gold-500/20 px-8 flex items-center justify-between select-none relative">
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide">{titles[activeSection] || 'Kish Mandhi'}</h2>
        <span className="text-xs text-olive-300 font-mono">{clock}</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveSection('billing')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 rounded-lg text-sm font-bold shadow-md shadow-gold-500/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </button>

        <button
          onClick={() => setActiveSection('settings')}
          className={`p-2 rounded-lg transition-colors ${
            activeSection === 'settings'
              ? 'bg-gold-500/20 text-gold-400'
              : 'text-olive-300 hover:text-white hover:bg-olive-800'
          }`}
          title="Restaurant Settings"
        >
          <Settings2 className="w-5 h-5" />
        </button>

      </div>
    </header>
  );
};
