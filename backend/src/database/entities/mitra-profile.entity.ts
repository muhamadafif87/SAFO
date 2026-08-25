import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { User } from './user.entity';

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('mitra_profiles')
export class MitraProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (user) => user.mitraProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'business_name' })
  businessName: string;

  @Column()
  category: string;

  @Column()
  address: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ name: 'legal_doc_url', type: 'text', nullable: true })
  legalDocUrl: string;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
    name: 'verification_status',
  })
  verificationStatus: VerificationStatus;

  @Column({
    name: 'verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  verifiedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.mitra)
  products: Product[];

  @OneToMany(() => Order, (order) => order.mitra)
  orders: Order[];
}
