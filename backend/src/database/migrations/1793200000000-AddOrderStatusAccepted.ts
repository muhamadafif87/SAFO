import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `accepted` order status used by the mitra "Terima Pesanan" flow.
 * Postgres requires ADD VALUE to run outside a transaction that also uses the
 * new value — this migration only adds it, never reads it back.
 */
export class AddOrderStatusAccepted1793200000000 implements MigrationInterface {
  name = 'AddOrderStatusAccepted1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'accepted'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot remove a value from an enum type that is in use.
    // Any row still holding 'accepted' is moved back to 'paid'.
    await queryRunner.query(
      `UPDATE "orders" SET "status" = 'paid' WHERE "status" = 'accepted'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" DROP VALUE IF EXISTS 'accepted'`,
    );
  }
}
