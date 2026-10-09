import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('saved_addresses')
export class SavedAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Label bebas yang user isi sendiri, mis. "Rumah", "Kost", "Kantor" */
  @Column({ length: 100 })
  label: string;

  /** Teks lengkap hasil reverse geocode */
  @Column({ name: 'address_detail', type: 'text' })
  addressDetail: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ name: 'recipient_name', length: 100 })
  recipientName: string;

  @Column({ name: 'recipient_phone', length: 20 })
  recipientPhone: string;

  /** Hanya satu alamat yang boleh is_primary = true per user */
  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
