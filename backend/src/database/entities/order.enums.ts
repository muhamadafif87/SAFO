export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  ACCEPTED = 'accepted',
  READY = 'ready',
  READY_FOR_PICKUP = 'ready_for_pickup',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Allowed status transitions per SRS flow:
 * pending_payment → paid → accepted → completed (cancelled/expired are terminal).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.ACCEPTED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.ACCEPTED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.ACCEPTED]: [
    OrderStatus.READY,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.READY]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.EXPIRED]: [],
};

/** Statuses that still hold reserved stock — cancelling them must release it back. */
export const STATUSES_REQUIRING_STOCK_RELEASE: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.ACCEPTED,
  OrderStatus.READY,
  OrderStatus.READY_FOR_PICKUP,
];

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return from === to || ORDER_STATUS_TRANSITIONS[from]?.includes(to) === true;
}

export enum PaymentMethod {
  EWALLET = 'ewallet',
  BANK_TRANSFER = 'bank_transfer',
  QRIS = 'qris',
}
