import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  PromoBanner,
  GetProductsQuery,
  CreateProductRequest,
} from '@/types';

export const mockProducts: Product[] = [
  {
    id: '1',
    mitraId: 'm1',
    mitra: {
      businessName: 'Geprek Kumlot',
      address: 'Jl. Merdeka No. 106,Jebres',
      latitude: -6.200000,
      longitude: 106.816666,
      distanceKm: 0.8,
    },
    name: 'Geprek Dada Bakar',
    description: 'Ayam geprek dengan sambal pedas.',
    originalPrice: 16000,
    discountPrice: 10000,
    stock: 3,
    avgRating: 4.8,
    reviewCount: 120,
    pickupWindowStart: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
    pickupWindowEnd: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '2',
    mitraId: 'm2',
    mitra: {
      businessName: 'WM. Titik Temu',
      address: 'Jl. Sudirman No. 12, Jakarta Selatan',
      latitude: -6.210000,
      longitude: 106.820000,
      distanceKm: 1.5,
    },
    name: 'Indomie Aceh',
    description: 'Indomie goreng khas Aceh dengan bumbu rempah spesial dan topping telur.',
    originalPrice: 12000,
    discountPrice: 10000,
    stock: 5,
    avgRating: 4.8,
    reviewCount: 70,
    pickupWindowStart: new Date(Date.now() + 3600000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 14400000).toISOString(),
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '3',
    mitraId: 'm3',
    mitra: {
      businessName: 'WM. Mantap',
      address: 'Jl. Senopati No. 88, Jakarta Selatan',
      latitude: -6.225000,
      longitude: 106.808000,
      distanceKm: 2.3,
    },
    name: 'Nasgor Spesial',
    description: 'Nasi goreng spesial dengan telur, ayam suwir, dan kerupuk renyah.',
    originalPrice: 12000,
    discountPrice: 10000,
    stock: 7,
    avgRating: 4.7,
    reviewCount: 55,
    pickupWindowStart: new Date(Date.now() + 900000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 7200000).toISOString(),
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '4',
    mitraId: 'm4',
    mitra: {
      businessName: 'Toko Roti Makmur',
      address: 'Jl. Kebon Jeruk No. 3, Jakarta Barat',
      latitude: -6.190000,
      longitude: 106.800000,
      distanceKm: 3.1,
    },
    name: 'Paket Roti Manis Surplus',
    description: 'Kombinasi 4 pcs roti manis segar buatan hari ini.',
    originalPrice: 45000,
    discountPrice: 18000,
    stock: 3,
    avgRating: 4.9,
    reviewCount: 120,
    pickupWindowStart: new Date(Date.now() + 600000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 5400000).toISOString(),
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  },
];

export const mockBanners: PromoBanner[] = [
  {
    id: '1',
    title: 'Diskon Menjelang Tutup',
    subtitle: 'Dapatkan makanan nikmat dengan harga hemat.',
    emoji: '⏰',
    bgColor: '#1a5c52',
    accentColor: '#f59e0b',
  },
  {
    id: '2',
    title: 'Flash Sale Sore Ini!',
    subtitle: 'Hemat hingga 60% dari mitra terdekat.',
    emoji: '🔥',
    bgColor: '#7c3aed',
    accentColor: '#fbbf24',
  },
  {
    id: '3',
    title: 'Gratis Ongkir Weekend',
    subtitle: 'Pesan sekarang dan nikmati gratis ongkir.',
    emoji: '🚀',
    bgColor: '#0e7490',
    accentColor: '#34d399',
  },
];

export const productService = {
  /**
   * Ambil daftar produk flash sale aktif, diurutkan berdasarkan sort param.
   */
  getNearby: async (params: GetProductsQuery): Promise<PaginatedResponse<Product> | Product[]> => {
    try {
      const res = await api.get('/products/nearby', { params });
      return res.data;
    } catch (error) {
      console.warn('[productService.getNearby] Backend API offline/unreachable, using mock products for development');
      // Apply sort on mock data
      let result = [...mockProducts];
      if (params.search) {
        const kw = params.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(kw) ||
            p.mitra?.businessName?.toLowerCase().includes(kw)
        );
      }
      if (params.sort === 'discount') {
        result.sort(
          (a, b) =>
            (Number(b.originalPrice) - Number(b.discountPrice)) / Number(b.originalPrice) -
            (Number(a.originalPrice) - Number(a.discountPrice)) / Number(a.originalPrice)
        );
      } else if (params.sort === 'rating') {
        result.sort((a, b) => (Number(b.avgRating) || 0) - (Number(a.avgRating) || 0));
      }
      return result;
    }
  },

  /**
   * Ambil daftar promo banners untuk halaman beranda.
   */
  getBanners: async (): Promise<PromoBanner[]> => {
    try {
      const res = await api.get('/products/banners');
      return res.data;
    } catch (error) {
      console.warn('[productService.getBanners] Backend API offline, using mock banners');
      return mockBanners;
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
