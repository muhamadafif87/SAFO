import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatus,
} from '@/types';

export const orderService = {
  /**
   * Buat pesanan baru + inisiasi pembayaran.
   * Backend akan: lock stok di Redis → insert order → buat payment mock → return snapToken.
   */
  create: async (data: CreateOrderRequest): Promise<Order> => {
    const res = await api.post('/orders', data);
    return res.data;
  },

  /**
   * Detail pesanan (includes QR/pickup code).
   */
  getById: async (id: string): Promise<Order> => {
    const res = await api.get(`/orders/${id}`);
    return res.data;
  },

  /**
   * Riwayat pesanan customer yang sedang login.
   */
  getMyOrders: async (): Promise<Order[]> => {
    const res = await api.get('/orders/mine');
    return res.data;
  },

  /**
   * Daftar pesanan masuk ke mitra.
   */
  getMitraOrders: async (): Promise<Order[]> => {
    const res = await api.get('/orders/mitra');
    return res.data;
  },

  /**
   * Update status pesanan (mitra: paid→ready→completed / admin: cancel, refund).
   */
  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const res = await api.patch(`/orders/${id}/status`, { status });
    return res.data;
  },

  /**
   * Verifikasi pickup kode (mitra scan QR atau ketik 4-digit code).
   */
  verifyPickup: async (orderId: string, pickupCode: string): Promise<Order> => {
    const res = await api.post(`/orders/${orderId}/verify-pickup`, {
      pickupCode,
    });
    return res.data;
  },

  /**
   * Customer batalkan pesanan (only allowed if status=pending_payment).
   */
  payMock: async (id: string): Promise<Order> => {
    const res = await api.post(`/orders/${id}/pay-mock`);
    return res.data;
  },
};
