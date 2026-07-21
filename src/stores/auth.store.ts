import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AuthState, User, MitraProfile, AuthTokens } from '@/types';

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
    await SecureStore.setItemAsync(TOKEN_KEY_ACCESS, tokens.accessToken);
    await SecureStore.setItemAsync(TOKEN_KEY_REFRESH, tokens.refreshToken);
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
    await SecureStore.deleteItemAsync(TOKEN_KEY_ACCESS);
    await SecureStore.deleteItemAsync(TOKEN_KEY_REFRESH);
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
      const accessToken = await SecureStore.getItemAsync(TOKEN_KEY_ACCESS);
      const refreshToken = await SecureStore.getItemAsync(TOKEN_KEY_REFRESH);

      if (!accessToken || !refreshToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Tokens exist — validate via API (done in _layout.tsx via api.me())
      set({ accessToken, refreshToken });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  updateMitra: (mitra) => set({ mitra }),
}));
