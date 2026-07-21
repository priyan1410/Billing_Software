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

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-olive-800 border border-gold-500/20 rounded-xl hover:border-gold-500/40 transition-colors"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-olive-300 leading-tight truncate max-w-[100px]">
                {restaurantDetails?.companyName || 'Kish Mandhi'}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-olive-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-olive-900 border border-gold-500/20 rounded-xl shadow-xl shadow-black/40 z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-gold-500/10">
                  <p className="text-sm font-semibold text-white">{user?.name || user?.username}</p>
                  <p className="text-xs text-olive-300 truncate">{user?.email || (user?.username ? `@${user.username}` : '')}</p>
                  {restaurantDetails?.gstNumber && (
                    <p className="text-[10px] text-amber-400/60 font-mono mt-0.5">GST: {restaurantDetails.gstNumber}</p>
                  )}
                </div>
                <button
                  onClick={() => { setShowMenu(false); setActiveSection('settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-olive-300 hover:text-white hover:bg-olive-800 transition-colors"
                >
                  <Settings2 className="w-4 h-4 text-amber-400" />
                  Restaurant Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-gold-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
