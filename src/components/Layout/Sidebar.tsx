import React, { useState, useEffect } from 'react';
import { Crown, PieChart, Receipt, Ticket, Wallet, Store, Database, CalendarClock } from 'lucide-react';
import { useAppStore, AppSection } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection } = useAppStore();
  const { restaurantDetails } = useAuthStore();
  const [dbSize, setDbSize] = useState<string>('');

  useEffect(() => {
    const fetchStorageSize = async () => {
      try {
        if ((window as any).electronAPI?.getStorageSize) {
          const res = await (window as any).electronAPI.getStorageSize();
          if (res && res.formatted) {
            setDbSize(res.formatted);
          }
        }
      } catch (err) {
        console.error('Failed to fetch DB storage size:', err);
      }
    };

    fetchStorageSize();
    const interval = setInterval(fetchStorageSize, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: AppSection; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <PieChart className="w-5 h-5" /> },
    { id: 'billing', label: 'Billing POS', icon: <Receipt className="w-5 h-5" /> },
    { id: 'preorders', label: 'Pre-Orders', icon: <CalendarClock className="w-5 h-5" /> },
    { id: 'tokens', label: 'Tokens', icon: <Ticket className="w-5 h-5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Wallet className="w-5 h-5" /> },
    { id: 'restaurant', label: 'Restaurant', icon: <Store className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-olive-900 border-r border-gold-500/20 flex flex-col justify-between p-4 z-10 select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-gold-500/20">
          <div className="w-11 h-11 bg-gradient-to-br from-gold-500 to-gold-dark rounded-xl flex items-center justify-center text-olive-950 font-bold shadow-lg shadow-gold-500/20 overflow-hidden shrink-0">
            {restaurantDetails?.softwareIconUrl || restaurantDetails?.logoUrl ? (
              <img
                src={restaurantDetails.softwareIconUrl || restaurantDetails.logoUrl}
                alt="App Icon"
                className="w-full h-full object-cover"
              />
            ) : (
              <Crown className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-base font-bold text-gold-500 tracking-wide truncate">
              {restaurantDetails?.companyName || 'Restaurant'}
            </h1>
            <span className="text-[10px] text-olive-300 uppercase tracking-widest font-medium truncate block">
              {restaurantDetails?.tagline || ''}
            </span>
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
        {restaurantDetails?.gstNumber && (
          <div className="mb-3 px-3 py-2 bg-amber-500/8 rounded-lg border border-amber-500/15">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-widest font-semibold">GSTIN</p>
            <p className="text-[11px] text-amber-300/80 font-mono mt-0.5">{restaurantDetails.gstNumber}</p>
          </div>
        )}
        <button
          onClick={() => setActiveSection('db-settings')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium bg-olive-800/60 border border-gold-500/20 hover:border-gold-500/40 transition-colors ${
            activeSection === 'db-settings' ? 'text-gold-400 border-gold-500' : 'text-olive-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gold-500 shrink-0" />
            <div className="flex flex-col text-left leading-tight">
              <span>MySQL Active</span>
              {dbSize && <span className="text-[10px] font-mono font-bold text-gold-400">{dbSize}</span>}
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 shrink-0"></span>
        </button>
      </div>
    </aside>
  );
};
