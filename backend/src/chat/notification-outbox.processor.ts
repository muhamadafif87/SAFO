import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import { OutboxStatus } from '../database/entities/chat.enums';
import { NotificationOutbox } from '../database/entities/notification-outbox.entity';
import { UserDevice } from '../database/entities/user-device.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class NotificationOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationOutboxProcessor.name);
  private readonly expo = new Expo();
  private readonly workerId = `worker-${randomUUID().slice(0, 8)}`;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private hasWarnedMissingTable = false;

  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outboxRepo: Repository<NotificationOutbox>,
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.logger.log(`Starting Notification Outbox Processor (${this.workerId})`);
    this.timer = setInterval(() => {
      this.processOutboxBatch().catch((err) => {
        if (
          err?.code === '42P01' ||
          err?.message?.includes('relation "notification_outbox" does not exist')
        ) {
          if (!this.hasWarnedMissingTable) {
            this.logger.warn(
              'Tabel "notification_outbox" belum ada di database. Silakan jalankan migrasi database atau buat tabel tersebut.',
            );
            this.hasWarnedMissingTable = true;
          }
          return;
        }
        this.logger.error(`Error in outbox processing cycle: ${err.message}`, err.stack);
      });
    }, 5000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processOutboxBatch(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const batchSize = 10;
      const now = new Date();
      const leaseExpiresAt = new Date(now.getTime() + 60 * 1000); // 60s lease

      // Claim a batch of jobs in a short transaction
      const jobsToProcess = await this.dataSource.transaction(async (manager) => {
        const query = manager
          .createQueryBuilder(NotificationOutbox, 'job')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where(
            '(job.status = :pending AND job.next_attempt_at <= :now) OR (job.status = :processing AND job.lock_expires_at <= :now)',
            {
              pending: OutboxStatus.PENDING,
              processing: OutboxStatus.PROCESSING,
              now,
            },
          )
          .orderBy('job.created_at', 'ASC')
          .take(batchSize);

        const candidates = await query.getMany();
        if (this.hasWarnedMissingTable) {
          this.hasWarnedMissingTable = false;
          this.logger.log('Tabel "notification_outbox" terdeteksi, pemrosesan outbox kembali normal.');
        }
        if (candidates.length === 0) return [];

        const candidateIds = candidates.map((c) => c.id);
        await manager
          .createQueryBuilder()
          .update(NotificationOutbox)
          .set({
            status: OutboxStatus.PROCESSING,
            lockedBy: this.workerId,
            lockedAt: now,
            lockExpiresAt: leaseExpiresAt,
          })
          .whereInIds(candidateIds)
          .execute();

        return candidates;
      });

      if (jobsToProcess.length === 0) {
        return;
      }

      for (const job of jobsToProcess) {
        await this.handleJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleJob(job: NotificationOutbox): Promise<void> {
    try {
      // 1. Fetch active push tokens for recipient
      const activeDevices = await this.deviceRepo.find({
        where: {
          userId: job.recipientUserId,
          isActive: true,
        },
      });

      const validTokens = activeDevices
        .map((d) => d.pushToken)
        .filter((token) => Expo.isExpoPushToken(token));

      if (validTokens.length === 0) {
        // No active devices to notify — mark complete
        await this.outboxRepo.update(job.id, {
          status: OutboxStatus.COMPLETED,
          processedAt: new Date(),
          lockedBy: null,
          lockExpiresAt: null,
        });
        return;
      }

      // 2. Prepare push messages
      const isCustomerSender = job.payload.senderRole === 'customer';
      const senderLabel = isCustomerSender ? 'Pelanggan' : 'Mitra Warung';
      const body =
        job.payload.type === 'image'
          ? `${senderLabel} mengirim foto`
          : `${senderLabel}: ${job.payload.content || 'Pesan baru'}`;

      const messages: ExpoPushMessage[] = validTokens.map((to) => ({
        to,
        sound: 'default',
        title: 'Pesan Baru - SAFO Chat',
        body,
        data: job.payload,
      }));

      // 3. Dispatch outside DB transaction
      const chunks = this.expo.chunkPushNotifications(messages);
      const invalidTokens: string[] = [];

      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          if (ticket.status === 'error') {
            if (
              ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.message?.includes('DeviceNotRegistered')
            ) {
              const problematicToken = chunk[i]?.to;
              if (typeof problematicToken === 'string') {
                invalidTokens.push(problemProblematic(problematicToken));
              }
            }
          }
        }
      }

      // Deactivate invalid tokens if found
      if (invalidTokens.length > 0) {
        await this.deviceRepo.update(
          { pushToken: In(invalidTokens) },
          { isActive: false },
        );
      }

      // 4. Mark job completed
      await this.outboxRepo.update(job.id, {
        status: OutboxStatus.COMPLETED,
        processedAt: new Date(),
        lockedBy: null,
        lockExpiresAt: null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to deliver notification for job ${job.id}: ${error.message}`,
      );

      const nextAttemptCount = job.attemptCount + 1;
      const MAX_ATTEMPTS = 5;

      if (nextAttemptCount >= MAX_ATTEMPTS) {
        await this.outboxRepo.update(job.id, {
          status: OutboxStatus.FAILED,
          attemptCount: nextAttemptCount,
          lastError: error.message,
          lockedBy: null,
          lockExpiresAt: null,
        });
      } else {
        const backoffSeconds = Math.pow(2, nextAttemptCount) * 10;
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);

        await this.outboxRepo.update(job.id, {
          status: OutboxStatus.PENDING,
          attemptCount: nextAttemptCount,
          nextAttemptAt,
          lastError: error.message,
          lockedBy: null,
          lockExpiresAt: null,
        });
      }
    }
  }
}

function problemProblematic(token: string): string {
  return token;
}
