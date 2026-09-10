import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { Order } from '../database/entities/order.entity';
import { Payment } from '../database/entities/payment.entity';
import { Product } from '../database/entities/product.entity';
import { User } from '../database/entities/user.entity';
import { OrderController } from './order.controller';
import { OrderProcessor } from './order.processor';
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      User,
      MitraProfile,
      Payment,
    ]),
    BullModule.registerQueue({ name: 'order' }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor],
  exports: [OrderService],
})
export class OrderModule {}
