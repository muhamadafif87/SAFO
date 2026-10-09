/**
 * addressService — Frontend service untuk CRUD Saved Addresses
 * Berkomunikasi dengan backend POST /api/addresses, GET, PATCH, DELETE
 */
import api from './api';
import type {
  SavedAddress,
  CreateAddressRequest,
  UpdateAddressRequest,
} from '@/types';

export const addressService = {
  /**
   * Ambil semua alamat tersimpan milik user yang sedang login.
   * Sertakan lat/lng agar server menghitung distanceKm per alamat.
   */
  getAll: async (lat?: number, lng?: number): Promise<SavedAddress[]> => {
    const params: Record<string, string> = {};
    if (lat !== undefined) params.lat = String(lat);
    if (lng !== undefined) params.lng = String(lng);

    const res = await api.get<SavedAddress[]>('/addresses', { params });
    return res.data;
  },

  /**
   * Simpan alamat baru.
   */
  create: async (data: CreateAddressRequest): Promise<SavedAddress> => {
    const res = await api.post<SavedAddress>('/addresses', data);
    return res.data;
  },

  /**
   * Update alamat (semua field opsional).
   */
  update: async (id: string, data: UpdateAddressRequest): Promise<SavedAddress> => {
    const res = await api.patch<SavedAddress>(`/addresses/${id}`, data);
    return res.data;
  },

  /**
   * Jadikan alamat ini sebagai alamat utama.
   * Server secara otomatis mereset isPrimary yang lain.
   */
  setPrimary: async (id: string): Promise<SavedAddress> => {
    const res = await api.patch<SavedAddress>(`/addresses/${id}/primary`, {});
    return res.data;
  },

  /**
   * Hapus alamat berdasarkan ID.
   */
  remove: async (id: string): Promise<void> => {
    await api.delete(`/addresses/${id}`);
  },
};
