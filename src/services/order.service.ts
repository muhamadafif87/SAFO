import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatus,
} from '@/types';

export const mockOrders: Order[] = [
  {
    id: 'ord-101',
    customerId: '3',
    mitraId: 'm1',
    mitra: {
      businessName: 'Toko Roti Makmur',
      address: 'Jl. Merdeka No. 45, Jakarta Pusat',
    },
    items: [
      {
        id: 'item-1',
        orderId: 'ord-101',
        productId: '1',
        product: { name: 'Paket Roti Manis Surplus' },
        qty: 1,
        priceAtPurchase: 18000,
      },
    ],
    pickupCode: 'R87A',
    totalAmount: 19000,
    platformFee: 1000,
    status: 'paid',
    createdAt: new Date().toISOString(),
  },
];

export const orderService = {
  /**
   * Buat pesanan baru + inisiasi pembayaran.
   */
  create: async (data: CreateOrderRequest): Promise<Order> => {
    try {
      const res = await api.post('/orders', data);
      return res.data;
    } catch (error) {
      console.warn('[orderService.create] Backend API offline/unreachable, creating mock order');
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        customerId: '3',
        mitraId: data.mitraId || 'm1',
        mitra: { businessName: 'Toko Roti Makmur', address: 'Jl. Merdeka No. 45, Jakarta Pusat' },
        items: (data.items || []).map((it, idx) => ({
          id: `item-${idx}`,
          orderId: `ord-${Date.now()}`,
          productId: it.productId,
          product: { name: 'Paket Roti Manis Surplus' },
          qty: it.qty,
          priceAtPurchase: 18000,
        })),
        pickupCode: Math.random().toString(36).substring(2, 6).toUpperCase(),
        totalAmount: 19000,
        platformFee: 1000,
        status: 'paid',
        createdAt: new Date().toISOString(),
      };
      mockOrders.unshift(newOrder);
      return newOrder;
    }
  },

  /**
   * Detail pesanan (includes QR/pickup code).
   */
  getById: async (id: string): Promise<Order> => {
    try {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    } catch (error) {
      console.warn(`[orderService.getById] Backend API offline/unreachable for id=${id}, returning mock order`);
      return mockOrders.find((o) => o.id === id) || mockOrders[0];
    }
  },

  /**
   * Riwayat pesanan customer yang sedang login.
   */
  getMyOrders: async (): Promise<Order[]> => {
    try {
      const res = await api.get('/orders/mine');
      return res.data;
    } catch (error) {
      console.warn('[orderService.getMyOrders] Backend API offline/unreachable, returning mock orders');
      return mockOrders;
    }
  },

  /**
   * Daftar pesanan masuk ke mitra.
   */
  getMitraOrders: async (): Promise<Order[]> => {
    try {
      const res = await api.get('/orders/mitra');
      return res.data;
    } catch (error) {
      console.warn('[orderService.getMitraOrders] Backend API offline/unreachable, returning mock orders');
      return mockOrders;
    }
  },

  /**
   * Update status pesanan (mitra: paid→ready→completed / admin: cancel, refund).
   */
  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    try {
      const res = await api.patch(`/orders/${id}/status`, { status });
      return res.data;
    } catch (error) {
      console.warn(`[orderService.updateStatus] Backend API offline, updating status locally for id=${id}`);
      const ord = mockOrders.find((o) => o.id === id) || mockOrders[0];
      ord.status = status;
      return { ...ord };
    }
  },

  /**
   * Verifikasi pickup kode (mitra scan QR atau ketik 4-digit code).
   */
  verifyPickup: async (orderId: string, pickupCode: string): Promise<Order> => {
    try {
      const res = await api.post(`/orders/${orderId}/verify-pickup`, { pickupCode });
      return res.data;
    } catch (error) {
      console.warn(`[orderService.verifyPickup] Backend API offline, verifying mock pickup`);
      const ord = mockOrders.find((o) => o.id === orderId) || mockOrders[0];
      ord.status = 'completed';
      return { ...ord };
    }
  },

  /**
   * Mock payment handler.
   */
  payMock: async (id: string): Promise<Order> => {
    try {
      const res = await api.post(`/orders/${id}/pay-mock`);
      return res.data;
    } catch (error) {
      console.warn(`[orderService.payMock] Backend API offline, setting order status to paid`);
      const ord = mockOrders.find((o) => o.id === id) || mockOrders[0];
      ord.status = 'paid';
      return { ...ord };
    }
  },
};
