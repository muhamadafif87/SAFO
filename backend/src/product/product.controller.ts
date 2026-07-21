import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { NearbyProductsDto } from './dto/nearby-products.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../database/entities/user.entity';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ─── Public / Customer ────────────────────────────────────────────────────

  @Public()
  @Get('nearby')
  findNearby(@Query() dto: NearbyProductsDto) {
    return this.productService.findNearby(dto);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  // ─── Mitra ────────────────────────────────────────────────────────────────

  @Roles(UserRole.MITRA)
  @Get('mitra/mine')
  getMyProducts(@Request() req) {
    return this.productService.getMyProducts(req.user.userId);
  }

  @Roles(UserRole.MITRA)
  @Post()
  create(@Request() req, @Body() dto: CreateProductDto) {
    return this.productService.createProduct(req.user.userId, dto);
  }

  @Roles(UserRole.MITRA)
  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.productService.updateProduct(req.user.userId, id, dto);
  }

  @Roles(UserRole.MITRA)
  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.productService.deleteProduct(req.user.userId, id);
  }
}
