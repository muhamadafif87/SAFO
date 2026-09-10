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

  @Column({ name: 'provider_ref_id', length: 255, nullable: true })
  providerRefId: string | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'snap_token', length: 255, nullable: true })
  snapToken: string | null;

  @Column({ name: 'payment_url', type: 'text', nullable: true })
  paymentUrl: string | null;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
