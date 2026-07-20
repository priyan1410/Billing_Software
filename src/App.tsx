import React from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { BillingView } from './components/Billing/BillingView';
import { TokensView } from './components/Tokens/TokensView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { RestaurantView } from './components/Restaurant/RestaurantView';
import { useAppStore } from './store/useAppStore';

export const App: React.FC = () => {
  const { activeSection } = useAppStore();

  return (
    <div className="flex h-screen w-screen bg-olive-950 text-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'billing' && <BillingView />}
          {activeSection === 'tokens' && <TokensView />}
          {activeSection === 'expenses' && <ExpensesView />}
          {activeSection === 'restaurant' && <RestaurantView />}
          {activeSection === 'db-settings' && (
            <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-6 space-y-4 max-w-xl">
              <h3 className="text-base font-bold text-gold-500">Embedded SQLite Database Manager</h3>
              <p className="text-xs text-olive-300">
                Kish Mandhi desktop app is powered by embedded SQLite database with zero installation required! All database files are stored locally in your Application Data folder.
              </p>
              <div className="p-3 bg-olive-800 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                ✓ Local SQLite Database Initialized & Connected
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
