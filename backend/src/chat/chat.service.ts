import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AttachmentStatus,
  ConversationStatus,
  MessageType,
  OutboxStatus,
} from '../database/entities/chat.enums';
import { Conversation } from '../database/entities/conversation.entity';
import { MessageAttachment } from '../database/entities/message-attachment.entity';
import { Message } from '../database/entities/message.entity';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { NotificationOutbox } from '../database/entities/notification-outbox.entity';
import { UserRole } from '../database/entities/user.entity';
import { ChatStorageService } from './chat-storage.service';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepo: Repository<MessageAttachment>,
    @InjectRepository(NotificationOutbox)
    private readonly outboxRepo: Repository<NotificationOutbox>,
    @InjectRepository(MitraProfile)
    private readonly mitraRepo: Repository<MitraProfile>,
    private readonly chatStorageService: ChatStorageService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validate that the current user is an authorized participant (or admin).
   */
  async assertParticipant(
    conversation: Conversation,
    user: { id: string; role: string },
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.CUSTOMER) {
      if (conversation.customerId !== user.id) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }
      return;
    }

    if (user.role === UserRole.MITRA) {
      const mitraProfile = await this.mitraRepo.findOne({
        where: { userId: user.id },
      });
      if (!mitraProfile || conversation.mitraId !== mitraProfile.id) {
        throw new ForbiddenException('You are not the designated mitra for this conversation');
      }
      return;
    }

    throw new ForbiddenException('Unauthorized user role for chat');
  }

  /**
   * Get conversation by Order ID.
   */
  async getConversationByOrderId(
    orderId: string,
    user: { id: string; role: string },
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { orderId },
      relations: ['order', 'customer', 'mitra', 'mitra.user'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation for order ${orderId} not found`);
    }

    await this.assertParticipant(conversation, user);
    return conversation;
  }

  /**
   * Get conversation by Conversation ID.
   */
  async getConversationById(
    conversationId: string,
    user: { id: string; role: string },
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['order', 'customer', 'mitra', 'mitra.user'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    await this.assertParticipant(conversation, user);
    return conversation;
  }

  /**
   * Get message history with cursor-based pagination.
   */
  async getMessages(
    conversationId: string,
    user: { id: string; role: string },
    query: GetMessagesQueryDto,
  ): Promise<{
    messages: (Message & { attachmentUrl?: string })[];
    nextCursor: { cursorCreatedAt: string; cursorId: string } | null;
    hasMore: boolean;
  }> {
    const conversation = await this.getConversationById(conversationId, user);

    const limit = query.limit || 20;
    const qb = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.attachment', 'attachment')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversation_id = :conversationId', { conversationId: conversation.id });

    if (query.cursorCreatedAt && query.cursorId) {
      qb.andWhere(
        '(message.created_at < :cursorCreatedAt OR (message.created_at = :cursorCreatedAt AND message.id < :cursorId))',
        {
          cursorCreatedAt: new Date(query.cursorCreatedAt),
          cursorId: query.cursorId,
        },
      );
    }

    qb.orderBy('message.created_at', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit + 1);

    const rawMessages = await qb.getMany();
    const hasMore = rawMessages.length > limit;
    const items = hasMore ? rawMessages.slice(0, limit) : rawMessages;

    // Attach presigned URLs for image attachments
    const enrichedMessages = await Promise.all(
      items.map(async (msg) => {
        if (msg.attachment && msg.attachment.storageKey) {
          const { signedUrl, expiresAt } = await this.chatStorageService.generateSignedUrl(
            msg.attachment.storageKey,
          );
          msg.attachment.signedUrl = signedUrl;
          msg.attachment.expiresAt = expiresAt;
        }
        return msg;
      }),
    );

    const lastItem = enrichedMessages[enrichedMessages.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? {
            cursorCreatedAt: lastItem.createdAt.toISOString(),
            cursorId: lastItem.id,
          }
        : null;

    return {
      messages: enrichedMessages,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Upload an attachment to S3 and save metadata in message_attachments.
   */
  async uploadAttachment(
    conversationId: string,
    user: { id: string; role: string },
    file: Express.Multer.File,
  ): Promise<MessageAttachment> {
    const conversation = await this.getConversationById(conversationId, user);

    if (conversation.status !== ConversationStatus.ACTIVE) {
      throw new BadRequestException('Attachments can only be uploaded when conversation is active');
    }

    const { storageKey, mimeType, fileSize, originalName } =
      await this.chatStorageService.uploadAttachment(conversationId, file);

    const attachment = this.attachmentRepo.create({
      conversationId: conversation.id,
      uploaderId: user.id,
      storageKey,
      mimeType,
      fileSize,
      originalName,
      status: AttachmentStatus.UPLOADED,
    });

    const saved = await this.attachmentRepo.save(attachment);
    const { signedUrl, expiresAt } = await this.chatStorageService.generateSignedUrl(saved.storageKey);
    saved.signedUrl = signedUrl;
    saved.expiresAt = expiresAt;

    return saved;
  }

  /**
   * Refresh presigned URL for an attachment.
   */
  async refreshAttachmentUrl(
    conversationId: string,
    attachmentId: string,
    user: { id: string; role: string },
  ): Promise<{ signedUrl: string; expiresAt: Date }> {
    await this.getConversationById(conversationId, user);

    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId, conversationId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return this.chatStorageService.generateSignedUrl(attachment.storageKey);
  }

  /**
   * Send a message with strict idempotency, row-level locking, and transactional outbox.
   */
  async sendMessage(
    user: { id: string; role: string },
    dto: SendMessageDto,
  ): Promise<{ message: Message; isDuplicate: boolean; conversation: Conversation }> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        return await this.executeSendMessageTransaction(user, dto);
      } catch (error) {
        // Postgres deadlock error code: 40P01
        if (error?.code === '40P01' && attempt < MAX_RETRIES) {
          this.logger.warn(
            `Deadlock detected on sendMessage attempt ${attempt}. Retrying in ${attempt * 50}ms...`,
          );
          await new Promise((res) => setTimeout(res, attempt * 50));
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException('Failed to send message due to concurrent transaction lock');
  }

  private async executeSendMessageTransaction(
    user: { id: string; role: string },
    dto: SendMessageDto,
  ): Promise<{ message: Message; isDuplicate: boolean; conversation: Conversation }> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Lock conversation row (Pessimistic Write Lock)
      const conversation = await manager
        .createQueryBuilder(Conversation, 'conv')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('conv.customer', 'customer')
        .leftJoinAndSelect('conv.mitra', 'mitra')
        .leftJoinAndSelect('mitra.user', 'mitraUser')
        .where('conv.id = :id', { id: dto.conversationId })
        .getOne();

      if (!conversation) {
        throw new NotFoundException(`Conversation ${dto.conversationId} not found`);
      }

      // 2. Validate participant
      await this.assertParticipant(conversation, user);

      // 3. Check idempotency: has clientMessageId already been saved?
      const existingMessage = await manager.findOne(Message, {
        where: {
          conversationId: conversation.id,
          clientMessageId: dto.clientMessageId,
        },
        relations: ['attachment'],
      });

      if (existingMessage) {
        if (existingMessage.attachment?.storageKey) {
          const { signedUrl, expiresAt } = await this.chatStorageService.generateSignedUrl(
            existingMessage.attachment.storageKey,
          );
          existingMessage.attachment.signedUrl = signedUrl;
          existingMessage.attachment.expiresAt = expiresAt;
        }
        return {
          message: existingMessage,
          isDuplicate: true,
          conversation,
        };
      }

      // 4. Conversation must be ACTIVE
      if (conversation.status !== ConversationStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot send message: conversation is currently ${conversation.status}`,
        );
      }

      // 5. Handle attachment if message type is image
      let attachment: MessageAttachment | null = null;
      if (dto.type === MessageType.IMAGE) {
        if (!dto.attachmentId) {
          throw new BadRequestException('Image message requires attachmentId');
        }

        // Lock attachment row
        attachment = await manager
          .createQueryBuilder(MessageAttachment, 'att')
          .setLock('pessimistic_write')
          .where('att.id = :id', { id: dto.attachmentId })
          .getOne();

        if (!attachment) {
          throw new NotFoundException('Attachment not found');
        }

        if (attachment.uploaderId !== user.id) {
          throw new ForbiddenException('You are not the uploader of this attachment');
        }

        if (attachment.conversationId !== conversation.id) {
          throw new BadRequestException('Attachment belongs to a different conversation');
        }

        if (attachment.status !== AttachmentStatus.UPLOADED) {
          throw new BadRequestException(
            `Attachment has already been ${attachment.status}`,
          );
        }

        // Mark attachment as attached
        attachment.status = AttachmentStatus.ATTACHED;
        attachment.attachedAt = new Date();
        await manager.save(MessageAttachment, attachment);
      } else {
        if (!dto.content || !dto.content.trim()) {
          throw new BadRequestException('Text message content cannot be empty');
        }
      }

      // 6. Determine sender role
      const senderRole =
        user.role === UserRole.MITRA ? UserRole.MITRA : UserRole.CUSTOMER;

      // 7. Insert message
      const message = manager.create(Message, {
        conversationId: conversation.id,
        senderId: user.id,
        senderRole,
        clientMessageId: dto.clientMessageId,
        type: dto.type,
        content: dto.type === MessageType.TEXT ? dto.content?.trim() : null,
        attachmentId: attachment ? attachment.id : null,
      });

      const savedMessage = await manager.save(Message, message);
      if (attachment) {
        savedMessage.attachment = attachment;
      }

      // 8. Enqueue Transactional Outbox for Push Notification
      const recipientUserId =
        senderRole === UserRole.CUSTOMER
          ? conversation.mitra.userId
          : conversation.customerId;

      const outbox = manager.create(NotificationOutbox, {
        eventType: 'chat:new_message',
        aggregateId: savedMessage.id,
        recipientUserId,
        payload: {
          conversationId: conversation.id,
          orderId: conversation.orderId,
          messageId: savedMessage.id,
          clientMessageId: savedMessage.clientMessageId,
          senderRole: savedMessage.senderRole,
          type: savedMessage.type,
          content: savedMessage.content,
          attachmentId: savedMessage.attachmentId,
          timestamp: savedMessage.createdAt.toISOString(),
        },
        status: OutboxStatus.PENDING,
        attemptCount: 0,
        nextAttemptAt: new Date(),
      });

      await manager.save(NotificationOutbox, outbox);

      // Resolve signed URL for returned payload
      if (savedMessage.attachment?.storageKey) {
        const { signedUrl, expiresAt } = await this.chatStorageService.generateSignedUrl(
          savedMessage.attachment.storageKey,
        );
        savedMessage.attachment.signedUrl = signedUrl;
        savedMessage.attachment.expiresAt = expiresAt;
      }

      return {
        message: savedMessage,
        isDuplicate: false,
        conversation,
      };
    });
  }
}
