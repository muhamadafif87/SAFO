import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttachmentStatus } from './chat.enums';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { User } from './user.entity';

@Entity('message_attachments')
@Index('idx_attachments_cleanup', ['status', 'uploadedAt'])
export class MessageAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.attachments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'uploader_id', type: 'uuid' })
  uploaderId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({ name: 'storage_key', type: 'varchar', length: 255, unique: true })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 50 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize: number;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({
    type: 'enum',
    enum: AttachmentStatus,
    default: AttachmentStatus.UPLOADED,
  })
  status: AttachmentStatus;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamp with time zone' })
  uploadedAt: Date;

  @Column({ name: 'attached_at', type: 'timestamp with time zone', nullable: true })
  attachedAt: Date | null;

  @OneToOne(() => Message, (message) => message.attachment)
  message?: Message;

  // Transient property for generated presigned URL
  signedUrl?: string;
  expiresAt?: Date;
}
