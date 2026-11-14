import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

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
import { OrderItem } from '../database/entities/order-item.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { Product, ProductStatus } from '../database/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

const PLATFORM_FEE = 1000; // Rp 1.000 fixed fee per SRS

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

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

    order.status = OrderStatus.PAID;
    // Do NOT override paymentMethod — preserve what was set during createOrder
    return this.orderRepository.save(order);
  }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customerId },
      relations: { orderItems: { product: true }, mitra: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderById(orderId: string, customerId: string): Promise<Order> {
    assertUuid(orderId, 'Order ID');

    const order = await this.orderRepository.findOne({
      where: { id: orderId, customerId },
      relations: { orderItems: { product: true }, mitra: true },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    return order;
  }

  async getMitraOrders(userId: string): Promise<Order[]> {
    // Join via mitra profile
    return this.orderRepository
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.mitra', 'mitra', 'mitra.userId = :userId', {
        userId,
      })
      .leftJoin('order.customer', 'customer')
      .addSelect(['customer.id', 'customer.name', 'customer.phone'])
      .leftJoinAndSelect('order.orderItems', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('order.createdAt', 'DESC')
      .getMany();
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
        relations: { mitra: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order tidak ditemukan');
      if (order.mitra.userId !== mitraUserId) throw new ForbiddenException();

      if (order.status !== OrderStatus.READY_FOR_PICKUP) {
        throw new BadRequestException('Pesanan belum siap diambil');
      }

      if (order.pickupCode !== pickupCode.toUpperCase()) {
        throw new BadRequestException('Kode pickup salah');
      }

      order.status = OrderStatus.COMPLETED;
      await manager.save(Order, order);

      // Close conversation in lock hierarchy
      const conversation = await manager.findOne(Conversation, {
        where: { orderId: order.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (conversation && conversation.status !== ConversationStatus.CLOSED) {
        conversation.status = ConversationStatus.CLOSED;
        conversation.closedAt = new Date();
        conversation.closeReason = 'ORDER_COMPLETED';
        await manager.save(Conversation, conversation);
      }

      return order;
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
        relations: { mitra: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order tidak ditemukan');
      if (order.mitra.userId !== mitraUserId) throw new ForbiddenException();

      const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
        [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [
          OrderStatus.READY_FOR_PICKUP,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.READY]: [
          OrderStatus.READY_FOR_PICKUP,
          OrderStatus.CANCELLED,
        ],
      };

      if (!allowedTransitions[order.status]?.includes(status)) {
        throw new BadRequestException(
          `Perubahan status dari ${order.status} ke ${status} tidak diizinkan`,
        );
      }

      order.status = status;
      await manager.save(Order, order);

      // Synchronize conversation lifecycle
      const conversation = await manager.findOne(Conversation, {
        where: { orderId: order.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (conversation) {
        if (
          status === OrderStatus.PROCESSING &&
          conversation.status === ConversationStatus.WAITING
        ) {
          conversation.status = ConversationStatus.ACTIVE;
          conversation.startedAt = new Date();
          await manager.save(Conversation, conversation);
        } else if (
          status === OrderStatus.CANCELLED &&
          conversation.status !== ConversationStatus.CLOSED
        ) {
          conversation.status = ConversationStatus.CLOSED;
          conversation.closedAt = new Date();
          conversation.closeReason = 'ORDER_CANCELLED';
          await manager.save(Conversation, conversation);
        }
      }

      return order;
    });
  }

  // Redis is intentionally disabled for now.
  // Stock validation remains DB-backed and order creation does not depend on a local Redis service.
}
