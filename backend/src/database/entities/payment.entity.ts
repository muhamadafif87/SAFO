import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum PaymentProvider {
  MIDTRANS = 'midtrans',
  XENDIT = 'xendit',
  MOCK = 'mock',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.MOCK,
  })
  provider: PaymentProvider;

  /** Midtrans order_id used in the charge request — our internal order UUID */
  @Column({ name: 'provider_ref_id', length: 255, nullable: true })
  providerRefId: string | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  /** Midtrans internal transaction_id (different from our order id) */
  @Column({ name: 'transaction_id', length: 255, nullable: true })
  transactionId: string | null;

  /** Raw QR string returned by Midtrans — rendered client-side into a QR image */
  @Column({ name: 'qr_string', type: 'text', nullable: true })
  qrString: string | null;

  /** QR image URL returned by Midtrans (actions[].url) if available */
  @Column({ name: 'qr_code_url', type: 'text', nullable: true })
  qrCodeUrl: string | null;

  /** When this QRIS transaction expires (from Midtrans expiry_time) */
  @Column({
    name: 'expiry_time',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expiryTime: Date | null;

  /** Gross amount stored for notification signature cross-check */
  @Column({
    name: 'gross_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  grossAmount: number | null;

  /** Client-supplied idempotency key — prevents duplicate charge on retry */
  @Column({ name: 'idempotency_key', length: 255, nullable: true, unique: true })
  idempotencyKey: string | null;

  /** Legacy snap_token kept for backward compat (not used by QRIS Core API) */
  @Column({ name: 'snap_token', length: 255, nullable: true })
  snapToken: string | null;

  /** Payment or redirect URL (not used by QRIS Core API, kept for compat) */
  @Column({ name: 'payment_url', type: 'text', nullable: true })
  paymentUrl: string | null;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
