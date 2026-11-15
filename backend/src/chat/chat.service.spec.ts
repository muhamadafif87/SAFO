import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConversationStatus, MessageType } from '../database/entities/chat.enums';
import { Conversation } from '../database/entities/conversation.entity';
import { MessageAttachment } from '../database/entities/message-attachment.entity';
import { Message } from '../database/entities/message.entity';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { NotificationOutbox } from '../database/entities/notification-outbox.entity';
import { Order } from '../database/entities/order.entity';
import { OrderStatus } from '../database/entities/order.enums';
import { UserRole } from '../database/entities/user.entity';
import { ChatStorageService } from './chat-storage.service';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepo: jest.Mocked<Repository<Conversation>>;
  let messageRepo: jest.Mocked<Repository<Message>>;
  let orderRepo: jest.Mocked<Repository<Order>>;
  let mitraRepo: jest.Mocked<Repository<MitraProfile>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((dto) => ({ id: 'conv-new-uuid', ...dto })),
            save: jest.fn((dto) => Promise.resolve({ id: 'conv-new-uuid', ...dto })),
          },
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MessageAttachment),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationOutbox),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MitraProfile),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ChatStorageService,
          useValue: {
            generateSignedUrl: jest.fn().mockResolvedValue({
              signedUrl: 'https://example.com/image.jpg',
              expiresAt: new Date(),
            }),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    conversationRepo = module.get(getRepositoryToken(Conversation));
    messageRepo = module.get(getRepositoryToken(Message));
    orderRepo = module.get(getRepositoryToken(Order));
    mitraRepo = module.get(getRepositoryToken(MitraProfile));
  });

  it('should auto-create active conversation if order is accepted and no conversation exists', async () => {
    const orderId = 'order-uuid-1';
    const customerId = 'cust-uuid-1';
    const mitraId = 'mitra-uuid-1';

    // First findOne returns null (no conversation yet)
    conversationRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'conv-new-uuid',
        orderId,
        customerId,
        mitraId,
        status: ConversationStatus.ACTIVE,
      } as any);

    orderRepo.findOne.mockResolvedValueOnce({
      id: orderId,
      customerId,
      mitraId,
      status: OrderStatus.ACCEPTED,
    } as any);

    const user = { id: customerId, role: UserRole.CUSTOMER };
    const result = await service.getConversationByOrderId(orderId, user);

    expect(result).toBeDefined();
    expect(result.status).toBe(ConversationStatus.ACTIVE);
    expect(conversationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        customerId,
        mitraId,
        status: ConversationStatus.ACTIVE,
      }),
    );
  });

  it('should correctly query messages without entity property error', async () => {
    const convId = 'conv-uuid-1';
    const customerId = 'cust-uuid-1';

    conversationRepo.findOne.mockResolvedValueOnce({
      id: convId,
      customerId,
      status: ConversationStatus.ACTIVE,
    } as any);

    mockQueryBuilder.getMany.mockResolvedValueOnce([
      {
        id: 'msg-1',
        conversationId: convId,
        content: 'Halo warung!',
        createdAt: new Date(),
        attachment: null,
      },
    ]);

    const res = await service.getMessages(convId, { id: customerId, role: UserRole.CUSTOMER }, { limit: 20 });

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'message.conversationId = :conversationId',
      { conversationId: convId },
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('message.createdAt', 'DESC');
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0].content).toBe('Halo warung!');
  });

  it('should lock only conv table alias with pessimistic_write and fetch relations during sendMessage (Customer -> Mitra)', async () => {
    const convId = 'conv-uuid-1';
    const customerId = 'cust-uuid-1';
    const mitraUserId = 'mitra-user-uuid-1';

    const mockConvQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: convId,
        orderId: 'order-1',
        customerId,
        mitraId: 'mitra-1',
        status: ConversationStatus.ACTIVE,
        customer: { id: customerId },
        mitra: { id: 'mitra-1', userId: mitraUserId },
      }),
    };

    const mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockConvQueryBuilder),
      findOne: jest.fn().mockResolvedValue(null), // idempotency check: not exists
      create: jest.fn((entity, dto) => ({ id: 'msg-new-id', ...dto, createdAt: new Date() })),
      save: jest.fn((entity, dto) => Promise.resolve({ id: 'saved-id', ...dto, createdAt: new Date() })),
    };

    const dataSource = (service as any).dataSource;
    dataSource.transaction = jest.fn((cb) => cb(mockManager));

    const result = await service.sendMessage(
      { id: customerId, role: UserRole.CUSTOMER },
      {
        conversationId: convId,
        clientMessageId: 'client-msg-1',
        type: MessageType.TEXT,
        content: 'Halo Mitra!',
      },
    );

    expect(result.message).toBeDefined();
    expect(result.isDuplicate).toBe(false);
    // Verify query builder locks ONLY 'conv' table alias
    expect(mockConvQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write', undefined, ['conv']);
    expect(mockConvQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('conv.customer', 'customer');
    expect(mockConvQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('conv.mitra', 'mitra');
    expect(mockConvQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('mitra.user', 'mitraUser');
    // Verify outbox created with recipient = mitraUserId
    expect(mockManager.create).toHaveBeenCalledWith(
      NotificationOutbox,
      expect.objectContaining({
        recipientUserId: mitraUserId,
      }),
    );
  });

  it('should send message successfully from Mitra to Customer', async () => {
    const convId = 'conv-uuid-1';
    const customerId = 'cust-uuid-1';
    const mitraUserId = 'mitra-user-uuid-1';
    const mitraProfileId = 'mitra-profile-1';

    mitraRepo.findOne.mockResolvedValueOnce({
      id: mitraProfileId,
      userId: mitraUserId,
    } as any);

    const mockConvQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: convId,
        orderId: 'order-1',
        customerId,
        mitraId: mitraProfileId,
        status: ConversationStatus.ACTIVE,
        customer: { id: customerId },
        mitra: { id: mitraProfileId, userId: mitraUserId },
      }),
    };

    const mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockConvQueryBuilder),
      findOne: jest.fn().mockResolvedValue(null), // idempotency check
      create: jest.fn((entity, dto) => ({ id: 'msg-mitra-id', ...dto, createdAt: new Date() })),
      save: jest.fn((entity, dto) => Promise.resolve({ id: 'saved-mitra-id', ...dto, createdAt: new Date() })),
    };

    const dataSource = (service as any).dataSource;
    dataSource.transaction = jest.fn((cb) => cb(mockManager));

    const result = await service.sendMessage(
      { id: mitraUserId, role: UserRole.MITRA },
      {
        conversationId: convId,
        clientMessageId: 'mitra-msg-1',
        type: MessageType.TEXT,
        content: 'Pesanan sedang diproses ya kak',
      },
    );

    expect(result.message).toBeDefined();
    expect(result.message.senderRole).toBe(UserRole.MITRA);
    expect(result.isDuplicate).toBe(false);
    // Recipient must be the customer
    expect(mockManager.create).toHaveBeenCalledWith(
      NotificationOutbox,
      expect.objectContaining({
        recipientUserId: customerId,
      }),
    );
  });

  it('should return existing message on retry with same clientMessageId (idempotency)', async () => {
    const convId = 'conv-uuid-1';
    const customerId = 'cust-uuid-1';
    const mitraUserId = 'mitra-user-uuid-1';

    const existingMsg = {
      id: 'existing-msg-id',
      conversationId: convId,
      clientMessageId: 'idempotent-key-1',
      senderId: customerId,
      senderRole: UserRole.CUSTOMER,
      type: MessageType.TEXT,
      content: 'Pesan idempotency',
      createdAt: new Date(),
    };

    const mockConvQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: convId,
        orderId: 'order-1',
        customerId,
        mitraId: 'mitra-1',
        status: ConversationStatus.ACTIVE,
        customer: { id: customerId },
        mitra: { id: 'mitra-1', userId: mitraUserId },
      }),
    };

    const mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockConvQueryBuilder),
      findOne: jest.fn().mockResolvedValue(existingMsg), // idempotency check: found existing
      create: jest.fn(),
      save: jest.fn(),
    };

    const dataSource = (service as any).dataSource;
    dataSource.transaction = jest.fn((cb) => cb(mockManager));

    const result = await service.sendMessage(
      { id: customerId, role: UserRole.CUSTOMER },
      {
        conversationId: convId,
        clientMessageId: 'idempotent-key-1',
        type: MessageType.TEXT,
        content: 'Pesan idempotency',
      },
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.message.id).toBe('existing-msg-id');
    // Ensure no new message or outbox was created or saved
    expect(mockManager.create).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('should reject message when conversation is closed', async () => {
    const convId = 'conv-uuid-1';
    const customerId = 'cust-uuid-1';

    const mockConvQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: convId,
        customerId,
        status: ConversationStatus.CLOSED,
        customer: { id: customerId },
        mitra: { id: 'mitra-1', userId: 'mitra-user' },
      }),
    };

    const mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockConvQueryBuilder),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    };

    const dataSource = (service as any).dataSource;
    dataSource.transaction = jest.fn((cb) => cb(mockManager));

    await expect(
      service.sendMessage(
        { id: customerId, role: UserRole.CUSTOMER },
        {
          conversationId: convId,
          clientMessageId: 'msg-closed-1',
          type: MessageType.TEXT,
          content: 'Halo?',
        },
      ),
    ).rejects.toThrow('Cannot send message: conversation is currently closed');
  });

  it('should lock attachment row separately when message is IMAGE', async () => {
    const convId = 'conv-uuid-1';
    const customerId = 'cust-uuid-1';
    const attachmentId = 'att-uuid-1';

    const mockConvQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: convId,
        orderId: 'order-1',
        customerId,
        mitraId: 'mitra-1',
        status: ConversationStatus.ACTIVE,
        customer: { id: customerId },
        mitra: { id: 'mitra-1', userId: 'mitra-user' },
      }),
    };

    const mockAttQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: attachmentId,
        conversationId: convId,
        uploaderId: customerId,
        status: 'uploaded',
        storageKey: 'chats/images/test.jpg',
      }),
    };

    const mockManager = {
      createQueryBuilder: jest.fn((entity) => {
        if (entity === Conversation) return mockConvQueryBuilder;
        return mockAttQueryBuilder;
      }),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity, dto) => ({ id: 'msg-img-id', ...dto, createdAt: new Date() })),
      save: jest.fn((entity, dto) => Promise.resolve({ id: 'saved-id', ...dto, createdAt: new Date() })),
    };

    const dataSource = (service as any).dataSource;
    dataSource.transaction = jest.fn((cb) => cb(mockManager));

    const result = await service.sendMessage(
      { id: customerId, role: UserRole.CUSTOMER },
      {
        conversationId: convId,
        clientMessageId: 'img-msg-1',
        type: MessageType.IMAGE,
        attachmentId,
      },
    );

    expect(result.message).toBeDefined();
    expect(mockAttQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(mockManager.save).toHaveBeenCalledWith(
      MessageAttachment,
      expect.objectContaining({
        status: 'attached',
      }),
    );
  });
});
