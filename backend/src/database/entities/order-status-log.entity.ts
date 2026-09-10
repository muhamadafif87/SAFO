import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './order.enums';
import { User } from './user.entity';

@Entity('order_status_logs')
export class OrderStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.statusLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: OrderStatus,
    nullable: true,
  })
  fromStatus: OrderStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: OrderStatus })
  toStatus: OrderStatus;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedById: string | null;

  @ManyToOne(() => User, (user) => user.statusLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'changed_by' })
  changedBy: User | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamp with time zone' })
  changedAt: Date;
}
