import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Order } from '../database/entities/order.entity';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { User } from '../database/entities/user.entity';
import { Product } from '../database/entities/product.entity';
import { MitraModule } from '../mitra/mitra.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, MitraProfile, User, Product]), MitraModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
