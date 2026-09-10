import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MitraProfile } from './mitra-profile.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusLog } from './order-status-log.entity';
import { OrderStatus, PaymentMethod } from './order.enums';
import { Payment } from './payment.entity';
import { Review } from './review.entity';
import { User } from './user.entity';

export { OrderStatus, PaymentMethod } from './order.enums';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'mitra_id', type: 'uuid' })
  mitraId: string;

  @ManyToOne(() => MitraProfile, (mitra) => mitra.orders)
  @JoinColumn({ name: 'mitra_id' })
  mitra: MitraProfile;

  @Column({ name: 'pickup_code', length: 10 })
  pickupCode: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'platform_fee',
    default: 1000,
  })
  platformFee: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    name: 'payment_method',
    nullable: true,
  })
  paymentMethod: PaymentMethod | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @OneToMany(() => OrderStatusLog, (log) => log.order)
  statusLogs: OrderStatusLog[];

  @OneToOne(() => Review, (review) => review.order)
  review: Review;
}
