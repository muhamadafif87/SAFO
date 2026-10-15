import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatus,
} from '@/types';

/**
 * Normalizes the Order object from the backend:
 * - Maps `orderItems` (TypeORM relation name) → `items` (frontend contract)
 * - Ensures qty is always present
 */
function normalizeOrder(raw: any): Order {
  const orderItems = (raw.orderItems ?? raw.items ?? []).map((it: any) => ({
    ...it,
    qty: it.qty ?? it.quantity ?? 1,
  }));
  return { ...raw, items: orderItems, orderItems };
}

export const orderService = {
  /**
   * Buat pesanan baru + inisiasi pembayaran.
   */
  create: async (data: CreateOrderRequest): Promise<Order> => {
    // Normalize items: pastikan pakai field `qty` sesuai backend DTO
    const payload = {
      items: data.items.map((it) => ({
        productId: it.productId,
        qty: it.qty ?? (it as any).quantity ?? 1,
      })),
      note: data.note,
      paymentMethod: data.paymentMethod,
    };
    const res = await api.post('/orders', payload);
    // Backend bisa return order langsung atau wrapped
    const raw = res.data?.order ?? res.data;
    return normalizeOrder(raw);
  },

  /**
   * Detail pesanan (includes QR/pickup code).
   */
  getById: async (id: string): Promise<Order> => {
    const res = await api.get(`/orders/${id}`);
    return normalizeOrder(res.data);
  },

  /**
   * Riwayat pesanan customer yang sedang login.
   */
  getMyOrders: async (): Promise<Order[]> => {
    const res = await api.get('/orders/mine');
    return (res.data as any[]).map(normalizeOrder);
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
   * Mock payment handler.
   */
  payMock: async (id: string): Promise<Order> => {
    const res = await api.post(`/orders/${id}/pay-mock`);
    return res.data;
  },
};
