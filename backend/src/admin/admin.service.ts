import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { MitraProfile, VerificationStatus } from '../database/entities/mitra-profile.entity';
import { User, UserRole, UserStatus } from '../database/entities/user.entity';
import { Product } from '../database/entities/product.entity';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(MitraProfile)
    private mitraProfileRepository: Repository<MitraProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getDashboardStats() {
    const [
      totalMitra,
      pendingMitra,
      totalTransactions,
      completedTransactions,
    ] = await Promise.all([
      this.mitraProfileRepository.count({ where: { verificationStatus: VerificationStatus.APPROVED } }),
      this.mitraProfileRepository.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
      this.orderRepository.count(),
      this.orderRepository.count({ where: { status: OrderStatus.COMPLETED } }),
    ]);

    // Total platform revenue
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.platformFee)', 'total')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    return {
      totalMitra,
      pendingMitra,
      totalTransactions,
      completedTransactions,
      totalPlatformRevenue: parseFloat(revenueResult?.total || '0'),
    };
  }

  async getAllTransactions() {
    return this.orderRepository.find({
      relations: { customer: true, mitra: true, orderItems: { product: true } },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getPlatformFee(): Promise<number> {
    // In a real app, store this in a settings table. For now, hardcoded.
    return 1000;
  }

  async suspendUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    user.status = UserStatus.SUSPENDED;
    await this.userRepository.save(user);
    return { message: 'User suspended successfully' };
  }
}
