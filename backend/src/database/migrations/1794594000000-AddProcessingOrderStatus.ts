import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingOrderStatus1794594000000
  implements MigrationInterface
{
  name = 'AddProcessingOrderStatus1794594000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'processing'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "orders" SET "status" = 'paid' WHERE "status" = 'processing'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('pending_payment', 'paid', 'ready_for_pickup', 'ready', 'completed', 'cancelled', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::text::"public"."orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending_payment'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."orders_status_enum_old"`,
    );
  }
}
