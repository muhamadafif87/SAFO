import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { Payment, PaymentProvider, PaymentStatus } from '../database/entities/payment.entity';
import { MidtransService } from './midtrans.service';
import { CreateQrisPaymentDto } from './dto/create-qris-payment.dto';

/**
 * Mapping of Midtrans transaction_status → internal PaymentStatus.
 * Reference: https://docs.midtrans.com/reference/handle-notifications
 *
 * For QRIS:
 *  - 'pending'    → waiting for customer to scan & pay
 *  - 'settlement' → bank has settled funds (final success)
 *  - 'expire'     → QRIS expired before customer paid
 *  - 'cancel'     → cancelled by merchant/system
 *  - 'deny'       → denied
 */
const MIDTRANS_SUCCESS_STATUSES = new Set([
  'settlement', // QRIS/GoPay: final success after bank settles
  'capture',    // Card: captured (safety net, not used for QRIS)
  'accept',     // Fraud accept override (sometimes returned in sandbox)
]);

const MIDTRANS_PENDING_STATUSES = new Set([
  'pending',    // Awaiting payment
  'authorize',  // Pre-auth (card only, keep pending until capture)
]);

const MIDTRANS_FAILURE_STATUSES = new Set([
  'deny',
  'cancel',
  'expire',
  'failure',
]);

const MIDTRANS_REFUNDED_STATUSES = new Set([
  'refund',
  'partial_refund',
  'chargeback',
  'partial_chargeback',
]);

function mapMidtransStatus(transactionStatus: string): PaymentStatus {
  const s = (transactionStatus ?? '').toLowerCase();
  if (MIDTRANS_SUCCESS_STATUSES.has(s)) return PaymentStatus.SUCCESS;
  if (MIDTRANS_PENDING_STATUSES.has(s)) return PaymentStatus.PENDING;
  if (MIDTRANS_FAILURE_STATUSES.has(s)) return PaymentStatus.FAILED;
  if (MIDTRANS_REFUNDED_STATUSES.has(s)) return PaymentStatus.REFUNDED;
  return PaymentStatus.PENDING; // unknown → keep pending, will reconcile later
}

function mapToOrderStatus(paymentStatus: PaymentStatus, midtransStatus: string): OrderStatus | null {
  if (paymentStatus === PaymentStatus.SUCCESS) return OrderStatus.PAID;
  if (midtransStatus === 'expire') return OrderStatus.EXPIRED;
  if (midtransStatus === 'cancel' || midtransStatus === 'deny') return OrderStatus.CANCELLED;
  if (midtransStatus === 'failure') return OrderStatus.CANCELLED;
  return null; // no order status change for pending/unknown
}

export interface QrisPaymentResponse {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: string;
  qrString: string | null;
  qrCodeUrl: string | null;
  expiresAt: string | null;
  transactionId: string | null;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  internalOrderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: string;
  qrString: string | null;
  expiresAt: string | null;
  paidAt: string | null;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly midtrans: MidtransService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Create QRIS Payment ────────────────────────────────────────────────

