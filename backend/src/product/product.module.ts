import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Product } from '../database/entities/product.entity';
import { MitraProfile } from '../database/entities/mitra-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, MitraProfile])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
