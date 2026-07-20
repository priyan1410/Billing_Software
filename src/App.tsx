import React from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { BillingView } from './components/Billing/BillingView';
import { TokensView } from './components/Tokens/TokensView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { RestaurantView } from './components/Restaurant/RestaurantView';
import { DbSettingsView } from './components/Database/DbSettingsView';
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
          {activeSection === 'db-settings' && <DbSettingsView />}
        </main>
      </div>
    </div>
  );
};
