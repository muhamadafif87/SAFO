import api from './api';

export interface QrisPaymentData {
  paymentId: string;
  orderId: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  paymentMethod: string;
  qrString: string | null;
  qrCodeUrl: string | null;
  expiresAt: string | null;
  transactionId: string | null;
}

export interface PaymentStatusData {
  paymentId: string;
  orderId: string;
  internalOrderId: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  paymentMethod: string;
  qrString?: string | null;
  expiresAt: string | null;
  paidAt: string | null;
}

export const paymentService = {
  /**
   * Create a QRIS payment for an order.
   * Backend handles Midtrans charge, returns QR data for display.
   */
  createQrisPayment: async (
    orderId: string,
    idempotencyKey: string,
  ): Promise<QrisPaymentData> => {
    const res = await api.post('/payments/qris', { orderId, idempotencyKey });
    return res.data;
  },

  /**
   * Poll payment status from backend.
   * Backend is the single source of truth — status reflects Midtrans notifications.
   */
  getPaymentStatus: async (paymentId: string): Promise<PaymentStatusData> => {
    const res = await api.get(`/payments/${paymentId}`);
    return res.data;
  },
};
