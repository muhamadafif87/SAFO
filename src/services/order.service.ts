import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatus,
} from '@/types';

// ─── UUID Validation ──────────────────────────────────────────────────────────
// PostgreSQL uuid columns reject anything that is not a valid UUID.
// Mock order IDs generated offline follow the pattern "ord-<timestamp>" which
// are NOT valid UUIDs. All service methods check this before hitting the API.

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if `id` is NOT a valid UUID (i.e. it was generated locally
 * while the backend was offline, e.g. "ord-1790257987598").
 */
function isMockId(id: string): boolean {
  return !UUID_REGEX.test(id);
}

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
    try {
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
    } catch (error) {
      console.warn('[orderService.create] Backend API offline/unreachable, creating mock order');
      const mockId = `ord-${Date.now()}`;
      const newOrder: Order = {
        id: mockId,
        customerId: '3',
        mitraId: 'm1',
        mitra: { businessName: 'Toko Mock', address: 'Jl. Mock No. 1' },
        items: (data.items || []).map((it, idx) => ({
          id: `item-${idx}`,
          orderId: mockId,
          productId: it.productId,
          product: { name: 'Produk Mock' },
          qty: it.qty ?? 1,
          priceAtPurchase: 18000,
        })),
        pickupCode: Math.random().toString(36).substring(2, 6).toUpperCase(),
        totalAmount:
          data.items.reduce((sum, it) => sum + 18000 * (it.qty ?? 1), 0) + 1000,
        platformFee: 1000,
        status: 'paid',
        note: data.note,
        paymentMethod: data.paymentMethod,
        createdAt: new Date().toISOString(),
      };
      mockOrders.unshift(newOrder);
      return newOrder;
    }
  },

  /**
   * Detail pesanan (includes QR/pickup code).
   *
   * GUARD: If `id` is a locally-generated mock ID (not a UUID), we serve
   * directly from the in-memory mock store without touching the backend.
   * Sending a non-UUID to PostgreSQL would cause:
   *   "invalid input syntax for type uuid" (pg error code 22P02).
   */
  getById: async (id: string): Promise<Order> => {
    if (isMockId(id)) {
      console.info(
        `[orderService.getById] Mock ID detected (${id}), serving from local store`,
      );
      const found = mockOrders.find((o) => o.id === id);
      if (found) return found;
      throw new Error('Pesanan tidak ditemukan di data lokal.');
    }

    try {
      const res = await api.get(`/orders/${id}`);
      return normalizeOrder(res.data);
    } catch (error) {
      console.warn(
        `[orderService.getById] Backend API offline/unreachable for id=${id}, returning mock order`,
      );
      return mockOrders.find((o) => o.id === id) || mockOrders[0];
    }
  },

  /**
   * Riwayat pesanan customer yang sedang login.
   */
  getMyOrders: async (): Promise<Order[]> => {
    try {
      const res = await api.get('/orders/mine');
      return (res.data as any[]).map(normalizeOrder);
    } catch (error) {
      console.warn(
        '[orderService.getMyOrders] Backend API offline/unreachable, returning mock orders',
      );
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
      console.warn(
        '[orderService.getMitraOrders] Backend API offline/unreachable, returning mock orders',
      );
      return mockOrders;
    }
  },

  /**
   * Update status pesanan (mitra: paid→ready→completed / admin: cancel, refund).
   * GUARD: Skip backend call if ID is a mock ID.
   */
  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    if (isMockId(id)) {
      const ord = mockOrders.find((o) => o.id === id) || mockOrders[0];
      ord.status = status;
      return { ...ord };
    }
    try {
      const res = await api.patch(`/orders/${id}/status`, { status });
      return res.data;
    } catch (error) {
      console.warn(
        `[orderService.updateStatus] Backend API offline, updating status locally for id=${id}`,
      );
      const ord = mockOrders.find((o) => o.id === id) || mockOrders[0];
      ord.status = status;
      return { ...ord };
    }
  },

  /**
   * Verifikasi pickup kode (mitra scan QR atau ketik 4-digit code).
   * GUARD: Skip backend call if ID is a mock ID.
   */
  verifyPickup: async (orderId: string, pickupCode: string): Promise<Order> => {
    if (isMockId(orderId)) {
      const ord = mockOrders.find((o) => o.id === orderId) || mockOrders[0];
      ord.status = 'completed';
      return { ...ord };
    }
    try {
      const res = await api.post(`/orders/${orderId}/verify-pickup`, {
        pickupCode,
      });
      return res.data;
    } catch (error) {
      console.warn(
        `[orderService.verifyPickup] Backend API offline, verifying mock pickup`,
      );
      const ord = mockOrders.find((o) => o.id === orderId) || mockOrders[0];
      ord.status = 'completed';
      return { ...ord };
    }
  },

  /**
   * Mock payment handler.
   * GUARD: Skip backend call if ID is a mock ID — it would crash PostgreSQL
   * with "invalid input syntax for type uuid" (pg error 22P02).
   */
  payMock: async (id: string): Promise<Order> => {
    if (isMockId(id)) {
      console.info(
        `[orderService.payMock] Mock ID detected (${id}), updating local store only`,
      );
      const ord = mockOrders.find((o) => o.id === id) || mockOrders[0];
      ord.status = 'paid';
      return { ...ord };
    }

    try {
      const res = await api.post(`/orders/${id}/pay-mock`);
      return res.data;
    } catch (error) {
      console.warn(
        `[orderService.payMock] Backend API offline, setting order status to paid`,
      );
      const ord = mockOrders.find((o) => o.id === id) || mockOrders[0];
      ord.status = 'paid';
      return { ...ord };
    }
  },
};
