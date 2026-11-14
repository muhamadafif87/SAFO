import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatTables1794600000000 implements MigrationInterface {
  name = 'CreateChatTables1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_status_enum" AS ENUM('waiting', 'active', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."message_attachments_status_enum" AS ENUM('uploaded', 'attached', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_outbox_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`,
    );

    // 2. Create conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL UNIQUE,
        "customer_id" uuid NOT NULL,
        "mitra_id" uuid NOT NULL,
        "status" "public"."conversations_status_enum" NOT NULL DEFAULT 'waiting',
        "started_at" TIMESTAMP WITH TIME ZONE,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "close_reason" character varying(50),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_conversations_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_conversations_mitra" FOREIGN KEY ("mitra_id") REFERENCES "mitra_profiles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_customer_status" ON "conversations" ("customer_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_mitra_status" ON "conversations" ("mitra_id", "status")`,
    );

    // 3. Create message_attachments table
    await queryRunner.query(`
      CREATE TABLE "message_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "uploader_id" uuid NOT NULL,
        "storage_key" character varying(255) NOT NULL UNIQUE,
        "mime_type" character varying(50) NOT NULL,
        "file_size" integer NOT NULL,
        "original_name" character varying(255) NOT NULL,
        "status" "public"."message_attachments_status_enum" NOT NULL DEFAULT 'uploaded',
        "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "attached_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_message_attachments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attachments_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attachments_uploader" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_attachments_cleanup" ON "message_attachments" ("status", "uploaded_at")`,
    );

    // 4. Create messages table
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "sender_role" "public"."users_role_enum" NOT NULL,
        "client_message_id" character varying(64) NOT NULL,
        "type" "public"."messages_type_enum" NOT NULL DEFAULT 'text',
        "content" text,
        "attachment_id" uuid UNIQUE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_messages_attachment" FOREIGN KEY ("attachment_id") REFERENCES "message_attachments"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_messages_conversation_client_id" UNIQUE ("conversation_id", "client_message_id"),
        CONSTRAINT "chk_messages_content_or_attachment" CHECK (
          ("type" = 'text' AND "content" IS NOT NULL AND length(trim("content")) > 0 AND "attachment_id" IS NULL)
          OR
          ("type" = 'image' AND "attachment_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_cursor" ON "messages" ("conversation_id", "created_at", "id")`,
    );

    // 5. Create notification_outbox table
    await queryRunner.query(`
      CREATE TABLE "notification_outbox" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_type" character varying(50) NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "recipient_user_id" uuid NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "public"."notification_outbox_status_enum" NOT NULL DEFAULT 'pending',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "last_error" text,
        "locked_at" TIMESTAMP WITH TIME ZONE,
        "locked_by" character varying(100),
        "lock_expires_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_outbox_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_outbox_recipient" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_outbox_queue" ON "notification_outbox" ("status", "next_attempt_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outbox_aggregate" ON "notification_outbox" ("aggregate_id", "event_type")`,
    );

    // 6. Create user_devices table
    await queryRunner.query(`
      CREATE TABLE "user_devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "push_token" character varying(255) NOT NULL UNIQUE,
        "device_platform" character varying(20),
        "is_active" boolean NOT NULL DEFAULT true,
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_devices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_devices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_devices_user_active" ON "user_devices" ("user_id", "is_active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_outbox"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_outbox_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."messages_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."message_attachments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."conversations_status_enum"`);
  }
}
