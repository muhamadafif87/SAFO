/**
 * Seed: Live Products & Mitra
 * ────────────────────────────
 * Jalankan dengan:
 *   npx ts-node -r tsconfig-paths/register backend/src/database/seeds/products.seed.ts
 *
 * Script ini:
 *  1. Memastikan ada Mitra terverifikasi (approved) di DB
 *  2. Menambahkan daftar menu makanan live (status = 'active', stock > 0)
 *  3. Menambahkan review sample untuk rating restoran
 */

import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

config(); // load .env

interface SampleMitra {
  email: string;
  name: string;
  businessName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  products: {
    name: string;
    description: string;
    originalPrice: number;
    discountPrice: number;
    stock: number;
    photoUrl: string;
  }[];
}

const SAMPLE_MITRAS: SampleMitra[] = [
  {
    email: 'mitra.kumlot@safo.app',
    name: 'Pak Kumlot',
    businessName: 'Geprek Kumlot Jebres',
    category: 'Ayam & Bebek',
    address: 'Jl. Merdeka No. 106, Jebres, Surakarta',
    latitude: -7.5567,
    longitude: 110.8418,
    photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
    products: [
      {
        name: 'Geprek Dada Bakar Madu',
        description: 'Ayam geprek dada bakar dengan lumuran madu manis gurih plus sambal bawang pedas nampol.',
        originalPrice: 28000,
        discountPrice: 16000,
        stock: 5,
        photoUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: 'Paket Hemat Nasi Kulit Krispi',
        description: 'Kulit ayam krispi renyah dengan nasi hangat dan lalapan segar.',
        originalPrice: 22000,
        discountPrice: 12000,
        stock: 8,
        photoUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },
  {
    email: 'mitra.tokoroti@safo.app',
    name: 'Ibu Ratna',
    businessName: 'Artisan Bakery & Pastry',
    category: 'Roti & Kue',
    address: 'Jl. Ir. Sutami No. 42, Kentingan, Surakarta',
    latitude: -7.5597,
    longitude: 110.8562,
    photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    products: [
      {
        name: 'Butter Croissant & Danish Box (Isi 3)',
        description: 'Surplus bake sore: French butter croissant wangi renyah danish berry manis.',
        originalPrice: 48000,
        discountPrice: 24000,
        stock: 4,
        photoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: 'Donat Glaze Cokelat Keju (Isi 4)',
        description: 'Donat lembut buatan hari ini dengan topping cokelat lumer dan parutan keju melimpah.',
        originalPrice: 36000,
        discountPrice: 18000,
        stock: 6,
        photoUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },
  {
    email: 'mitra.ramen@safo.app',
    name: 'Kenji Tan',
    businessName: 'Tokyo Ramen & Bento',
    category: 'Jepang',
    address: 'Jl. Slamet Riyadi No. 150, Surakarta',
    latitude: -7.5689,
    longitude: 110.8141,
    photoUrl: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=400&q=80',
    products: [
      {
        name: 'Spicy Chashu Ramen Bowl',
        description: 'Mie ramen kenyal dengan kuah kaldu tori paitan gurih pedas, chashu empuk, dan ajitsuke tamago.',
        originalPrice: 45000,
        discountPrice: 27000,
        stock: 4,
        photoUrl: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },
  {
    email: 'mitra.nasipadang@safo.app',
    name: 'Uda Hendra',
    businessName: 'RM Sederhana Minang',
    category: 'Nasi & Lauk',
    address: 'Jl. Urip Sumoharjo No. 88, Surakarta',
    latitude: -7.5621,
    longitude: 110.8354,
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
    products: [
      {
        name: 'Nasi Box Rendang Daging Sapi',
        description: 'Rendang daging sapi empuk dengan bumbu kelapa pekat, daun singkong, dan sambal ijo khas Minang.',
        originalPrice: 35000,
        discountPrice: 20000,
        stock: 7,
        photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },
];

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    ...(process.env.DATABASE_URL
      ? { url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'safo',
          password: process.env.DB_PASSWORD || 'safo_password',
          database: process.env.DB_NAME || 'safo_db',
        }),
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected for Live Products seeding');

  const passwordHash = await bcrypt.hash('password123', 10);
  let totalProductsAdded = 0;

  for (const m of SAMPLE_MITRAS) {
    // 1. Cek atau buat user mitra
    let user = (
      await dataSource.query<{ id: string }[]>(
        `SELECT id FROM users WHERE email = $1`,
        [m.email],
      )
    )[0];

    if (!user) {
      const insertedUser = await dataSource.query<{ id: string }[]>(
        `INSERT INTO users (email, password_hash, role, status, phone)
         VALUES ($1, $2, 'mitra', 'active', '+628123450000')
         RETURNING id`,
        [m.email, passwordHash],
      );
      user = insertedUser[0];
      console.log(`👤 User mitra dibuat: ${m.email}`);
    }

    // 2. Cek atau buat mitra_profile
    let profile = (
      await dataSource.query<{ id: string }[]>(
        `SELECT id FROM mitra_profiles WHERE user_id = $1`,
        [user.id],
      )
    )[0];

    if (!profile) {
      const insertedProfile = await dataSource.query<{ id: string }[]>(
        `INSERT INTO mitra_profiles
          (user_id, business_name, category, address, latitude, longitude,
           verification_status, verified_at, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', now(), $7)
         RETURNING id`,
        [
          user.id,
          m.businessName,
          m.category,
          m.address,
          m.latitude,
          m.longitude,
          m.photoUrl,
        ],
      );
      profile = insertedProfile[0];
      console.log(`🏪 Mitra profile dibuat: ${m.businessName}`);
    }

    // 3. Masukkan produk live
    const now = new Date();
    const pickupStart = new Date(now.getTime() + 30 * 60 * 1000); // 30 menit dari sekarang
    const pickupEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 jam dari sekarang

    for (const prod of m.products) {
      const existingProduct = await dataSource.query<{ id: string }[]>(
        `SELECT id FROM products WHERE mitra_id = $1 AND name = $2`,
        [profile.id, prod.name],
      );

      if (existingProduct.length > 0) {
        // Update status = 'active' dan pastikan stock > 0
        await dataSource.query(
          `UPDATE products
           SET status = 'active',
               stock = $1,
               original_price = $2,
               discount_price = $3,
               photo_url = $4,
               updated_at = now()
           WHERE id = $5`,
          [
            prod.stock,
            prod.originalPrice,
            prod.discountPrice,
            prod.photoUrl,
            existingProduct[0].id,
          ],
        );
        console.log(`  🔄 Produk "${prod.name}" diperbarui menjadi LIVE (stock: ${prod.stock})`);
      } else {
        await dataSource.query(
          `INSERT INTO products
            (mitra_id, name, description, photo_url, original_price, discount_price,
             stock, pickup_window_start, pickup_window_end, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
          [
            profile.id,
            prod.name,
            prod.description,
            prod.photoUrl,
            prod.originalPrice,
            prod.discountPrice,
            prod.stock,
            pickupStart.toISOString(),
            pickupEnd.toISOString(),
          ],
        );
        console.log(`  ✨ Produk "${prod.name}" ditambahkan LIVE`);
        totalProductsAdded++;
      }
    }
  }

  console.log(`\n🎉 Seed live products selesai! Total ${totalProductsAdded} menu baru ditambahkan.`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Gagal menjalankan seed live products:', err);
  process.exit(1);
});
