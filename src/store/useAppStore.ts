import { create } from 'zustand';
import { TokenItem } from '../types';

export type AppSection = 'dashboard' | 'billing' | 'tokens' | 'expenses' | 'restaurant' | 'db-settings' | 'settings';

interface AppState {
  activeSection: AppSection;
  activeTokensList: TokenItem[];
  isDbConnected: boolean | null;
  dbErrorMessage: string | null;
  showDbConfigModal: boolean;
  setActiveSection: (section: AppSection) => void;
  setTokensList: (tokens: TokenItem[]) => void;
  addActiveToken: (token: TokenItem) => void;
  removeActiveToken: (tokenNumber: string | number) => void;
  loadActiveTokens: () => Promise<void>;
  checkDbStatus: () => Promise<boolean>;
  setShowDbConfigModal: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set: any, get: any) => ({
  activeSection: 'dashboard',
  activeTokensList: [],
  isDbConnected: null,
  dbErrorMessage: null,
  showDbConfigModal: false,
  setActiveSection: (section: AppSection) => set({ activeSection: section }),
  setShowDbConfigModal: (show: boolean) => set({ showDbConfigModal: show }),
  setTokensList: (activeTokensList: TokenItem[]) => set({ activeTokensList }),
  addActiveToken: async (token: TokenItem) => {
    set((state: AppState) => ({
      activeTokensList: [token, ...state.activeTokensList.filter(t => String(t.tokenNumber) !== String(token.tokenNumber))]
    }));
    if ((window as any).electronAPI?.saveToken) {
      try {
        await (window as any).electronAPI.saveToken(token);
      } catch (err) {
        console.error('Error saving token to DB:', err);
      }
    }
  },
  removeActiveToken: (tokenNumber: string | number) => {
    set((state: AppState) => ({
      activeTokensList: state.activeTokensList.filter(t => String(t.tokenNumber) !== String(tokenNumber))
    }));
    if ((window as any).electronAPI?.deleteToken) {
      (window as any).electronAPI.deleteToken(tokenNumber);
    }
  },
  loadActiveTokens: async () => {
    try {
      if ((window as any).electronAPI?.getActiveTokens) {
        const res = await (window as any).electronAPI.getActiveTokens();
        if (res && res.success && Array.isArray(res.data)) {
          set({ activeTokensList: res.data });
        }
      }
    } catch (err) {
      console.error('loadActiveTokens error:', err);
    }
  },
  checkDbStatus: async () => {
    try {
      if ((window as any).electronAPI?.testDbConnection) {
        const res = await (window as any).electronAPI.testDbConnection();
        const connected = !!(res && res.success);
        set({
          isDbConnected: connected,
          dbErrorMessage: connected ? null : (res?.message || res?.error || 'MySQL database is disconnected.')
        });
        return connected;
      }
      set({ isDbConnected: false, dbErrorMessage: 'Electron API not available.' });
      return false;
    } catch (err: any) {
      set({ isDbConnected: false, dbErrorMessage: err.message || 'Database connection error' });
      return false;
    }
  }
}));

