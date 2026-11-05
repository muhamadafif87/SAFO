import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `accepted` order status used by the mitra "Terima Pesanan" flow.
 *
 * Catatan penting:
 * - Nama tipe enum di DB live adalah `public.order_status` (dibuat dari
 *   `schema.sql`), sedangkan `InitialMigration` membuat
 *   `public.orders_status_enum`. Karena itu migrasi ini MENCARI nama tipe
 *   yang benar-benar mem back kolom `orders.status`, bukan hardcode nama.
 * - PostgreSQL TIDAK mendukung penghapusan nilai enum, sehingga `down()`
 *   hanya mengembalikan baris ke 'paid' dan membiarkan nilai 'accepted'
 *   tetap ada pada tipe-nya.
 * - `ALTER TYPE ... ADD VALUE` aman di dalam transaksi pada PG 12+
 *   selama nilai baru tidak dipakai di transaksi yang sama. Migrasi ini
 *   hanya menambah, tidak membaca kembali nilai tersebut.
 */
export class AddOrderStatusAccepted1793200000000 implements MigrationInterface {
  name = 'AddOrderStatusAccepted1793200000000';

  /** Cari tipe enum yang mem-back kolom public.orders.status. */
  private static readonly FIND_STATUS_TYPE = `
    SELECT format('%I.%I', n.nspname, t.typname) AS enum_type
    FROM pg_type t
    JOIN pg_attribute a
      ON a.atttypid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'orders'
      AND a.attname = 'status'
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      AddOrderStatusAccepted1793200000000.FIND_STATUS_TYPE,
    );
    const enumType: string | undefined = rows?.[0]?.enum_type;

    if (!enumType) {
      // Tabel/type belum ada (DB kosong) — biarkan saja, InitialMigration
      // yang akan membuatnya dengan daftar status lengkap.
      return;
    }

    await queryRunner.query(
      `ALTER TYPE ${enumType} ADD VALUE IF NOT EXISTS 'accepted'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL tidak punya DROP VALUE untuk enum. Kembalikan pemakaian
    // ke 'paid' saja; nilai 'accepted' dibiarkan menempel pada tipe-nya.
    await queryRunner.query(
      `UPDATE "orders" SET "status" = 'paid' WHERE "status" = 'accepted'`,
    );
    await queryRunner.query(
      `UPDATE "order_status_logs" SET "from_status" = 'paid' WHERE "from_status" = 'accepted'`,
    );
    await queryRunner.query(
      `UPDATE "order_status_logs" SET "to_status" = 'paid' WHERE "to_status" = 'accepted'`,
    );
  }
}
