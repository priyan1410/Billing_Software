import React from 'react';
import { Crown, PieChart, Receipt, Ticket, Wallet, Store, Database } from 'lucide-react';
import { useAppStore, AppSection } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection } = useAppStore();

  const navItems: { id: AppSection; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <PieChart className="w-5 h-5" /> },
    { id: 'billing', label: 'Billing POS', icon: <Receipt className="w-5 h-5" /> },
    { id: 'tokens', label: 'Tokens', icon: <Ticket className="w-5 h-5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Wallet className="w-5 h-5" /> },
    { id: 'restaurant', label: 'Restaurant', icon: <Store className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-olive-900 border-r border-gold-500/20 flex flex-col justify-between p-4 z-10 select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-gold-500/20">
          <div className="w-11 h-11 bg-gradient-to-br from-gold-500 to-gold-dark rounded-xl flex items-center justify-center text-olive-950 font-bold shadow-lg shadow-gold-500/20">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-gold-500 tracking-wide">KISH MANDHI</h1>
            <span className="text-xs text-olive-300 uppercase tracking-widest font-medium">Arabic Grill & Dining</span>
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="mt-6 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-semibold shadow-md shadow-gold-500/20'
                    : 'text-olive-300 hover:text-white hover:bg-olive-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Database Status */}
      <div className="pt-4 border-t border-gold-500/20">
        <button
          onClick={() => setActiveSection('db-settings')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium bg-olive-800/60 border border-gold-500/20 hover:border-gold-500/40 transition-colors ${
            activeSection === 'db-settings' ? 'text-gold-400 border-gold-500' : 'text-olive-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gold-500" />
            <span>SQLite Active</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
        </button>
      </div>
    </aside>
  );
};
