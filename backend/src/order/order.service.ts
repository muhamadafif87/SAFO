import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ChatGateway } from '../chat/chat.gateway';

// UUID v4 regex — guards against sending non-UUID strings to PostgreSQL uuid columns,
// which would cause: QueryFailedError: invalid input syntax for type uuid (pg 22P02)
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id: string, label = 'ID'): void {
  if (!UUID_REGEX.test(id)) {
    throw new BadRequestException(
      `${label} tidak valid: harus berupa UUID, diterima "${id}"`,
    );
  }
}

import { ConversationStatus } from '../database/entities/chat.enums';
import { Conversation } from '../database/entities/conversation.entity';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { OrderStatusLog } from '../database/entities/order-status-log.entity';
import { Order } from '../database/entities/order.entity';
import {
  canTransition,
  OrderStatus,
  STATUSES_REQUIRING_STOCK_RELEASE,
} from '../database/entities/order.enums';
import { PaymentStatus } from '../database/entities/payment.entity';
import { Product, ProductStatus } from '../database/entities/product.entity';
import { PaymentService } from '../payment/payment.service';
import { CreateOrderDto } from './dto/create-order.dto';

const PLATFORM_FEE = 1000; // Rp 1.000 fixed fee per SRS

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    @Optional()
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) { }

  /** Rejects any status jump that is not part of the canonical order flow. */
  private assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (from === to) return;
    if (!canTransition(from, to)) {
      throw new BadRequestException(
        `Transisi status tidak diizinkan: ${from} → ${to}`,
      );
    }
  }

  private async writeStatusLog(
    manager: EntityManager,
    orderId: string,
    from: OrderStatus | null,
    to: OrderStatus,
    changedBy: string | null,
  ): Promise<void> {
    await manager.insert(OrderStatusLog, {
      orderId,
      fromStatus: from,
      toStatus: to,
      changedById: changedBy,
    });
  }

  /**
   * Stock is reserved (decremented) at checkout. Cancelling or expiring an order
   * releases that reservation back to the product so it becomes sellable again.
   */
  private async releaseReservedStock(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    const items = await manager.find(OrderItem, { where: { orderId } });

    for (const item of items) {
      await manager.increment(
        Product,
        { id: item.productId },
        'stock',
        item.qty,
      );

      const product = await manager.findOne(Product, {
        where: { id: item.productId },
      });
      if (
        product &&
        product.stock > 0 &&
        product.status === ProductStatus.SOLD_OUT
      ) {
        await manager.update(
          Product,
          { id: item.productId },
          { status: ProductStatus.ACTIVE },
        );
      }
    }
  }

  private async syncConversationLifecycle(
    manager: EntityManager,
    orderId: string,
    to: OrderStatus,
  ): Promise<void> {
    let conversation = await manager.findOne(Conversation, {
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });

    const activeStatuses = [
      OrderStatus.ACCEPTED,
      OrderStatus.PROCESSING,
      OrderStatus.READY,
      OrderStatus.READY_FOR_PICKUP,
    ];

    if (!conversation) {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (order) {
        let initialStatus = ConversationStatus.WAITING;
        if (activeStatuses.includes(to)) {
          initialStatus = ConversationStatus.ACTIVE;
        } else if (
          to === OrderStatus.COMPLETED ||
          to === OrderStatus.CANCELLED ||
          to === OrderStatus.EXPIRED
        ) {
          initialStatus = ConversationStatus.CLOSED;
        }

        conversation = manager.create(Conversation, {
          orderId: order.id,
          customerId: order.customerId,
          mitraId: order.mitraId,
          status: initialStatus,
          startedAt: initialStatus === ConversationStatus.ACTIVE ? new Date() : null,
          closedAt: initialStatus === ConversationStatus.CLOSED ? new Date() : null,
          closeReason:
            to === OrderStatus.CANCELLED
              ? 'ORDER_CANCELLED'
              : to === OrderStatus.COMPLETED
              ? 'ORDER_COMPLETED'
              : null,
        });
        await manager.save(Conversation, conversation);
      }
    }

    if (conversation) {
      let statusChanged = false;

      if (
        activeStatuses.includes(to) &&
        conversation.status === ConversationStatus.WAITING
      ) {
        conversation.status = ConversationStatus.ACTIVE;
        conversation.startedAt = new Date();
        await manager.save(Conversation, conversation);
        statusChanged = true;
      } else if (
        to === OrderStatus.CANCELLED &&
        conversation.status !== ConversationStatus.CLOSED
      ) {
        conversation.status = ConversationStatus.CLOSED;
        conversation.closedAt = new Date();
        conversation.closeReason = 'ORDER_CANCELLED';
        await manager.save(Conversation, conversation);
        statusChanged = true;
      } else if (
        to === OrderStatus.COMPLETED &&
        conversation.status !== ConversationStatus.CLOSED
      ) {
        conversation.status = ConversationStatus.CLOSED;
        conversation.closedAt = new Date();
        conversation.closeReason = 'ORDER_COMPLETED';
        await manager.save(Conversation, conversation);
        statusChanged = true;
      }

      if (statusChanged && this.chatGateway) {
        try {
          this.chatGateway.emitConversationStatus(
            conversation.id,
            conversation.status,
            orderId,
          );
        } catch (err: any) {
          this.logger.warn(
            `Could not emit chat:status for conversation ${conversation.id}: ${err?.message}`,
          );
        }
      }
    }
  }

  /**
   * Single entry point for status changes: validates the transition, releases
   * reserved stock when the order ends, and records the audit trail.
   */
  private async transitionOrder(
    manager: EntityManager,
    order: Order,
    to: OrderStatus,
    changedBy: string | null,
  ): Promise<Order> {
    this.assertTransition(order.status, to);

    const from = order.status;
    if (
      (to === OrderStatus.CANCELLED || to === OrderStatus.EXPIRED) &&
      STATUSES_REQUIRING_STOCK_RELEASE.includes(from)
    ) {
      await this.releaseReservedStock(manager, order.id);
    }

    order.status = to;
    const saved = await manager.save(Order, order);
    await this.writeStatusLog(manager, order.id, from, to, changedBy);
    await this.syncConversationLifecycle(manager, order.id, to);
    return saved;
  }

  /**
   * Create an order using database-backed stock validation.
   * Redis is intentionally disabled for now.
   */
  async createOrder(customerId: string, dto: CreateOrderDto): Promise<Order> {
    const { items, note, paymentMethod } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Item pesanan tidak boleh kosong');
    }

    // 2. Create order in a DB transaction with pessimistic locking
    // Stock validation is done INSIDE the transaction to prevent race conditions (TOCTOU).
    return this.dataSource.transaction(async (manager) => {
      // Fetch full product data with pessimistic write lock (SELECT ... FOR UPDATE)
      const productIds = items.map((i) => i.productId);
      const products = await manager.find(Product, {
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validate all products and stock INSIDE the transaction
      for (const item of items) {
        const p = productMap.get(item.productId);
        if (!p) {
          throw new NotFoundException(`Produk ${item.productId} tidak ditemukan`);
        }
        if (p.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(`Produk ${p.name} tidak tersedia`);
        }
        if (p.stock < item.qty) {
          throw new BadRequestException(
            `Stok produk ${p.name} tidak cukup (tersisa ${p.stock})`,
          );
        }
      }

      // Single merchant per order validation
      const firstProduct = productMap.get(items[0].productId)!;
      const targetMitraId = firstProduct.mitraId;
      for (const p of products) {
        if (p.mitraId !== targetMitraId) {
          throw new BadRequestException(
            'Semua produk dalam satu pesanan harus berasal dari mitra yang sama',
          );
        }
      }

      let totalAmount = PLATFORM_FEE;
      for (const item of items) {
        const p = productMap.get(item.productId)!;
        totalAmount += p.discountPrice * item.qty;
      }

      // Generate 4-digit pickup code
      const pickupCode = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

      // Create order
      const order = manager.create(Order, {
        customerId,
        mitraId: targetMitraId,
        totalAmount,
        platformFee: PLATFORM_FEE,
        status: OrderStatus.PENDING_PAYMENT,
        pickupCode,
        note,
        paymentMethod,
      });
      await manager.save(Order, order);
      await this.writeStatusLog(
        manager,
        order.id,
        null,
        OrderStatus.PENDING_PAYMENT,
        customerId,
      );

      // Create 1:1 conversation in WAITING status
      const conversation = manager.create(Conversation, {
        orderId: order.id,
        customerId: order.customerId,
        mitraId: order.mitraId,
        status: ConversationStatus.WAITING,
      });
      await manager.save(Conversation, conversation);

      // Create order items & decrement DB stock
      for (const item of items) {
        const p = productMap.get(item.productId)!;

        const orderItem = manager.create(OrderItem, {
          orderId: order.id,
          productId: p.id,
          qty: item.qty,
          priceAtPurchase: p.discountPrice,
        });
        await manager.save(OrderItem, orderItem);

        // Decrement stock in DB
        await manager.decrement(Product, { id: p.id }, 'stock', item.qty);

        // Check if sold out
        const updated = await manager.findOne(Product, { where: { id: p.id } });
        if (updated && updated.stock <= 0) {
          await manager.update(
            Product,
            { id: p.id },
            { status: ProductStatus.SOLD_OUT },
          );
        }
      }

      return manager.findOne(Order, {
        where: { id: order.id },
        relations: { orderItems: { product: true }, mitra: true },
      }) as Promise<Order>;
    });
  }

  /**
   * Mock payment — simulates Midtrans webhook completing the payment.
   * Real implementation: verify signature from Midtrans POST /payment/notification.
   */
  async mockPayment(orderId: string, customerId: string): Promise<Order> {
    assertUuid(orderId, 'Order ID');

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.customerId !== customerId) throw new ForbiddenException();
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order sudah dibayar atau dibatalkan');
    }

    // Do NOT override paymentMethod — preserve what was set during createOrder
    return this.transitionOrder(
      this.dataSource.manager,
      order,
      OrderStatus.PAID,
      customerId,
    );
  }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customerId },
      relations: { orderItems: { product: true }, mitra: true, payments: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderById(orderId: string, customerId: string): Promise<Order> {
    assertUuid(orderId, 'Order ID');

    let order = await this.orderRepository.findOne({
      where: { id: orderId, customerId },
      relations: { orderItems: { product: true }, mitra: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // ── Payment Status Reconciliation for PENDING_PAYMENT orders ──
    if (order.status === OrderStatus.PENDING_PAYMENT && order.payments && order.payments.length > 0) {
      // 1. If any payment is already SUCCESS, ensure order status is updated to PAID
      const successPayment = order.payments.find((p) => p.status === PaymentStatus.SUCCESS);
      if (successPayment) {
        await this.transitionOrder(
          this.dataSource.manager,
          order,
          OrderStatus.PAID,
          null,
        );
        this.logger.log(
          `[Reconcile] Order ${order.id} marked as PAID due to existing SUCCESS payment ${successPayment.id}`,
        );
        return order;
      }

      // 2. If there is a pending Midtrans payment, actively reconcile with Midtrans API
      const pendingPayment = order.payments.find(
        (p) => p.status === PaymentStatus.PENDING && (p.transactionId || p.id),
      );
      if (pendingPayment) {
        try {
          await this.paymentService.getPaymentStatus(pendingPayment.id, customerId);
          // Reload fresh order with updated status and relations
          const refreshedOrder = await this.orderRepository.findOne({
            where: { id: orderId, customerId },
            relations: { orderItems: { product: true }, mitra: true, payments: true },
          });
          if (refreshedOrder) {
            order = refreshedOrder;
          }
        } catch (err: any) {
          this.logger.warn(
            `[Reconcile] Could not reconcile order ${orderId} via payment ${pendingPayment.id}: ${err?.message}`,
          );
        }
      }
    }

    return order;
  }

  /**
   * Query builder bersama untuk pesanan milik satu mitra.
   * customer di-select kolom demi kolom — sengaja TIDAK pakai
   * leftJoinAndSelect supaya password_hash tidak ikut terbawa ke response.
   */
  private mitraOrdersQuery(userId: string) {
    return this.orderRepository
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.mitra', 'mitra', 'mitra.userId = :userId', {
        userId,
      })
      .leftJoin('order.customer', 'customer')
      .addSelect([
        'customer.id',
        'customer.name',
        'customer.phone',
        'customer.email',
      ])
      .leftJoinAndSelect('order.orderItems', 'items')
      .leftJoinAndSelect('items.product', 'product');
  }

  async getMitraOrders(userId: string): Promise<Order[]> {
    return this.mitraOrdersQuery(userId)
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  /** Detail satu pesanan — hanya bisa diakses pemilik mitra-nya. */
  async getMitraOrderById(orderId: string, userId: string): Promise<Order> {
    assertUuid(orderId, 'Order ID');

    const order = await this.mitraOrdersQuery(userId)
      .andWhere('order.id = :orderId', { orderId })
      .getOne();

    if (!order) throw new NotFoundException('Order tidak ditemukan');
    return order;
  }

  async verifyPickup(
    orderId: string,
    mitraUserId: string,
    pickupCode: string,
  ): Promise<Order> {
    assertUuid(orderId, 'Order ID');

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order tidak ditemukan');

      const mitra = await manager.findOne(MitraProfile, {
        where: { id: order.mitraId },
      });
      if (!mitra || mitra.userId !== mitraUserId) throw new ForbiddenException();
      order.mitra = mitra;

      if (
        order.status !== OrderStatus.ACCEPTED &&
        order.status !== OrderStatus.PROCESSING &&
        order.status !== OrderStatus.READY &&
        order.status !== OrderStatus.READY_FOR_PICKUP
      ) {
        throw new BadRequestException(
          'Pesanan harus diterima mitra sebelum bisa diselesaikan',
        );
      }

      if (order.pickupCode !== pickupCode.toUpperCase()) {
        throw new BadRequestException('Kode pickup salah');
      }

      return this.transitionOrder(
        manager,
        order,
        OrderStatus.COMPLETED,
        mitraUserId,
      );
    });
  }

  async updateOrderStatus(
    orderId: string,
    mitraUserId: string,
    status: OrderStatus,
  ): Promise<Order> {
    assertUuid(orderId, 'Order ID');

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order tidak ditemukan');

      const mitra = await manager.findOne(MitraProfile, {
        where: { id: order.mitraId },
      });
      if (!mitra || mitra.userId !== mitraUserId) throw new ForbiddenException();
      order.mitra = mitra;

      const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
        [OrderStatus.PAID]: [
          OrderStatus.ACCEPTED,
          OrderStatus.PROCESSING,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.ACCEPTED]: [
          OrderStatus.PROCESSING,
          OrderStatus.READY,
          OrderStatus.READY_FOR_PICKUP,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.PROCESSING]: [
          OrderStatus.READY,
          OrderStatus.READY_FOR_PICKUP,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.READY]: [
          OrderStatus.READY_FOR_PICKUP,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.READY_FOR_PICKUP]: [
          OrderStatus.CANCELLED,
        ],
      };

      if (!allowedTransitions[order.status]?.includes(status)) {
        throw new BadRequestException(
          `Perubahan status dari ${order.status} ke ${status} tidak diizinkan`,
        );
      }

      return this.transitionOrder(
        manager,
        order,
        status,
        mitraUserId,
      );
    });
  }

  // Redis is intentionally disabled for now.
  // Stock validation remains DB-backed and order creation does not depend on a local Redis service.
}
