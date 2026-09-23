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

// ─── Promo Banners (dummy data, dapat diganti DB nantinya) ────────────────

export const PROMO_BANNERS = [
  {
    id: '1',
    title: 'Diskon Menjelang Tutup',
    subtitle: 'Dapatkan makanan nikmat dengan harga hemat.',
    emoji: '⏰',
    bgColor: '#1a5c52',
    accentColor: '#f59e0b',
  },
  {
    id: '2',
    title: 'Flash Sale Sore Ini!',
    subtitle: 'Hemat hingga 60% dari mitra terdekat.',
    emoji: '🔥',
    bgColor: '#7c3aed',
    accentColor: '#fbbf24',
  },
  {
    id: '3',
    title: 'Gratis Ongkir Weekend',
    subtitle: 'Pesan sekarang dan nikmati gratis ongkir.',
    emoji: '🚀',
    bgColor: '#0e7490',
    accentColor: '#34d399',
  },
];

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(MitraProfile)
    private mitraProfileRepository: Repository<MitraProfile>,
    private dataSource: DataSource,
  ) {}

  // ─── Promo Banners ────────────────────────────────────────────────────────

  getBanners() {
    return PROMO_BANNERS;
  }

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
   * Find active products near (lat, lng), with rating aggregation and flexible sort.
   * - sort=nearby   → ORDER BY distance (default)
   * - sort=discount → ORDER BY discount percentage DESC
   * - sort=rating   → ORDER BY average rating DESC
   * - search        → filter by product name or warung name (ILIKE)
   *
   * Uses PostGIS ST_DWithin. Falls back to full table scan (dev mode without PostGIS).
   */
  async findNearby(dto: NearbyProductsDto): Promise<any[]> {
    const { lat, lng, radiusKm = 5, sort = 'nearby', search } = dto;
    const radiusMeters = radiusKm * 1000;

    // Build ORDER BY clause based on sort param
    const orderByClause =
      sort === 'discount'
        ? 'ORDER BY ((p.original_price - p.discount_price) / p.original_price) DESC'
        : sort === 'rating'
        ? 'ORDER BY avg_rating DESC NULLS LAST'
        : 'ORDER BY distance_m ASC'; // nearby (default)

    // Build optional ILIKE search clause
    const searchClause = search
      ? `AND (p.name ILIKE '%' || $4 || '%' OR m.business_name ILIKE '%' || $4 || '%')`
      : '';

    const searchParams: any[] = search
      ? [lng, lat, radiusMeters, search]
      : [lng, lat, radiusMeters];

    try {
      // Native PostGIS query with rating aggregation
      const rows = await this.dataSource.query(
        `
        SELECT
          p.*,
          m.business_name    AS "businessName",
          m.address          AS "mitraAddress",
          m.photo_url        AS "mitraPhotoUrl",
          m.latitude         AS "mitraLatitude",
          m.longitude        AS "mitraLongitude",
          ROUND(AVG(r.rating)::numeric, 1) AS "avgRating",
          COUNT(r.id)::int                 AS "reviewCount",
          ST_Distance(
            m.location::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance_m
        FROM products p
        JOIN mitra_profiles m ON m.id = p.mitra_id
        LEFT JOIN reviews r
          ON r.id IN (
            SELECT rv.id FROM reviews rv
            JOIN orders o ON o.id = rv.order_id
            JOIN order_items oi ON oi.order_id = o.id
            WHERE oi.product_id = p.id
          )
        WHERE p.status = 'active'
          AND p.stock > 0
          AND p.pickup_window_end > NOW()
          AND ST_DWithin(
            m.location::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
          ${searchClause}
        GROUP BY p.id, m.id, distance_m
        ${orderByClause}
        LIMIT 50
        `,
        searchParams,
      );

      return rows.map((row) => this.mapRowToProductResponse(row));
    } catch {
      // Fallback: no PostGIS — return all active products with mock rating
      const where: any = { status: ProductStatus.ACTIVE };
      const products = await this.productRepository.find({
        where,
        relations: { mitra: true },
        order: { pickupWindowEnd: 'ASC' },
        take: 50,
      });

      let result = products.map((p) => ({
        ...p,
        mitra: p.mitra
          ? {
              businessName: p.mitra.businessName,
              address: p.mitra.address,
              latitude: p.mitra.latitude,
              longitude: p.mitra.longitude,
              photoUrl: p.mitra.photoUrl,
              distanceKm: null,
            }
          : undefined,
        avgRating: (Math.random() * 1 + 4).toFixed(1), // mock 4.0–5.0
        reviewCount: Math.floor(Math.random() * 100) + 5,
      }));

      // Apply search filter in fallback
      if (search) {
        const kw = search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(kw) ||
            p.mitra?.businessName?.toLowerCase().includes(kw),
        );
      }

      // Apply sort in fallback
      if (sort === 'discount') {
        result.sort(
          (a, b) =>
            (Number(b.originalPrice) - Number(b.discountPrice)) / Number(b.originalPrice) -
            (Number(a.originalPrice) - Number(a.discountPrice)) / Number(a.originalPrice),
        );
      } else if (sort === 'rating') {
        result.sort((a, b) => Number(b.avgRating) - Number(a.avgRating));
      }

      return result;
    }
  }

  private mapRowToProductResponse(row: any) {
    return {
      id: row.id,
      mitraId: row.mitra_id,
      name: row.name,
      description: row.description,
      photoUrl: row.photo_url,
      originalPrice: Number(row.original_price),
      discountPrice: Number(row.discount_price),
      stock: Number(row.stock),
      pickupWindowStart: row.pickup_window_start,
      pickupWindowEnd: row.pickup_window_end,
      status: row.status,
      avgRating: row.avgRating ? Number(row.avgRating) : null,
      reviewCount: Number(row.reviewCount) || 0,
      distanceKm: row.distance_m ? (Number(row.distance_m) / 1000).toFixed(1) : null,
      mitra: {
        businessName: row.businessName,
        address: row.mitraAddress,
        latitude: Number(row.mitraLatitude),
        longitude: Number(row.mitraLongitude),
        photoUrl: row.mitraPhotoUrl,
      },
    };
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
