import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationStatus } from './chat.enums';
import { MessageAttachment } from './message-attachment.entity';
import { Message } from './message.entity';
import { MitraProfile } from './mitra-profile.entity';
import { Order } from './order.entity';
import { User } from './user.entity';

@Entity('conversations')
@Index('idx_conversations_customer_status', ['customerId', 'status'])
@Index('idx_conversations_mitra_status', ['mitraId', 'status'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId: string;

  @OneToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'mitra_id', type: 'uuid' })
  mitraId: string;

  @ManyToOne(() => MitraProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mitra_id' })
  mitra: MitraProfile;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.WAITING,
  })
  status: ConversationStatus;

  @Column({ name: 'started_at', type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp with time zone', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'close_reason', type: 'varchar', length: 50, nullable: true })
  closeReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(() => MessageAttachment, (attachment) => attachment.conversation)
  attachments: MessageAttachment[];
}
