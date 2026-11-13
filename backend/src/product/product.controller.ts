import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query, Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { LiveProductsDto } from './dto/live-products.dto';
import { NearbyProductsDto } from './dto/nearby-products.dto';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // ─── Public / Customer ────────────────────────────────────────────────────

  @Public()
  @Get('banners')
  getBanners() {
    return this.productService.getBanners();
  }

  @Public()
  @Get('live')
  getLiveProducts(@Query() dto: LiveProductsDto) {
    return this.productService.findLiveProducts(dto);
  }

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
  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  uploadPhoto(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp|image\/.*)/i,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.productService.uploadProductPhoto(req.user.userId, id, file);
  }

  @Roles(UserRole.MITRA)
  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.productService.deleteProduct(req.user.userId, id);
  }
}
