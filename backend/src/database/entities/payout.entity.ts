import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { MitraProfile } from './mitra-profile.entity';

export enum PayoutStatus {
  REQUESTED = 'requested',
  PROCESSED = 'processed',
  REJECTED = 'rejected',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mitra_id', type: 'uuid' })
  mitraId: string;

  @ManyToOne(() => MitraProfile, (mitra) => mitra.payouts)
  @JoinColumn({ name: 'mitra_id' })
  mitra: MitraProfile;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.REQUESTED })
  status: PayoutStatus;

  @CreateDateColumn({ name: 'requested_at', type: 'timestamp with time zone' })
  requestedAt: Date;

  @Column({
    name: 'processed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  processedAt: Date | null;
}
