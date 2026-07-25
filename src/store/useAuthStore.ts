import { create } from 'zustand';
import { User, RestaurantDetails } from '../types';

export const defaultRestaurant: RestaurantDetails = {
  companyName: '',
  tagline: '',
  ownerName: '',
  gstNumber: '',
  fssaiNumber: '',
  phone: '',
  email: '',
  address: '',
  taxRate: 0.0,
  currency: '₹',
  totalTables: 10,
  headerNote: '',
  footerNote: '',
  logoUrl: '',
  softwareIconUrl: '',
  printShowLogo: true,
  printShowAddress: true,
  printShowPhone: true,
  printShowGst: true,
  printShowHeaderNote: true,
  printShowTime: true,
  printShowTaxBreakdown: true,
  printShowRoundOff: true,
  printShowFooterNote: true,
  printWithToken: true
};

export const syncAppIcon = (iconUrl?: string) => {
  if (!iconUrl) return;
  if ((window as any).electronAPI?.updateWindowIcon) {
    (window as any).electronAPI.updateWindowIcon(iconUrl);
  }
  try {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconUrl;
  } catch (e) {
    // Ignore DOM errors if rendering headless
  }
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  restaurantDetails: RestaurantDetails;
  isLoading: boolean;
  error: string | null;
  hasExistingUsers: boolean; // false on fresh install → auto-show register

  initializeAuth: () => Promise<void>;
  login: (emailOrPhone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (
    userData: { name: string; email: string; phone?: string; password: string },
    restaurantData: Partial<RestaurantDetails>
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateRestaurantDetails: (data: Partial<RestaurantDetails>) => Promise<{ success: boolean; message?: string }>;
  loadRestaurantDetails: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  restaurantDetails: defaultRestaurant,
  isLoading: true,
  error: null,
  hasExistingUsers: true, // assume true by default, set false if DB has no users

  clearError: () => set({ error: null }),

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const api = (window as any).electronAPI;

      if (api) {
        // ── ELECTRON (MySQL) MODE ──────────────────────────────
        // 1. Check if any users are registered in the DB
        const hasUsersRes = await api.hasUsers();
        const dbHasUsers = hasUsersRes?.success && hasUsersRes.hasUsers;

        if (!dbHasUsers) {
          // No users in DB → clear any stale local session, force registration
          localStorage.removeItem('km_user');
          const restRes = await api.getRestaurantDetails();
          const currentRest = (restRes?.success && restRes.data)
            ? { ...defaultRestaurant, ...restRes.data }
            : defaultRestaurant;
          set({ user: null, isAuthenticated: false, hasExistingUsers: false, restaurantDetails: currentRest, isLoading: false });
          return;
        }

        // 2. Try to restore a previously saved session
        const savedUser = localStorage.getItem('km_user');
        let currentUser: User | null = null;

        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            // 3. Verify the saved user ID still exists in the DB
            const verifyRes = await api.verifyUser(parsed.id);
            if (verifyRes?.success && verifyRes.valid && verifyRes.user) {
              currentUser = verifyRes.user; // use fresh data from DB
              localStorage.setItem('km_user', JSON.stringify(currentUser));
            } else {
              // User no longer exists in DB → clear stale session
              localStorage.removeItem('km_user');
            }
          } catch {
            localStorage.removeItem('km_user');
          }
        }

        // 4. Load restaurant details from DB
        const restRes = await api.getRestaurantDetails();
        const currentRest = (restRes?.success && restRes.data)
          ? { ...defaultRestaurant, ...restRes.data }
          : defaultRestaurant;

        localStorage.setItem('km_restaurant', JSON.stringify(currentRest));
        syncAppIcon(currentRest.softwareIconUrl);
        set({ user: currentUser, isAuthenticated: !!currentUser, hasExistingUsers: true, restaurantDetails: currentRest, isLoading: false });

      } else {
        // ── WEB / BROWSER (LocalStorage) FALLBACK MODE ────────
        const savedUser = localStorage.getItem('km_user');
        const savedRest = localStorage.getItem('km_restaurant');

        const storedUsers: any[] = JSON.parse(localStorage.getItem('km_registered_users') || '[]');
        let currentUser: User | null = null;

        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          // Verify user still exists in localStorage registry
          const exists = storedUsers.find((u: any) => u.id === parsed.id);
          if (exists) {
            currentUser = { id: parsed.id, name: parsed.name, email: parsed.email, phone: parsed.phone, role: parsed.role };
          } else {
            localStorage.removeItem('km_user');
          }
        }

        const currentRest: RestaurantDetails = savedRest ? JSON.parse(savedRest) : defaultRestaurant;

        // If no registered users at all, force registration screen
        if (storedUsers.length === 0) {
          set({ user: null, isAuthenticated: false, hasExistingUsers: false, restaurantDetails: currentRest, isLoading: false });
          return;
        }

        set({ user: currentUser, isAuthenticated: !!currentUser, hasExistingUsers: true, restaurantDetails: currentRest, isLoading: false });
      }
    } catch (err: any) {
      console.error('initializeAuth error:', err);
      localStorage.removeItem('km_user');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },


  login: async (emailOrPhone: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.login(emailOrPhone, password);
        if (res && res.success && res.user) {
          const rest = res.restaurantDetails
            ? { ...defaultRestaurant, ...res.restaurantDetails }
            : get().restaurantDetails;

          localStorage.setItem('km_user', JSON.stringify(res.user));
          localStorage.setItem('km_restaurant', JSON.stringify(rest));

          set({
            user: res.user,
            isAuthenticated: true,
            hasExistingUsers: true,
            restaurantDetails: rest,
            isLoading: false,
            error: null
          });
          return { success: true };
        } else {
          const msg = res?.message || 'Invalid credentials';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }
      } else {
        // Fallback Web Mode Login
        const storedUsersStr = localStorage.getItem('km_registered_users');
        const users: any[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

        const cleanInput = emailOrPhone.trim().toLowerCase();
        const found = users.find(
          (u) =>
            (u.email && u.email.toLowerCase() === cleanInput) ||
            (u.phone && u.phone === emailOrPhone.trim())
        );

        if (!found) {
          const msg = 'User not found. Please register first.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }

        if (found.password !== password) {
          const msg = 'Incorrect password.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }

        const userObj: User = {
          id: found.id || 1,
          name: found.name,
          email: found.email,
          phone: found.phone,
          role: found.role || 'admin'
        };

        const storedRestStr = localStorage.getItem('km_restaurant');
        const rest: RestaurantDetails = storedRestStr ? JSON.parse(storedRestStr) : defaultRestaurant;

        localStorage.setItem('km_user', JSON.stringify(userObj));
        set({
          user: userObj,
          isAuthenticated: true,
          hasExistingUsers: true,
          restaurantDetails: rest,
          isLoading: false,
          error: null
        });
        return { success: true };
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      set({ isLoading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  register: async (userData, restaurantData) => {
    set({ isLoading: true, error: null });
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.register(userData, restaurantData);
        if (res && res.success && res.user) {
          const rest = res.restaurantDetails
            ? { ...defaultRestaurant, ...res.restaurantDetails }
            : { ...defaultRestaurant, ...restaurantData };

          localStorage.setItem('km_user', JSON.stringify(res.user));
          localStorage.setItem('km_restaurant', JSON.stringify(rest));

          set({
            user: res.user,
            isAuthenticated: true,
            hasExistingUsers: true,
            restaurantDetails: rest,
            isLoading: false,
            error: null
          });
          return { success: true };
        } else {
          const msg = res?.message || 'Registration failed';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }
      } else {
        // Fallback Web Mode Registration
        const storedUsersStr = localStorage.getItem('km_registered_users');
        const users: any[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

        const cleanEmail = userData.email.trim().toLowerCase();
        if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          const msg = 'User with this email already exists.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }

        const newUser = {
          id: Date.now(),
          name: userData.name.trim(),
          email: cleanEmail,
          phone: userData.phone || '',
          password: userData.password,
          role: 'admin'
        };

        users.push(newUser);
        localStorage.setItem('km_registered_users', JSON.stringify(users));

        const newRestDetails: RestaurantDetails = {
          companyName: restaurantData.companyName || '',
          tagline: restaurantData.tagline || '',
          ownerName: restaurantData.ownerName || userData.name,
          gstNumber: restaurantData.gstNumber || '',
          fssaiNumber: restaurantData.fssaiNumber || '',
          phone: restaurantData.phone || userData.phone || '',
          email: restaurantData.email || userData.email || '',
          address: restaurantData.address || '',
          taxRate: Number(restaurantData.taxRate ?? 5.0),
          currency: restaurantData.currency || '₹',
          headerNote: restaurantData.headerNote || '',
          footerNote: restaurantData.footerNote || ''
        };

        localStorage.setItem('km_user', JSON.stringify(newUser));
        localStorage.setItem('km_restaurant', JSON.stringify(newRestDetails));

        set({
          user: newUser,
          isAuthenticated: true,
          hasExistingUsers: true,
          restaurantDetails: newRestDetails,
          isLoading: false,
          error: null
        });
        return { success: true };
      }
    } catch (err: any) {
      const msg = err.message || 'Registration error';
      set({ isLoading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('km_user');
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  updateRestaurantDetails: async (data) => {
    set({ isLoading: true });
    try {
      const updatedRest: RestaurantDetails = {
        ...get().restaurantDetails,
        ...data
      };

      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.saveRestaurantDetails(updatedRest);
        if (res && res.success === false) {
          set({ isLoading: false });
          return { success: false, message: res.message || res.error || 'Failed to save to database' };
        }
      }

      localStorage.setItem('km_restaurant', JSON.stringify(updatedRest));
      syncAppIcon(updatedRest.softwareIconUrl);
      set({ restaurantDetails: updatedRest, isLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, message: err.message || 'Failed to save details' };
    }
  },

  loadRestaurantDetails: async () => {
    try {
      if ((window as any).electronAPI?.getRestaurantDetails) {
        const res = await (window as any).electronAPI.getRestaurantDetails();
        if (res && res.success && res.data) {
          const rest = { ...defaultRestaurant, ...res.data };
          localStorage.setItem('km_restaurant', JSON.stringify(rest));
          syncAppIcon(rest.softwareIconUrl);
          set({ restaurantDetails: rest });
        }
      }
    } catch (err) {
      console.error('loadRestaurantDetails error:', err);
    }
  }
}));
