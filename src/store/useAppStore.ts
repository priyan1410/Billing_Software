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
  activeTokensList: [
    {
      tokenNumber: 101,
      orderType: 'Dine-In',
      items: [
        { itemId: 1, name: 'Special Chicken Mandhi', variant: 'Full', quantity: 1 },
        { itemId: 8, name: 'Fresh Mint Lime Mojito', variant: 'Full', quantity: 2 }
      ],
      timestamp: new Date().toLocaleTimeString()
    },
    {
      tokenNumber: 102,
      orderType: 'Takeaway',
      items: [
        { itemId: 4, name: 'Peri Peri Alfaham', variant: 'Half', quantity: 1 }
      ],
      timestamp: new Date().toLocaleTimeString()
    }
  ],
  setActiveSection: (section: AppSection) => set({ activeSection: section }),
  addActiveToken: (token: TokenItem) =>
    set((state: AppState) => ({
      activeTokensList: [token, ...state.activeTokensList]
    })),
}));
