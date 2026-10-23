import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds QRIS-specific fields to the payments table and
 * creates the payments table itself if it doesn't exist yet.
 *
 * Safe to run even if payments table already exists —
 * each ALTER is guarded by an existence check.
 */
export class AddPaymentQrisFields1784900000000 implements MigrationInterface {
  name = 'AddPaymentQrisFields1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Create payments table if it doesn't exist ──────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_provider_enum"
          AS ENUM('midtrans', 'xendit', 'mock');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_status_enum"
          AS ENUM('pending', 'success', 'failed', 'refunded');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id"        uuid NOT NULL,
        "provider"        "public"."payments_provider_enum" NOT NULL DEFAULT 'mock',
        "provider_ref_id" character varying(255),
        "status"          "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
        "snap_token"      character varying(255),
        "payment_url"     text,
        "paid_at"         TIMESTAMP WITH TIME ZONE,
        "created_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_order"
          FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE
      );
    `);

    // ── 2. Add QRIS / Midtrans-specific columns (idempotent) ──────────────

    // qr_string: the raw QR string to render client-side
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "qr_string" text;
    `);

    // qr_code_url: image URL if Midtrans serves one
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "qr_code_url" text;
    `);

    // expiry_time: when the QRIS transaction expires
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "expiry_time" TIMESTAMP WITH TIME ZONE;
    `);

    // transaction_id: Midtrans internal transaction_id (differs from our order_id)
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "transaction_id" character varying(255);
    `);

    // gross_amount: stored for notification cross-check
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "gross_amount" numeric(12,2);
    `);

    // idempotency_key: client-supplied key to prevent double-charge
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "idempotency_key" character varying(255);
    `);

    // Unique constraint on idempotency_key per order
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "payments"
          ADD CONSTRAINT "UQ_payment_idempotency" UNIQUE ("idempotency_key");
      EXCEPTION WHEN duplicate_table THEN NULL; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "UQ_payment_idempotency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "idempotency_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "gross_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "transaction_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "expiry_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "qr_code_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "qr_string"`,
    );
  }
}
