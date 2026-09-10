export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  READY = 'ready',
  READY_FOR_PICKUP = 'ready_for_pickup',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PaymentMethod {
  EWALLET = 'ewallet',
  BANK_TRANSFER = 'bank_transfer',
  QRIS = 'qris',
}
