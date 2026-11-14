import api from './api';
import type { MitraProfile } from '@/types';

export interface UpdateMitraProfilePayload {
  businessName?: string;
  category?: string;
  address?: string;
  phone?: string;
  photoUrl?: string;
}

export const mitraService = {
  getProfile: async (): Promise<MitraProfile> => {
    const res = await api.get('/mitra/profile');
    return res.data;
  },

  updateProfile: async (payload: UpdateMitraProfilePayload): Promise<MitraProfile> => {
    const res = await api.patch('/mitra/profile', payload);
    return res.data;
  },
};

