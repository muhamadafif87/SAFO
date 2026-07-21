import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { MitraProfile } from './mitra-profile.entity';
import { OrderItem } from './order-item.entity';

export enum ProductStatus {
  ACTIVE = 'active',
  SOLD_OUT = 'sold_out',
  INACTIVE = 'inactive',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mitra_id' })
  mitraId: string;

  @ManyToOne(() => MitraProfile, mitra => mitra.products)
  @JoinColumn({ name: 'mitra_id' })
  mitra: MitraProfile;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'original_price' })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_price' })
  discountPrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'timestamp', name: 'pickup_window_start' })
  pickupWindowStart: Date;

  @Column({ type: 'timestamp', name: 'pickup_window_end' })
  pickupWindowEnd: Date;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];
}
