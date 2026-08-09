import React, { useEffect } from 'react';
import { AlertTriangle, Settings } from 'lucide-react';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { BillingView } from './components/Billing/BillingView';
import { PreOrdersView } from './components/PreOrders/PreOrdersView';
import { TokensView } from './components/Tokens/TokensView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { RestaurantView } from './components/Restaurant/RestaurantView';
import { DbSettingsView } from './components/Database/DbSettingsView';
import { RestaurantSettingsView } from './components/Settings/RestaurantSettingsView';
import { AuthModal } from './components/Auth/AuthModal';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';

export const App: React.FC = () => {
  const { activeSection, setActiveSection, loadActiveTokens, isDbConnected, dbErrorMessage, checkDbStatus } = useAppStore();
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
    loadActiveTokens();
    checkDbStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen bg-[#060810] items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-amber-400/60 text-sm font-medium tracking-widest uppercase">Loading Kish Mandhi...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen w-screen bg-olive-950 text-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        {/* Persistent MySQL Disconnected Warning Banner */}
        {isDbConnected === false && (
          <div className="bg-gradient-to-r from-rose-900/90 to-red-950/90 border-b border-rose-500/40 px-6 py-2.5 flex items-center justify-between text-xs text-rose-200 select-none shadow-lg z-20 shrink-0">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-extrabold text-rose-100 uppercase tracking-wide">MySQL Database Not Connected: </span>
                <span className="text-rose-200 font-medium">
                  {dbErrorMessage || 'All sales & records require a live MySQL database. Please start your MySQL service or update credentials.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveSection('db-settings')}
              className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-extrabold rounded-lg shadow transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" /> Configure & Reconnect MySQL
            </button>
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'billing' && <BillingView />}
          {activeSection === 'preorders' && <PreOrdersView />}
          {activeSection === 'tokens' && <TokensView />}
          {activeSection === 'expenses' && <ExpensesView />}
          {activeSection === 'restaurant' && <RestaurantView />}
          {activeSection === 'db-settings' && <DbSettingsView />}
          {activeSection === 'settings' && <RestaurantSettingsView />}
        </main>
      </div>
    </div>
  );
};

