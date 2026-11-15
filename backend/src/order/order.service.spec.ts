jest.mock('uuid', () => ({
  v4: () => '11111111-1111-4111-8111-111111111111',
}));

import { BadRequestException } from '@nestjs/common';
import { canTransition, OrderStatus, ORDER_STATUS_TRANSITIONS } from '../database/entities/order.enums';
import { OrderService } from './order.service';
import { ConversationStatus } from '../database/entities/chat.enums';

describe('Order Status Transitions & State Machine', () => {
  it('should allow transition from paid to accepted', () => {
    expect(canTransition(OrderStatus.PAID, OrderStatus.ACCEPTED)).toBe(true);
    expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PAID]).toContain(OrderStatus.ACCEPTED);
  });

  it('should allow transition from paid to processing', () => {
    expect(canTransition(OrderStatus.PAID, OrderStatus.PROCESSING)).toBe(true);
    expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PAID]).toContain(OrderStatus.PROCESSING);
  });

  it('should allow transition from accepted to completed or ready_for_pickup', () => {
    expect(canTransition(OrderStatus.ACCEPTED, OrderStatus.COMPLETED)).toBe(true);
    expect(canTransition(OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP)).toBe(true);
    expect(canTransition(OrderStatus.ACCEPTED, OrderStatus.CANCELLED)).toBe(true);
  });

  it('should not allow invalid transitions (e.g. completed to paid)', () => {
    expect(canTransition(OrderStatus.COMPLETED, OrderStatus.PAID)).toBe(false);
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.ACCEPTED)).toBe(false);
  });
});

describe('OrderService - updateOrderStatus & verifyPickup', () => {
  let service: OrderService;
  let mockDataSource: any;
  let mockOrderRepo: any;
  let mockOrderItemRepo: any;
  let mockProductRepo: any;
  let mockPaymentService: any;
  let mockEntityManager: any;

  const validUuid = '11111111-1111-4111-8111-111111111111';
  const mitraUserId = '22222222-2222-4222-8222-222222222222';
  const mitraProfileId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entityClass, entity) => Promise.resolve(entity)),
      insert: jest.fn().mockResolvedValue(true),
      find: jest.fn().mockResolvedValue([]),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
      manager: mockEntityManager,
    };

    mockOrderRepo = {};
    mockOrderItemRepo = {};
    mockProductRepo = {};
    mockPaymentService = {};

    service = new OrderService(
      mockOrderRepo,
      mockOrderItemRepo,
      mockProductRepo,
      mockDataSource,
      mockPaymentService,
    );
  });

  it('should successfully update status from paid to accepted and activate chat conversation', async () => {
    const order = {
      id: validUuid,
      mitraId: mitraProfileId,
      status: OrderStatus.PAID,
    };
    const mitra = {
      id: mitraProfileId,
      userId: mitraUserId,
    };
    const conversation = {
      orderId: validUuid,
      status: ConversationStatus.WAITING,
    };

    mockEntityManager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === validUuid) return Promise.resolve(order);
      if (options?.where?.id === mitraProfileId) return Promise.resolve(mitra);
      if (options?.where?.orderId === validUuid) return Promise.resolve(conversation);
      return Promise.resolve(null);
    });

    const result = await service.updateOrderStatus(validUuid, mitraUserId, OrderStatus.ACCEPTED);

    expect(result.status).toBe(OrderStatus.ACCEPTED);
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      id: validUuid,
      status: OrderStatus.ACCEPTED,
    }));
    // Check conversation transitioned to ACTIVE
    expect(conversation.status).toBe(ConversationStatus.ACTIVE);
    // Check status log was written
    expect(mockEntityManager.insert).toHaveBeenCalled();
  });

  it('should reject invalid status transition from paid to completed directly via updateOrderStatus', async () => {
    const order = {
      id: validUuid,
      mitraId: mitraProfileId,
      status: OrderStatus.PAID,
    };
    const mitra = {
      id: mitraProfileId,
      userId: mitraUserId,
    };

    mockEntityManager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === validUuid) return Promise.resolve(order);
      if (options?.where?.id === mitraProfileId) return Promise.resolve(mitra);
      return Promise.resolve(null);
    });

    await expect(
      service.updateOrderStatus(validUuid, mitraUserId, OrderStatus.COMPLETED),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully complete order on verifyPickup with accepted status', async () => {
    const order = {
      id: validUuid,
      mitraId: mitraProfileId,
      status: OrderStatus.ACCEPTED,
      pickupCode: 'ABCD',
    };
    const mitra = {
      id: mitraProfileId,
      userId: mitraUserId,
    };
    const conversation = {
      orderId: validUuid,
      status: ConversationStatus.ACTIVE,
    };

    mockEntityManager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === validUuid) return Promise.resolve(order);
      if (options?.where?.id === mitraProfileId) return Promise.resolve(mitra);
      if (options?.where?.orderId === validUuid) return Promise.resolve(conversation);
      return Promise.resolve(null);
    });

    const result = await service.verifyPickup(validUuid, mitraUserId, 'abcd');

    expect(result.status).toBe(OrderStatus.COMPLETED);
    expect(conversation.status).toBe(ConversationStatus.CLOSED);
  });
});
