import api from './api';
import type { ApiResponse, MitraProfile, User } from '@/types';

export interface AdminDashboardStats {
  totalMitra: number;
  pendingMitra: number;
  totalTransactions: number;
  completedTransactions: number;
  totalPlatformRevenue: number;
}

export const adminService = {
  /**
   * Mengambil statistik dashboard admin
   */
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const res = await api.get<AdminDashboardStats>('/admin/dashboard');
    return res.data;
  },

  /**
   * Mengambil daftar mitra yang statusnya pending verification
   */
  getPendingMitra: async (): Promise<MitraProfile[]> => {
    const res = await api.get<MitraProfile[]>('/admin/mitra/pending');
    return res.data;
  },

  /**
   * Melakukan verifikasi (approve/reject) pada pendaftaran mitra
   */
  verifyMitra: async (id: string, action: 'approve' | 'reject'): Promise<MitraProfile> => {
    const res = await api.patch<MitraProfile>(`/admin/mitra/${id}/verify`, { action });
    return res.data;
  },

  /**
   * Suspend akun pengguna (customer/mitra)
   */
  suspendUser: async (id: string): Promise<{ message: string }> => {
    const res = await api.patch<{ message: string }>(`/admin/users/${id}/suspend`);
    return res.data;
  },
};
