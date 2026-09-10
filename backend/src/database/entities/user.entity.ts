import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { MitraProfile } from './mitra-profile.entity';
import { OrderStatusLog } from './order-status-log.entity';
import { Order } from './order.entity';
import { Review } from './review.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  MITRA = 'mitra',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToOne(() => MitraProfile, (profile) => profile.user)
  mitraProfile: MitraProfile;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @OneToMany(() => OrderStatusLog, (log) => log.changedBy)
  statusLogs: OrderStatusLog[];

  @OneToMany(() => Review, (review) => review.customer)
  reviews: Review[];
}
