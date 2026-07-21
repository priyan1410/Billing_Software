import React, { useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { BillingView } from './components/Billing/BillingView';
import { TokensView } from './components/Tokens/TokensView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { RestaurantView } from './components/Restaurant/RestaurantView';
import { DbSettingsView } from './components/Database/DbSettingsView';
import { RestaurantSettingsView } from './components/Settings/RestaurantSettingsView';
import { AuthModal } from './components/Auth/AuthModal';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';

export const App: React.FC = () => {
  const { activeSection } = useAppStore();
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
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
        <main className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'billing' && <BillingView />}
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
