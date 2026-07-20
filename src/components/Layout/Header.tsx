import React, { useState, useEffect } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Header: React.FC = () => {
  const { activeSection, setActiveSection } = useAppStore();
  const [clock, setClock] = useState('');

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
    'db-settings': 'Database Connection & Setup'
  };

  return (
    <header className="h-16 bg-olive-900 border-b border-gold-500/20 px-8 flex items-center justify-between select-none">
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide">{titles[activeSection] || 'Kish Mandhi'}</h2>
        <span className="text-xs text-olive-300 font-mono">{clock}</span>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => setActiveSection('billing')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 rounded-lg text-sm font-bold shadow-md shadow-gold-500/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-olive-800 border border-gold-500/40 rounded-full flex items-center justify-center text-gold-500">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">Cashier Desk #1</span>
            <span className="text-[10px] text-olive-300">Kish Mandhi Outlet</span>
          </div>
        </div>
      </div>
    </header>
  );
};
