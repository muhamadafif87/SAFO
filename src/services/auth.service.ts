import api from './api';
import type {
  LoginRequest,
  RegisterCustomerRequest,
  RegisterMitraRequest,
  AuthResponse,
  ApiResponse,
  User,
  MitraProfile,
} from '@/types';

// ── Auth Endpoints ────────────────────────────────────────────────────────

export const authService = {
  /**
   * Login dengan email + password.
   * Returns user info, role, tokens, dan mitra profile (jika role=mitra).
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  /**
   * Register customer baru.
   */
  registerCustomer: async (data: RegisterCustomerRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register/customer', data);
    return res.data;
  },

  /**
   * Register mitra baru (dokumen diupload terpisah via /mitra/documents).
   */
  registerMitra: async (data: RegisterMitraRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register/mitra', data);
    return res.data;
  },

  /**
   * Ambil info user yang sedang login (validasi token).
   */
  me: async (): Promise<{ user: User; mitra?: MitraProfile }> => {
    const res = await api.get<{ user: User; mitra?: MitraProfile }>('/auth/me');
    return res.data;
  },

  /**
   * Logout — invalidate refresh token di server.
   */
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};
