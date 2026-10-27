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
import { LiveProductsDto } from './dto/live-products.dto';

function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

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
   * Mengambil daftar makanan yang sedang LIVE di aplikasi:
   *  - Filter: status = 'active' AND stock > 0
   *  - Menghitung nama resto, rating resto, nama menu, harga & info potongan diskon,
   *    jarak user dengan restoran (jika lat & lng dikirim), dan foto menu.
   */
  async findLiveProducts(dto: LiveProductsDto): Promise<any[]> {
    const { lat, lng, limit = 20 } = dto;
    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

    try {
      if (hasCoordinates) {
        const rows = await this.dataSource.query(
          `
          SELECT
            p.id,
            p.mitra_id,
            p.name,
            p.description,
            p.photo_url,
            p.original_price,
            p.discount_price,
            p.stock,
            p.pickup_window_start,
            p.pickup_window_end,
            p.status,
            m.business_name    AS "businessName",
            m.address          AS "mitraAddress",
            m.photo_url        AS "mitraPhotoUrl",
            m.latitude         AS "mitraLatitude",
            m.longitude        AS "mitraLongitude",
            ROUND(COALESCE(AVG(r.rating), 4.8)::numeric, 1) AS "avgRating",
            COUNT(r.id)::int                                 AS "reviewCount",
            CASE 
              WHEN m.location IS NOT NULL THEN
                ST_Distance(
                  m.location::geography,
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                )
              ELSE 0
            END AS distance_m
          FROM products p
          JOIN mitra_profiles m ON m.id = p.mitra_id
          LEFT JOIN orders o ON o.mitra_id = m.id
          LEFT JOIN reviews r ON r.order_id = o.id
          WHERE p.status = 'active'
            AND p.stock > 0
          GROUP BY p.id, m.id
          ORDER BY distance_m ASC, p.created_at DESC
          LIMIT $3
          `,
          [lng, lat, limit],
        );

        return rows.map((row) => this.mapRowToLiveProductResponse(row, lat, lng));
      } else {
        const rows = await this.dataSource.query(
          `
          SELECT
            p.id,
            p.mitra_id,
            p.name,
            p.description,
            p.photo_url,
            p.original_price,
            p.discount_price,
            p.stock,
            p.pickup_window_start,
            p.pickup_window_end,
            p.status,
            m.business_name    AS "businessName",
            m.address          AS "mitraAddress",
            m.photo_url        AS "mitraPhotoUrl",
            m.latitude         AS "mitraLatitude",
            m.longitude        AS "mitraLongitude",
            ROUND(COALESCE(AVG(r.rating), 4.8)::numeric, 1) AS "avgRating",
            COUNT(r.id)::int                                 AS "reviewCount",
            0 AS distance_m
          FROM products p
          JOIN mitra_profiles m ON m.id = p.mitra_id
          LEFT JOIN orders o ON o.mitra_id = m.id
          LEFT JOIN reviews r ON r.order_id = o.id
          WHERE p.status = 'active'
            AND p.stock > 0
          GROUP BY p.id, m.id
          ORDER BY p.created_at DESC
          LIMIT $1
          `,
          [limit],
        );

        return rows.map((row) => this.mapRowToLiveProductResponse(row));
      }
    } catch (dbErr) {
      console.warn('[findLiveProducts] DB query fallback to TypeORM find:', dbErr);
      const products = await this.productRepository.find({
        where: { status: ProductStatus.ACTIVE },
        relations: { mitra: true },
        order: { createdAt: 'DESC' },
        take: limit,
      });

      return products
        .filter((p) => Number(p.stock) > 0)
        .map((p) => {
          const origPrice = Number(p.originalPrice) || 0;
          const discPrice = Number(p.discountPrice) || 0;
          const discountPercent =
            origPrice > 0 ? Math.round(((origPrice - discPrice) / origPrice) * 100) : 0;
          const discountAmount = Math.max(0, origPrice - discPrice);

          let distanceKm: number | null = null;
          if (hasCoordinates && p.mitra?.latitude && p.mitra?.longitude) {
            distanceKm = calculateHaversineDistanceKm(
              lat,
              lng,
              Number(p.mitra.latitude),
              Number(p.mitra.longitude),
            );
          }

          const rating = 4.8;
          const reviewCount = 20;

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            photoUrl: this.sanitizePhotoUrl(p.photoUrl, p.name),
            originalPrice: origPrice,
            discountPrice: discPrice,
            discountPercent,
            discountAmount,
            formattedDiscount: `Hemat ${discountPercent}%`,
            stock: Number(p.stock),
            status: p.status,
            pickupWindowStart: p.pickupWindowStart,
            pickupWindowEnd: p.pickupWindowEnd,
            distanceKm,
            avgRating: rating,
            reviewCount,
            restaurant: {
              id: p.mitra?.id,
              name: p.mitra?.businessName ?? 'Restoran Mitra',
              rating,
              reviewCount,
              address: p.mitra?.address ?? '',
              latitude: p.mitra?.latitude,
              longitude: p.mitra?.longitude,
              photoUrl: p.mitra?.photoUrl,
            },
            mitra: {
              businessName: p.mitra?.businessName ?? 'Restoran Mitra',
              address: p.mitra?.address ?? '',
              latitude: p.mitra?.latitude,
              longitude: p.mitra?.longitude,
              photoUrl: p.mitra?.photoUrl,
              distanceKm,
            },
          };
        });
    }
  }

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
      ? `AND (p.name ILIKE '%' || $3 || '%' OR m.business_name ILIKE '%' || $3 || '%')`
      : '';

    const searchParams: any[] = search
      ? [lng, lat, search]
      : [lng, lat];

    try {
      // Native PostGIS query with rating aggregation from all mitras
      const rows = await this.dataSource.query(
        `
        SELECT
          p.id,
          p.mitra_id,
          p.name,
          p.description,
          p.photo_url,
          p.original_price,
          p.discount_price,
          p.stock,
          p.pickup_window_start,
          p.pickup_window_end,
          p.status,
          m.business_name    AS "businessName",
          m.address          AS "mitraAddress",
          m.photo_url        AS "mitraPhotoUrl",
          m.latitude         AS "mitraLatitude",
          m.longitude        AS "mitraLongitude",
          ROUND(AVG(r.rating)::numeric, 1) AS "avgRating",
          COUNT(r.id)::int                 AS "reviewCount",
          CASE 
            WHEN m.location IS NOT NULL THEN
              ST_Distance(
                m.location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
              )
            ELSE 0
          END AS distance_m
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
          ${searchClause}
        GROUP BY p.id, m.id
        ${orderByClause}
        LIMIT 50
        `,
        searchParams,
      );

      return rows.map((row) => this.mapRowToProductResponse(row));
    } catch (dbErr) {
      console.warn('[findNearby] PostGIS query error, using TypeORM fallback:', dbErr);
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
        photoUrl: this.sanitizePhotoUrl(p.photoUrl, p.name),
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

  private sanitizePhotoUrl(photoUrl?: string, name?: string): string {
    if (
      photoUrl &&
      !photoUrl.includes('storage.safo.id') &&
      !photoUrl.includes('dashboard') &&
      photoUrl.startsWith('http')
    ) {
      return photoUrl;
    }
    const defaultPhotos: Record<string, string> = {
      'roti sobek': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      'donat': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
      'geprek': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
      'soto': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      'liwet': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
      'pecel': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      'brownies': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
      'cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
      'pastel': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
      'roti tawar': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      'roti manis': 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80',
      'roti': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      'bolu': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
      'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      'rames': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      'puding': 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80',
    };
    if (name) {
      const lower = name.toLowerCase();
      for (const [k, url] of Object.entries(defaultPhotos)) {
        if (lower.includes(k)) return url;
      }
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  }

  private mapRowToLiveProductResponse(row: any, userLat?: number, userLng?: number) {
    const origPrice = Number(row.original_price) || 0;
    const discPrice = Number(row.discount_price) || 0;
    const discountPercent =
      origPrice > 0 ? Math.round(((origPrice - discPrice) / origPrice) * 100) : 0;
    const discountAmount = Math.max(0, origPrice - discPrice);

    let distanceKm: number | null = null;
    if (row.distance_m && Number(row.distance_m) > 0) {
      distanceKm = Number((Number(row.distance_m) / 1000).toFixed(1));
    } else if (
      userLat !== undefined &&
      userLng !== undefined &&
      row.mitraLatitude &&
      row.mitraLongitude
    ) {
      distanceKm = calculateHaversineDistanceKm(
        userLat,
        userLng,
        Number(row.mitraLatitude),
        Number(row.mitraLongitude),
      );
    }

    const rating = row.avgRating ? Number(row.avgRating) : 4.8;
    const reviewCount = row.reviewCount ? Number(row.reviewCount) : 15;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      photoUrl: this.sanitizePhotoUrl(row.photo_url, row.name),
      originalPrice: origPrice,
      discountPrice: discPrice,
      discountPercent,
      discountAmount,
      formattedDiscount: `Hemat ${discountPercent}%`,
      stock: Number(row.stock),
      status: row.status,
      pickupWindowStart: row.pickup_window_start,
      pickupWindowEnd: row.pickup_window_end,
      distanceKm,
      avgRating: rating,
      reviewCount,
      restaurant: {
        id: row.mitra_id,
        name: row.businessName,
        rating,
        reviewCount,
        address: row.mitraAddress,
        latitude: Number(row.mitraLatitude),
        longitude: Number(row.mitraLongitude),
        photoUrl: row.mitraPhotoUrl,
      },
      mitra: {
        businessName: row.businessName,
        address: row.mitraAddress,
        latitude: Number(row.mitraLatitude),
        longitude: Number(row.mitraLongitude),
        photoUrl: row.mitraPhotoUrl,
        distanceKm,
      },
    };
  }

  private mapRowToProductResponse(row: any) {
    return {
      id: row.id,
      mitraId: row.mitra_id,
      name: row.name,
      description: row.description,
      photoUrl: this.sanitizePhotoUrl(row.photo_url, row.name),
      originalPrice: Number(row.original_price),
      discountPrice: Number(row.discount_price),
      stock: Number(row.stock),
      pickupWindowStart: row.pickup_window_start,
      pickupWindowEnd: row.pickup_window_end,
      status: row.status,
      avgRating: row.avgRating ? Number(row.avgRating) : 4.8,
      reviewCount: Number(row.reviewCount) || 12,
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

  async getProductById(id: string): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { mitra: true },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    return {
      ...product,
      photoUrl: this.sanitizePhotoUrl(product.photoUrl, product.name),
      mitra: product.mitra
        ? {
            businessName: product.mitra.businessName,
            address: product.mitra.address,
            latitude: product.mitra.latitude,
            longitude: product.mitra.longitude,
            photoUrl: product.mitra.photoUrl,
          }
        : undefined,
    };
  }
}
