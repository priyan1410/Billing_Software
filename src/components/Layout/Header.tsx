import React, { useState, useEffect } from 'react';
import { Plus, Settings2, Database, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

export const Header: React.FC = () => {
  const { activeSection, setActiveSection, isDbConnected, checkDbStatus } = useAppStore();
  const { restaurantDetails } = useAuthStore();
  const [clock, setClock] = useState('');

  useEffect(() => {
    checkDbStatus();
    const intervalDb = setInterval(checkDbStatus, 10000);
    return () => clearInterval(intervalDb);
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, '0');

      setClock(`${day}/${month}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`);
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

  const headerIcon = restaurantDetails?.logoUrl || restaurantDetails?.softwareIconUrl;

  return (
    <header className="h-16 bg-olive-900 border-b border-gold-500/20 px-8 flex items-center justify-between select-none relative">
      <div className="flex items-center gap-3">
        {headerIcon && (
          <img
            src={headerIcon}
            alt="Logo"
            className="w-8 h-8 object-contain rounded-lg border border-gold-500/20 shadow-sm"
          />
        )}
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">{titles[activeSection] || 'Kish Mandhi'}</h2>
          <span className="text-xs text-olive-300 font-mono">{clock}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* MySQL Database Status Badge */}
        <button
          onClick={() => setActiveSection('db-settings')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            isDbConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 animate-pulse'
          }`}
          title={isDbConnected ? 'MySQL Connected' : 'MySQL Disconnected - Click to configure connection'}
        >
          {isDbConnected ? (
            <>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>MySQL Connected</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>MySQL Disconnected</span>
            </>
          )}
        </button>

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

