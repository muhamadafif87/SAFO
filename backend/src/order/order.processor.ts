import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { Product } from '../database/entities/product.entity';
import { Logger } from '@nestjs/common';

@Processor('order')
export class OrderProcessor {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  @Process('expire-unpaid-order')
  async handleOrderExpiry(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;
    this.logger.log(`Processing order expiry for order: ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { orderItems: true },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found during expiry processing`);
      return;
    }

    // Only cancel if still pending payment
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      this.logger.log(`Order ${orderId} already processed (status: ${order.status}), skipping`);
      return;
    }

    // Restore stock
    for (const item of order.orderItems) {
      await this.productRepository.increment({ id: item.productId }, 'stock', item.qty);
      this.logger.log(`Restored ${item.qty} stock for product ${item.productId}`);
    }

    // Cancel order
    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);
    this.logger.log(`Order ${orderId} expired and cancelled — stock restored`);
  }
}
