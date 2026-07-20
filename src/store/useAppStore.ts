import { create } from 'zustand';
import { TokenItem } from '../types';

export type AppSection = 'dashboard' | 'billing' | 'tokens' | 'expenses' | 'restaurant' | 'db-settings';

interface AppState {
  activeSection: AppSection;
  activeTokensList: TokenItem[];
  setActiveSection: (section: AppSection) => void;
  addActiveToken: (token: TokenItem) => void;
}

export const useAppStore = create<AppState>((set: any) => ({
  activeSection: 'dashboard',
  activeTokensList: [],
  setActiveSection: (section: AppSection) => set({ activeSection: section }),
  addActiveToken: (token: TokenItem) =>
    set((state: AppState) => ({
      activeTokensList: [token, ...state.activeTokensList]
    })),
}));