  async createQrisPayment(
    customerId: string,
    dto: CreateQrisPaymentDto,
  ): Promise<QrisPaymentResponse> {
    const { orderId, idempotencyKey } = dto;

    // 1. Validate order ownership & status
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.customerId !== customerId) throw new ForbiddenException('Akses ditolak');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Order sudah dalam status ${order.status}. Pembayaran baru tidak dapat dibuat.`,
      );
    }

    // 2. Idempotency check — return existing if same key used
    if (idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: { idempotencyKey },
      });
      if (existing) {
        // Validate that this key belongs to the same order
        if (existing.orderId !== orderId) {
          throw new ConflictException(
            'Idempotency key digunakan untuk order yang berbeda.',
          );
        }
        this.logger.log(`Idempotent hit for key ${idempotencyKey}, returning existing payment ${existing.id}`);
        return this.toQrisResponse(existing, order);
      }
    }

    // 3. Check for any existing PENDING payment for this order
    //    (prevents double-charge when user taps "Bayar" twice without idempotency key)
    const existingPending = await this.paymentRepo.findOne({
      where: { orderId, status: PaymentStatus.PENDING, provider: PaymentProvider.MIDTRANS },
    });
    if (existingPending && existingPending.transactionId) {
      this.logger.log(
        `Found existing PENDING Midtrans payment ${existingPending.id} for order ${orderId}. Returning it.`,
      );
      return this.toQrisResponse(existingPending, order);
    }

    // 4. Create payment record with PENDING status BEFORE calling Midtrans
    //    This ensures we have a record even if Midtrans call succeeds but our
    //    DB write after the call fails.
    const iKey = idempotencyKey ?? uuidv4();
    let payment = this.paymentRepo.create({
      orderId,
      provider: PaymentProvider.MIDTRANS,
      status: PaymentStatus.PENDING,
      idempotencyKey: iKey,
      grossAmount: Number(order.totalAmount),
    });

    try {
      payment = await this.paymentRepo.save(payment);
    } catch (err: any) {
      // Unique constraint on idempotency_key — concurrent request already created it
      if (err?.code === '23505') {
        const race = await this.paymentRepo.findOne({ where: { idempotencyKey: iKey } });
        if (race) return this.toQrisResponse(race, order);
      }
      throw err;
    }

    // 5. Call Midtrans Core API — charge QRIS
    let chargeResponse;
    try {
      chargeResponse = await this.midtrans.chargeQris({
        orderId: payment.id, // use payment.id as Midtrans order_id for uniqueness
        grossAmount: Math.round(Number(order.totalAmount)),
      });
    } catch (err: any) {
      // Mark payment as failed so caller knows to retry
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);

      this.logger.error(`Midtrans charge failed for order ${orderId}: ${err?.message}`);
      throw new InternalServerErrorException(
        'Gagal membuat transaksi QRIS. Pastikan kredensial Midtrans dikonfigurasi dengan benar.',
      );
    }

    // 6. Validate charge response — do NOT treat pending as success
    if (!chargeResponse.transactionId) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      throw new InternalServerErrorException(
        'Respons Midtrans tidak mengandung transaction_id yang valid.',
      );
    }

    // 7. Persist Midtrans response data
    payment.transactionId = chargeResponse.transactionId;
    payment.providerRefId = chargeResponse.orderId;
    // qrString: raw QRIS data string for QR code generation
    payment.qrString = chargeResponse.qrString;
    // qrCodeUrl: Midtrans-hosted image URL (actions[generate-qr-code].url)
    payment.qrCodeUrl = chargeResponse.qrCodeUrl ?? null;
    payment.expiryTime = chargeResponse.expiryTime
      ? new Date(chargeResponse.expiryTime)
      : null;
    payment.status = mapMidtransStatus(chargeResponse.transactionStatus);

    await this.paymentRepo.save(payment);

    this.logger.log(
      `QRIS payment ${payment.id} created — Midtrans txn ${payment.transactionId}, status ${payment.status}`,
    );

    return this.toQrisResponse(payment, order);
  }

  // ─── Get Payment Status ─────────────────────────────────────────────────

  /**
   * Returns current payment status.
   *
   * Active reconciliation: if status is still PENDING and we have a
   * Midtrans transactionId, we proactively query the Midtrans Status API
   * and update the DB. This ensures status syncs even when the webhook
   * notification fails to reach the server (expired ngrok, firewall, etc.).
   */
  async getPaymentStatus(
    paymentId: string,
    customerId: string,
  ): Promise<PaymentStatusResponse> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment tidak ditemukan');
    if (payment.order.customerId !== customerId) throw new ForbiddenException('Akses ditolak');

    // ── Active reconciliation for pending payments ─────────────────────
    // payment.id is used as Midtrans order_id during charge, so we query
    // Midtrans by payment.id (not the internal orderId)
    if (payment.status === PaymentStatus.PENDING && payment.transactionId) {
      try {
        const midtransStatus = await this.midtrans.getStatus(payment.id);
        const newPaymentStatus = mapMidtransStatus(midtransStatus.transactionStatus);

        if (newPaymentStatus !== PaymentStatus.PENDING) {
          // Status changed — apply atomic update exactly like handleNotification does
          const newOrderStatus = mapToOrderStatus(newPaymentStatus, midtransStatus.transactionStatus);

          await this.dataSource.transaction(async (manager) => {
            payment.status = newPaymentStatus;
            if (newPaymentStatus === PaymentStatus.SUCCESS) {
              payment.paidAt = new Date();
            }
            await manager.save(Payment, payment);

            if (newOrderStatus && payment.order.status !== newOrderStatus) {
              await manager.update(Order, { id: payment.orderId }, { status: newOrderStatus });
              this.logger.log(
                `[Reconciliation] Order ${payment.orderId}: ${payment.order.status} → ${newOrderStatus}`,
              );
            }
          });

          this.logger.log(
            `[Reconciliation] Payment ${payment.id}: ${PaymentStatus.PENDING} → ${newPaymentStatus} (Midtrans: ${midtransStatus.transactionStatus})`,
          );
        }
      } catch (err: any) {
        // Non-fatal: log warning and return stored status
        // Midtrans returns 404 if transaction hasn't been submitted yet
        this.logger.warn(
          `[Reconciliation] Could not fetch Midtrans status for ${payment.id}: ${err?.message}`,
        );
      }
    }

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      internalOrderId: payment.order.id,
      status: payment.status,
      amount: Number(payment.grossAmount ?? payment.order.totalAmount),
      currency: 'IDR',
      paymentMethod: 'QRIS',
      qrString: payment.qrString ?? null,
      expiresAt: payment.expiryTime?.toISOString() ?? null,
      paidAt: payment.paidAt?.toISOString() ?? null,
    };
  }

  // ─── Midtrans Notification Handler ─────────────────────────────────────

  /**
   * Process an incoming Midtrans HTTP notification (webhook).
   *
   * Security steps performed:
   * 1. Validate presence of required fields
   * 2. Verify SHA-512 signature
   * 3. Retrieve payment record by order_id (= payment.id used as Midtrans order_id)
   * 4. Cross-check amount and payment type
   * 5. Re-fetch status from Midtrans GET Status API for reconciliation
   * 6. Apply idempotent state update
   * 7. Propagate to Order status atomically
   *
   * Reference: https://docs.midtrans.com/reference/handle-notifications
   */
  async handleNotification(body: Record<string, any>): Promise<{ received: boolean }> {
    const {
      order_id: midtransOrderId, // = our payment.id
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
      transaction_id,
      fraud_status,
    } = body;

    // ── Step 1: Required fields ──────────────────────────────────────────
    if (!midtransOrderId || !status_code || !gross_amount || !signature_key) {
      this.logger.warn('Notification missing required fields', { midtransOrderId });
      // Return ok to prevent Midtrans retry for malformed payloads
      return { received: true };
    }

    // ── Step 2: Signature verification ──────────────────────────────────
    const signatureValid = this.midtrans.verifySignature(
      midtransOrderId,
      status_code,
      gross_amount,
      signature_key,
    );
    if (!signatureValid) {
      this.logger.warn(`Invalid signature for order_id ${midtransOrderId}`);
      return { received: true }; // don't expose rejection details
    }

    // ── Step 3: Find payment record ─────────────────────────────────────
    // midtransOrderId = payment.id (we passed payment.id as Midtrans order_id)
    const payment = await this.paymentRepo.findOne({
      where: { id: midtransOrderId },
      relations: { order: true },
    });
    if (!payment) {
      this.logger.warn(`Notification for unknown payment ${midtransOrderId}`);
      return { received: true };
    }

    // ── Step 4: Cross-check amount ───────────────────────────────────────
    const expectedAmount = Math.round(Number(payment.grossAmount ?? payment.order.totalAmount));
    const receivedAmount = Math.round(parseFloat(gross_amount));
    if (expectedAmount !== receivedAmount) {
      this.logger.error(
        `Amount mismatch for payment ${payment.id}: expected ${expectedAmount}, received ${receivedAmount}`,
      );
      return { received: true };
    }

    // ── Step 5: Re-verify status via Midtrans GET Status API ────────────
    let verifiedStatus = transaction_status;
    try {
      const statusResp = await this.midtrans.getStatus(midtransOrderId);
      verifiedStatus = statusResp.transactionStatus;
    } catch (err: any) {
      this.logger.warn(
        `GET Status failed for ${midtransOrderId}: ${err?.message}. Using notification status.`,
      );
      // Continue with notification status (not ideal but acceptable)
    }

    // ── Step 6: Map to internal status ───────────────────────────────────
    const newPaymentStatus = mapMidtransStatus(verifiedStatus);

    // Idempotency: skip if already in this status
    if (payment.status === newPaymentStatus && payment.status !== PaymentStatus.PENDING) {
      this.logger.log(`Duplicate notification for ${payment.id}, status already ${payment.status}`);
      return { received: true };
    }

    // Prevent downgrade: do not go from SUCCESS back to PENDING/FAILED
    const isTerminal = (s: PaymentStatus) =>
      s === PaymentStatus.SUCCESS || s === PaymentStatus.FAILED || s === PaymentStatus.REFUNDED;
    if (isTerminal(payment.status) && !isTerminal(newPaymentStatus)) {
      this.logger.warn(
        `Prevented status downgrade: ${payment.id} from ${payment.status} to ${newPaymentStatus}`,
      );
      return { received: true };
    }

    // ── Step 7: Atomic update of payment + order ─────────────────────────
    const newOrderStatus = mapToOrderStatus(newPaymentStatus, verifiedStatus);

    await this.dataSource.transaction(async (manager) => {
      // Update payment
      payment.status = newPaymentStatus;
      payment.transactionId = transaction_id ?? payment.transactionId;
      if (newPaymentStatus === PaymentStatus.SUCCESS) {
        payment.paidAt = new Date();
      }
      await manager.save(Payment, payment);

      // Update order status if applicable
      if (newOrderStatus && payment.order.status !== newOrderStatus) {
        // Prevent double-activation: only move forward, never backward
        const currentOrderIdx = Object.values(OrderStatus).indexOf(payment.order.status);
        const newOrderIdx = Object.values(OrderStatus).indexOf(newOrderStatus);
        if (newOrderIdx >= currentOrderIdx || newOrderStatus === OrderStatus.EXPIRED || newOrderStatus === OrderStatus.CANCELLED) {
          await manager.update(Order, { id: payment.orderId }, { status: newOrderStatus });
          this.logger.log(
            `Order ${payment.orderId} status updated: ${payment.order.status} → ${newOrderStatus}`,
          );
        }
      }
    });

    this.logger.log(
      `Payment ${payment.id} processed: Midtrans status=${verifiedStatus}, internal=${newPaymentStatus}`,
    );

    return { received: true };
  }

  // ─── Helper ─────────────────────────────────────────────────────────────

  private toQrisResponse(payment: Payment, order: Order): QrisPaymentResponse {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amount: Number(payment.grossAmount ?? order.totalAmount),
      currency: 'IDR',
      paymentMethod: 'QRIS',
      qrString: payment.qrString,
      qrCodeUrl: payment.qrCodeUrl,
      expiresAt: payment.expiryTime?.toISOString() ?? null,
      transactionId: payment.transactionId,
    };
  }
}
