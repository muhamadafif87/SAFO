import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  GetProductsQuery,
  CreateProductRequest,
} from '@/types';

export const mockProducts: Product[] = [
  {
    id: '1',
    mitraId: 'm1',
    mitra: {
      businessName: 'Toko Roti Makmur',
      address: 'Jl. Merdeka No. 45, Jakarta Pusat',
      latitude: -6.200000,
      longitude: 106.816666,
      distanceKm: 0.8,
    },
    name: 'Paket Roti Manis Surplus',
    description: 'Kombinasi 4 pcs roti manis (Cokelat, Keju, Daging, Srikaya) segar buatan hari ini.',
    originalPrice: 45000,
    discountPrice: 18000,
    stock: 5,
    pickupWindowStart: new Date(Date.now() + 1800000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 10800000).toISOString(),
    status: 'active',
  },
  {
    id: '2',
    mitraId: 'm2',
    mitra: {
      businessName: 'Dapur Bento Nusantara',
      address: 'Jl. Sudirman No. 12, Jakarta Selatan',
      latitude: -6.210000,
      longitude: 106.820000,
      distanceKm: 1.5,
    },
    name: 'Bento Chicken Teriyaki',
    description: 'Paket bento nasi dengan chicken teriyaki dan salad segar.',
    originalPrice: 35000,
    discountPrice: 15000,
    stock: 3,
    pickupWindowStart: new Date(Date.now() + 3600000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 14400000).toISOString(),
    status: 'active',
  },
  {
    id: '3',
    mitraId: 'm3',
    mitra: {
      businessName: 'Kopi & Pastry Artisan',
      address: 'Jl. Senopati No. 88, Jakarta Selatan',
      latitude: -6.225000,
      longitude: 106.808000,
      distanceKm: 2.3,
    },
    name: 'Butter Croissant & Danish Box',
    description: 'Box isi 3 pastry Prancis mentega asli, krispi dan lezat.',
    originalPrice: 60000,
    discountPrice: 24000,
    stock: 4,
    pickupWindowStart: new Date(Date.now() + 900000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 7200000).toISOString(),
    status: 'active',
  },
];

export const productService = {
  /**
   * Ambil daftar produk flash sale aktif, diurutkan berdasarkan jarak dari lokasi customer.
   */
  getNearby: async (params: GetProductsQuery): Promise<PaginatedResponse<Product> | Product[]> => {
    try {
      const res = await api.get('/products/nearby', { params });
      return res.data;
    } catch (error) {
      console.warn('[productService.getNearby] Backend API offline/unreachable, using mock products for development');
      return mockProducts;
    }
  },

  /**
   * Detail satu produk.
   */
  getById: async (id: string): Promise<Product> => {
    try {
      const res = await api.get<Product>(`/products/${id}`);
      return res.data;
    } catch (error) {
      console.warn(`[productService.getById] Backend API offline/unreachable for id=${id}, using mock product`);
      return mockProducts.find((p) => p.id === id) || mockProducts[0];
    }
  },

  // ── Mitra endpoints ──────────────────────────────────────────────────

  /**
   * Buat produk flash sale baru (mitra only).
   */
  create: async (data: CreateProductRequest): Promise<Product> => {
    try {
      const res = await api.post<Product>('/products', data);
      return res.data;
    } catch (error) {
      console.warn('[productService.create] Backend API offline, returning mock created product');
      const newProd: Product = {
        id: `mock-p-${Date.now()}`,
        mitraId: 'm1',
        name: data.name,
        description: data.description,
        originalPrice: data.originalPrice,
        discountPrice: data.discountPrice,
        stock: data.stock,
        pickupWindowStart: data.pickupWindowStart,
        pickupWindowEnd: data.pickupWindowEnd,
        status: 'active',
      };
      mockProducts.unshift(newProd);
      return newProd;
    }
  },

  /**
   * Update produk (mitra only).
   */
  update: async (id: string, data: Partial<CreateProductRequest>): Promise<Product> => {
    try {
      const res = await api.patch<Product>(`/products/${id}`, data);
      return res.data;
    } catch (error) {
      console.warn(`[productService.update] Backend API offline for id=${id}`);
      const prod = mockProducts.find((p) => p.id === id) || mockProducts[0];
      return { ...prod, ...data };
    }
  },

  /**
   * Upload foto produk — multipart form.
   */
  uploadPhoto: async (id: string, uri: string): Promise<{ photoUrl: string }> => {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri,
        name: 'product.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      const res = await api.post<{ photoUrl: string }>(
        `/products/${id}/photo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return res.data;
    } catch (error) {
      return { photoUrl: uri };
    }
  },

  /**
   * Hapus produk (mitra only — hanya jika belum ada pesanan aktif).
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/products/${id}`);
    } catch (error) {
      console.warn(`[productService.delete] Backend API offline for id=${id}`);
    }
  },

  /**
   * Daftar produk milik mitra yang sedang login.
   */
  getMitraProducts: async (): Promise<Product[]> => {
    try {
      const res = await api.get('/products/mitra/mine');
      return res.data;
    } catch (error) {
      console.warn('[productService.getMitraProducts] Backend API offline, returning mock products');
      return mockProducts;
    }
  },
};
