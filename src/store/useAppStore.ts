import { create } from 'zustand';
import { TokenItem } from '../types';

export type AppSection = 'dashboard' | 'billing' | 'tokens' | 'expenses' | 'restaurant' | 'db-settings' | 'settings';

interface AppState {
  activeSection: AppSection;
  activeTokensList: TokenItem[];
  setActiveSection: (section: AppSection) => void;
  setTokensList: (tokens: TokenItem[]) => void;
  addActiveToken: (token: TokenItem) => void;
  removeActiveToken: (tokenNumber: string | number) => void;
  loadActiveTokens: () => Promise<void>;
}

export const useAppStore = create<AppState>((set: any) => ({
  activeSection: 'dashboard',
  activeTokensList: [],
  setActiveSection: (section: AppSection) => set({ activeSection: section }),
  setTokensList: (activeTokensList: TokenItem[]) => set({ activeTokensList }),
  addActiveToken: (token: TokenItem) => {
    set((state: AppState) => ({
      activeTokensList: [token, ...state.activeTokensList.filter(t => String(t.tokenNumber) !== String(token.tokenNumber))]
    }));
    if ((window as any).electronAPI?.saveToken) {
      (window as any).electronAPI.saveToken(token);
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
  }
}));
