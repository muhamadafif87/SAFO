import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  GetProductsQuery,
  CreateProductRequest,
} from '@/types';

export const productService = {
  /**
   * Ambil daftar produk flash sale aktif, diurutkan berdasarkan jarak dari lokasi customer.
   */
  getNearby: async (params: GetProductsQuery): Promise<PaginatedResponse<Product> | Product[]> => {
    const res = await api.get('/products/nearby', { params });
    return res.data; // Backend currently returns Product[] directly without PaginatedResponse wrapper
  },

  /**
   * Detail satu produk.
   */
  getById: async (id: string): Promise<Product> => {
    const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return res.data.data;
  },

  // ── Mitra endpoints ──────────────────────────────────────────────────

  /**
   * Buat produk flash sale baru (mitra only).
   */
  create: async (data: CreateProductRequest): Promise<Product> => {
    const res = await api.post<ApiResponse<Product>>('/products', data);
    return res.data.data;
  },

  /**
   * Update produk (mitra only).
   */
  update: async (id: string, data: Partial<CreateProductRequest>): Promise<Product> => {
    const res = await api.patch<ApiResponse<Product>>(`/products/${id}`, data);
    return res.data.data;
  },

  /**
   * Upload foto produk — multipart form.
   */
  uploadPhoto: async (id: string, uri: string): Promise<{ photoUrl: string }> => {
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: 'product.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    const res = await api.post<ApiResponse<{ photoUrl: string }>>(
      `/products/${id}/photo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },

  /**
   * Hapus produk (mitra only — hanya jika belum ada pesanan aktif).
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  /**
   * Daftar produk milik mitra yang sedang login.
   */
  getMitraProducts: async (): Promise<Product[]> => {
    const res = await api.get('/products/mitra/mine');
    return res.data;
  },
};
