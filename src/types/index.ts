/**
 * SAFO — Shared TypeScript Types
 * Mirror dari database schema (ERD) dan API contracts
 */

// ─── Enums ────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'mitra' | 'customer';
export type UserStatus = 'active' | 'suspended';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type ProductStatus = 'active' | 'sold_out' | 'expired' | 'inactive';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export type PaymentProvider = 'midtrans' | 'xendit' | 'mock';

export type PayoutStatus = 'requested' | 'processed' | 'rejected';

export type PaymentMethod = 'ewallet' | 'bank_transfer' | 'qris';

// ─── Core Entities ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface MitraProfile {
  id: string;
  userId: string;
  businessName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  legalDocUrl?: string;
  photoUrl?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  distanceKm?: number; // calculated field from geo query
}

export interface OperationalHour {
  id: string;
  mitraId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  openTime: string;  // "08:00"
  closeTime: string; // "22:00"
}

export interface Product {
  id: string;
  mitraId: string;
  mitra?: Pick<MitraProfile, 'businessName' | 'address' | 'latitude' | 'longitude' | 'distanceKm' | 'photoUrl'>;
  name: string;
  description?: string;
  photoUrl?: string;
  originalPrice: number;
  discountPrice: number;
  stock: number;
  pickupWindowStart: string; // ISO timestamp
  pickupWindowEnd: string;   // ISO timestamp
  status: ProductStatus;
  discountPercent?: number;  // calculated
}

export interface Order {
  id: string;
  customerId: string;
  mitraId: string;
  mitra?: Pick<MitraProfile, 'businessName' | 'address'>;
  items: OrderItem[];
  pickupCode: string;   // 4-char alphanumeric (e.g. "A3B7")
  totalAmount: number;
  platformFee: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Pick<Product, 'name' | 'photoUrl'>;
  qty: number;
  priceAtPurchase: number;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerRefId?: string;
  status: PaymentStatus;
  paidAt?: string;
  snapToken?: string;    // Midtrans Snap token (or mock)
  paymentUrl?: string;   // redirect URL
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  mitraId: string;
  amount: number;
  status: PayoutStatus;
  requestedAt: string;
  processedAt?: string;
}

export interface OrderStatusLog {
  id: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string;
  changedAt: string;
}

// ─── API Request / Response Types ────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterCustomerRequest {
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterMitraRequest {
  email: string;
  password: string;
  phone?: string;
  businessName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  mitra?: MitraProfile;
  tokens: AuthTokens;
}

// Products
export interface GetProductsQuery {
  lat?: number;
  lng?: number;
  radius?: number; // km, default 10
  page?: number;
  limit?: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  originalPrice: number;
  discountPrice: number;
  stock: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
}

// Orders
export interface CreateOrderRequest {
  mitraId: string;
  items: { productId: string; qty: number }[];
  note?: string;
  paymentMethod: PaymentMethod;
}

export interface CreateOrderResponse {
  order: Order;
  payment: Payment;
  snapToken?: string;
  paymentUrl?: string;
}

// Admin
export interface BusinessRules {
  platformFeeCustomer: number;  // e.g. 500 (Rp)
  platformFeeMitra: number;     // e.g. 500 (Rp)
  minimumDiscount: number;      // e.g. 30 (%)
  serviceRadiusKm: number;      // e.g. 10
}

// ─── UI/Store Types ──────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  mitra: MitraProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CartItem {
  product: Product;
  qty: number;
}
