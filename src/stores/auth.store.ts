import { create } from 'zustand';
import { storage } from '@/utils/storage';
import type { AuthState, User, MitraProfile, AuthTokens } from '@/types';
import { api } from '@/services/api';
import { authService } from '@/services/auth.service';
import { useCartStore } from '@/stores/cart.store';
import { useLocationStore } from '@/stores/location.store';

const TOKEN_KEY_ACCESS = 'safo_access_token';
const TOKEN_KEY_REFRESH = 'safo_refresh_token';

interface AuthActions {
  setAuth: (user: User, tokens: AuthTokens, mitra?: MitraProfile) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  restoreSession: () => Promise<void>;
  updateMitra: (mitra: MitraProfile) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // ── State ──────────────────────────────────────────────────────────────
  user: null,
  mitra: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  // ── Actions ───────────────────────────────────────────────────────────

  setAuth: async (user, tokens, mitra) => {
    await storage.setItemAsync(TOKEN_KEY_ACCESS, tokens.accessToken);
    await storage.setItemAsync(TOKEN_KEY_REFRESH, tokens.refreshToken);
    set({
      user,
      mitra: mitra ?? null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearAuth: async () => {
    try {
      const refreshToken = await storage.getItemAsync(TOKEN_KEY_REFRESH);
      await authService.logout(refreshToken);
    } catch (e) {
      console.warn('[authStore] Backend logout failed or offline, wiping local session:', e);
    }

    await storage.deleteItemAsync(TOKEN_KEY_ACCESS);
    await storage.deleteItemAsync(TOKEN_KEY_REFRESH);

    try {
      useCartStore.getState().clearCart();
    } catch {}

    try {
      await useLocationStore.getState().clearLocation();
      useLocationStore.setState({ savedAddresses: [] });
    } catch {}

    set({
      user: null,
      mitra: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  restoreSession: async () => {
    try {
      set({ isLoading: true });
      const accessToken = await storage.getItemAsync(TOKEN_KEY_ACCESS);
      const refreshToken = await storage.getItemAsync(TOKEN_KEY_REFRESH);

      if (!accessToken || !refreshToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Tokens exist — validate via API
      const { data } = await api.get('/auth/me');
      set({ 
        user: data.user, 
        mitra: data.mitra || null,
        accessToken, 
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // If validation fails, clear tokens
      await storage.deleteItemAsync(TOKEN_KEY_ACCESS);
      await storage.deleteItemAsync(TOKEN_KEY_REFRESH);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  updateMitra: (mitra) => set({ mitra }),
}));
