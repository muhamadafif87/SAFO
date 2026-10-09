import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavedAddresses1784800000000 implements MigrationInterface {
  name = 'CreateSavedAddresses1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "saved_addresses" (
        "id"               uuid                        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"          uuid                        NOT NULL,
        "label"            character varying(100)      NOT NULL,
        "address_detail"   text                        NOT NULL,
        "latitude"         decimal(10,7)               NOT NULL,
        "longitude"        decimal(10,7)               NOT NULL,
        "recipient_name"   character varying(100)      NOT NULL,
        "recipient_phone"  character varying(20)       NOT NULL,
        "is_primary"       boolean                     NOT NULL DEFAULT false,
        "created_at"       TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_addresses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_saved_addresses_user_id"
      ON "saved_addresses" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "saved_addresses"
      ADD CONSTRAINT "FK_saved_addresses_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users" ("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saved_addresses" DROP CONSTRAINT "FK_saved_addresses_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_saved_addresses_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "saved_addresses"`);
  }
}
