import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { MitraProfile } from './mitra-profile.entity';

@Entity('operational_hours')
@Unique(['mitraId', 'dayOfWeek'])
export class OperationalHour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mitra_id', type: 'uuid' })
  mitraId: string;

  @ManyToOne(() => MitraProfile, (mitra) => mitra.operationalHours, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mitra_id' })
  mitra: MitraProfile;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek: number;

  @Column({ name: 'open_time', type: 'time' })
  openTime: string;

  @Column({ name: 'close_time', type: 'time' })
  closeTime: string;
}
