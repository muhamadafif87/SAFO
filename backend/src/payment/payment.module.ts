import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../database/entities/order.entity';
import { Payment } from '../database/entities/payment.entity';
import { MidtransService } from './midtrans.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, MidtransService],
  exports: [PaymentService, MidtransService],
})
export class PaymentModule {}
