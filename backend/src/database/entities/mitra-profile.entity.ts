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
import { OperationalHour } from './operational-hour.entity';
import { Order } from './order.entity';
import { Payout } from './payout.entity';
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

  //catatan kalau lat, dan long tidak boleh null di db
  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    insert: false,
    update: false,
  })
  location: string;

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

  @OneToMany(() => OperationalHour, (hour) => hour.mitra)
  operationalHours: OperationalHour[];

  @OneToMany(() => Payout, (payout) => payout.mitra)
  payouts: Payout[];
}
