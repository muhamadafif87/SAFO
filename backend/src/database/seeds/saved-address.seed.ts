/**
 * Seed: SavedAddress
 * ──────────────────
 * Jalankan setelah migration dengan:
 *   npx ts-node -r tsconfig-paths/register backend/src/database/seeds/saved-address.seed.ts
 *
 * Script ini:
 *  1. Mengambil semua user dengan role 'customer' dari DB
 *  2. Membuat 2-3 contoh alamat per customer (koordinat area Solo/Jebres)
 *  3. Tidak menduplikasi jika alamat dengan label yang sama sudah ada
 */

import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

config(); // load .env

// ─── Sample address data ──────────────────────────────────────────────────────

interface AddressSample {
  label: string;
  addressDetail: string;
  latitude: number;
  longitude: number;
  recipientName: string;
  recipientPhone: string;
  isPrimary: boolean;
}

const SAMPLE_ADDRESSES: AddressSample[] = [
  {
    label: 'Rumah',
    addressDetail: 'Jl. Monginsidi No. 45, Jebres, Surakarta, Jawa Tengah 57129',
    latitude: -7.5567,
    longitude: 110.8418,
    recipientName: 'Pengguna SAFO',
    recipientPhone: '+6281234567890',
    isPrimary: true,
  },
  {
    label: 'Kampus',
    addressDetail:
      'Universitas Sebelas Maret, Jl. Ir. Sutami No. 36A, Kentingan, Jebres, Surakarta',
    latitude: -7.5597,
    longitude: 110.8562,
    recipientName: 'Pengguna SAFO',
    recipientPhone: '+6281234567890',
    isPrimary: false,
  },
  {
    label: 'Warung Langganan',
    addressDetail: 'Jl. Slamet Riyadi No. 123, Sriwedari, Laweyan, Surakarta',
    latitude: -7.5689,
    longitude: 110.8141,
    recipientName: 'Pengguna SAFO',
    recipientPhone: '+6281234567890',
    isPrimary: false,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

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
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  // Ambil semua customer
  const customers = await dataSource.query<{ id: string; name: string }[]>(
    `SELECT id, name FROM users WHERE role = 'customer'`,
  );

  if (customers.length === 0) {
    console.log('⚠️  Tidak ada user customer ditemukan, seed dilewati.');
    await dataSource.destroy();
    return;
  }

  console.log(`📋 Ditemukan ${customers.length} customer`);
  let inserted = 0;

  for (const customer of customers) {
    for (let i = 0; i < SAMPLE_ADDRESSES.length; i++) {
      const sample = SAMPLE_ADDRESSES[i];

      // Cek apakah sudah ada alamat dengan label yang sama
      const existing = await dataSource.query(
        `SELECT id FROM saved_addresses WHERE user_id = $1 AND label = $2`,
        [customer.id, sample.label],
      );

      if (existing.length > 0) {
        console.log(`  ⏭  [${customer.name}] label "${sample.label}" sudah ada, dilewati`);
        continue;
      }

      // Variasikan sedikit koordinat agar tidak persis sama antar customer
      const latOffset = (Math.random() - 0.5) * 0.002;
      const lngOffset = (Math.random() - 0.5) * 0.002;

      await dataSource.query(
        `INSERT INTO saved_addresses
          (user_id, label, address_detail, latitude, longitude,
           recipient_name, recipient_phone, is_primary)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          customer.id,
          sample.label,
          sample.addressDetail,
          (sample.latitude + latOffset).toFixed(7),
          (sample.longitude + lngOffset).toFixed(7),
          customer.name || sample.recipientName,
          sample.recipientPhone,
          sample.isPrimary,
        ],
      );

      console.log(`  ✅ [${customer.name}] label "${sample.label}" ditambahkan`);
      inserted++;
    }
  }

  console.log(`\n🎉 Seed selesai — ${inserted} alamat baru ditambahkan`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed gagal:', err);
  process.exit(1);
});
