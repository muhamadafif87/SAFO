import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { OrderItem } from '../database/entities/order-item.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { PaymentMethod } from '../database/entities/order.enums';
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

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, status: ProductStatus.ACTIVE },
      });

      if (!product) {
        throw new NotFoundException(`Produk ${item.productId} tidak ditemukan`);
      }

      if (product.stock < item.qty) {
        throw new BadRequestException(
          `Stok produk ${product.name} tidak cukup`,
        );
      }
    }

    // 2. Create order in a DB transaction
    return this.dataSource.transaction(async (manager) => {
      // Fetch full product data for pricing
      const productIds = items.map((i) => i.productId);
      const products = await manager.findBy(Product, { id: In(productIds) });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = PLATFORM_FEE;
      for (const item of items) {
        const p = productMap.get(item.productId);
        if (!p)
          throw new NotFoundException(
            `Produk ${item.productId} tidak ditemukan`,
          );
        totalAmount += p.discountPrice * item.qty;
      }

      // Generate 4-digit pickup code
      const pickupCode = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

      const firstProduct = productMap.get(items[0].productId)!;

      // Create order
      const order = manager.create(Order, {
        customerId,
        mitraId: firstProduct.mitraId,
        totalAmount,
        platformFee: PLATFORM_FEE,
        status: OrderStatus.PENDING_PAYMENT,
        pickupCode,
        note,
        paymentMethod,
      });
      await manager.save(Order, order);

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
        relations: { orderItems: { product: true } },
      }) as Promise<Order>;
    });
  }

  /**
   * Mock payment — simulates Midtrans webhook completing the payment.
   * Real implementation: verify signature from Midtrans POST /payment/notification.
   */
  async mockPayment(orderId: string, customerId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.customerId !== customerId) throw new ForbiddenException();
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order sudah dibayar atau dibatalkan');
    }

    order.status = OrderStatus.PAID;
    order.paymentMethod = PaymentMethod.QRIS;
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
    const orders = await this.getMitraOrders(mitraUserId);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.READY_FOR_PICKUP
    ) {
      throw new BadRequestException('Order belum dibayar atau sudah selesai');
    }

    if (order.pickupCode !== pickupCode.toUpperCase()) {
      throw new BadRequestException('Kode pickup salah');
    }

    order.status = OrderStatus.COMPLETED;
    return this.orderRepository.save(order);
  }

  async updateOrderStatus(
    orderId: string,
    mitraUserId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const orders = await this.getMitraOrders(mitraUserId);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    order.status = status;
    return this.orderRepository.save(order);
  }

  // Redis is intentionally disabled for now.
  // Stock validation remains DB-backed and order creation does not depend on a local Redis service.
}
