import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MessageType } from './chat.enums';
import { Conversation } from './conversation.entity';
import { MessageAttachment } from './message-attachment.entity';
import { User, UserRole } from './user.entity';

@Entity('messages')
@Unique('uq_messages_conversation_client_id', ['conversationId', 'clientMessageId'])
@Index('idx_messages_cursor', ['conversationId', 'createdAt', 'id'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({
    name: 'sender_role',
    type: 'enum',
    enum: UserRole,
  })
  senderRole: UserRole;

  @Column({ name: 'client_message_id', type: 'varchar', length: 64 })
  clientMessageId: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'attachment_id', type: 'uuid', nullable: true, unique: true })
  attachmentId: string | null;

  @OneToOne(() => MessageAttachment, (att) => att.message, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'attachment_id' })
  attachment: MessageAttachment | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
