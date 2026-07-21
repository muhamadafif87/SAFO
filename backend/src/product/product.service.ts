import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product, ProductStatus } from '../database/entities/product.entity';
import { MitraProfile, VerificationStatus } from '../database/entities/mitra-profile.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { NearbyProductsDto } from './dto/nearby-products.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(MitraProfile)
    private mitraProfileRepository: Repository<MitraProfile>,
    private dataSource: DataSource,
  ) {}

  // ─── Mitra: CRUD ─────────────────────────────────────────────────────────

  async createProduct(userId: string, dto: CreateProductDto): Promise<Product> {
    const profile = await this.mitraProfileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');
    if (profile.verificationStatus !== VerificationStatus.APPROVED) {
      throw new ForbiddenException('Akun mitra belum diverifikasi');
    }

    const product = this.productRepository.create({
      mitraId: profile.id,
      name: dto.name,
      description: dto.description,
      originalPrice: dto.originalPrice,
      discountPrice: dto.discountPrice,
      stock: dto.stock,
      pickupWindowStart: new Date(dto.pickupWindowStart),
      pickupWindowEnd: new Date(dto.pickupWindowEnd),
      status: ProductStatus.ACTIVE,
    });

    return this.productRepository.save(product);
  }

  async getMyProducts(userId: string): Promise<Product[]> {
    const profile = await this.mitraProfileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');

    return this.productRepository.find({
      where: { mitraId: profile.id },
      order: { createdAt: 'DESC' },
    });
  }

  async updateProduct(
    userId: string,
    productId: string,
    dto: Partial<CreateProductDto>,
  ): Promise<Product> {
    const profile = await this.mitraProfileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');

    const product = await this.productRepository.findOne({
      where: { id: productId, mitraId: profile.id },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    Object.assign(product, {
      ...dto,
      pickupWindowStart: dto.pickupWindowStart ? new Date(dto.pickupWindowStart) : product.pickupWindowStart,
      pickupWindowEnd: dto.pickupWindowEnd ? new Date(dto.pickupWindowEnd) : product.pickupWindowEnd,
    });

    return this.productRepository.save(product);
  }

  async deleteProduct(userId: string, productId: string): Promise<void> {
    const profile = await this.mitraProfileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');

    const product = await this.productRepository.findOne({
      where: { id: productId, mitraId: profile.id },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    // Soft-delete: mark as inactive
    product.status = ProductStatus.INACTIVE;
    await this.productRepository.save(product);
  }

  // ─── Customer: Discovery ─────────────────────────────────────────────────

  /**
   * Find active flash-sale products within `radiusKm` km of (lat, lng).
   * Uses PostGIS ST_DWithin. Falls back to returning all active if PostGIS
   * is not available (for local dev without PostGIS extension).
   */
  async findNearby(dto: NearbyProductsDto): Promise<Product[]> {
    const { lat, lng, radiusKm = 5 } = dto;
    const radiusMeters = radiusKm * 1000;

    try {
      // Native PostGIS query — requires pg extension postgis
      return await this.dataSource.query(
        `
        SELECT p.*, m."business_name", m.address
        FROM products p
        JOIN mitra_profiles m ON m.id = p."mitra_id"
        WHERE p.status = 'active'
          AND p.stock > 0
          AND p."pickup_window_end" > NOW()
          AND ST_DWithin(
            m.location::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY ST_Distance(
          m.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )
        LIMIT 50
        `,
        [lng, lat, radiusMeters],
      );
    } catch {
      // Fallback: return all active products without geo-filter (dev mode)
      return this.productRepository.find({
        where: { status: ProductStatus.ACTIVE },
        relations: { mitra: true },
        order: { pickupWindowEnd: 'ASC' },
        take: 50,
      });
    }
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { mitra: true },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    return product;
  }
}
