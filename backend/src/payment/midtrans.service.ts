import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * MidtransService — thin wrapper around the Midtrans Core API.
 *
 * Uses the official `midtrans-client` SDK when available; falls
 * back to a typed HTTP client so the rest of the codebase compiles
 * even before the npm install is complete.
 *
 * Only sandbox environment is supported. If MIDTRANS_IS_PRODUCTION is
 * set to true, the service will refuse to start to prevent accidental
 * production charges.
 */

export interface MidtransQrisChargeRequest {
  orderId: string;
  grossAmount: number; // integer IDR, e.g. 10000
  customerDetails?: {
    firstName?: string;
    email?: string;
    phone?: string;
  };
}

export interface MidtransQrisChargeResponse {
  transactionId: string;
  orderId: string;
  grossAmount: string;
  currency: string;
  paymentType: string;
  transactionStatus: string;
  transactionTime: string;
  expiryTime: string | null;
  /** Raw QRIS string for generating QR code client-side (from qr_string field) */
  qrString: string | null;
  /** Image URL from Midtrans actions for direct display if preferred */
  qrCodeUrl: string | null;
  actions: Array<{ name: string; method: string; url: string }> | null;
  statusCode: string;
  statusMessage: string;
}

export interface MidtransStatusResponse {
  transactionId: string;
  orderId: string;
  grossAmount: string;
  currency: string;
  paymentType: string;
  transactionStatus: string;
  fraudStatus?: string;
  transactionTime: string;
  settlementTime?: string;
  statusCode: string;
  statusMessage: string;
}

@Injectable()
export class MidtransService implements OnModuleInit {
  private readonly logger = new Logger(MidtransService.name);
  private coreApi: any = null;
  private readonly serverKey: string;
  private readonly isProduction: boolean;
  private readonly sandboxBaseUrl = 'https://api.sandbox.midtrans.com';

  constructor(private readonly config: ConfigService) {
    this.isProduction =
      this.config.get<string>('MIDTRANS_IS_PRODUCTION', 'false').toLowerCase() ===
      'true';
    this.serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY', '');
  }

  async onModuleInit(): Promise<void> {
    if (this.isProduction) {
      this.logger.error(
        'MIDTRANS_IS_PRODUCTION=true is NOT allowed in this service scope. ' +
          'Set MIDTRANS_IS_PRODUCTION=false for sandbox.',
      );
      throw new Error(
        'Midtrans production mode is disabled. Use sandbox credentials only.',
      );
    }

    if (!this.serverKey || this.serverKey.startsWith('SB-Mid-server-xxx')) {
      this.logger.warn(
        'MIDTRANS_SERVER_KEY is not configured. ' +
          'Payment creation will fail with a configuration error. ' +
          'Set a valid sandbox Server Key in backend/.env',
      );
      return; // allow startup so other modules work
    }

    try {
      // Dynamic require to avoid compile error if midtrans-client is not yet installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const MidtransClient = require('midtrans-client');
      this.coreApi = new MidtransClient.CoreApi({
        isProduction: false,
        serverKey: this.serverKey,
        clientKey: this.config.get<string>('MIDTRANS_CLIENT_KEY', ''),
      });
      this.logger.log('Midtrans CoreApi initialized (sandbox)');
    } catch (err: any) {
      this.logger.warn(
        `midtrans-client package not found or failed to load: ${err?.message}. ` +
          'Run: npm install midtrans-client --save in the backend directory.',
      );
    }
  }

  /** Validate that the service is ready to make API calls */
  private assertReady(): void {
    if (!this.serverKey || this.serverKey.startsWith('SB-Mid-server-xxx')) {
      throw new Error(
        'MIDTRANS_SERVER_KEY is not configured. ' +
          'Add your sandbox Server Key to backend/.env',
      );
    }
  }

  private getAuthHeader(): string {
    const token = Buffer.from(`${this.serverKey}:`).toString('base64');
    return `Basic ${token}`;
  }

  /**
   * Create a QRIS charge via Midtrans Core API.
   * Reference: https://docs.midtrans.com/reference/qris
   */
  async chargeQris(
    req: MidtransQrisChargeRequest,
  ): Promise<MidtransQrisChargeResponse> {
    this.assertReady();

    const parameter = {
      payment_type: 'qris',
      transaction_details: {
        order_id: req.orderId,
        gross_amount: Math.round(req.grossAmount), // must be integer
      },
      ...(req.customerDetails && {
        customer_details: {
          first_name: req.customerDetails.firstName,
          email: req.customerDetails.email,
          phone: req.customerDetails.phone,
        },
      }),
    };

    if (this.coreApi) {
      const response = await this.coreApi.charge(parameter);
      return this.mapChargeResponse(response);
    }

    // Direct HTTP fallback if SDK is not installed
    const res = await fetch(`${this.sandboxBaseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify(parameter),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data?.status_message || `Midtrans charge failed with HTTP ${res.status}`,
      );
    }
    return this.mapChargeResponse(data);
  }

  /**
   * Get transaction status from Midtrans.
   * Reference: https://docs.midtrans.com/reference/handle-notifications
   */
  async getStatus(orderId: string): Promise<MidtransStatusResponse> {
    this.assertReady();

    if (this.coreApi) {
      const response = await this.coreApi.transaction.status(orderId);
      return this.mapStatusResponse(response);
    }

    // Direct HTTP fallback if SDK is not installed
    const res = await fetch(`${this.sandboxBaseUrl}/v2/${orderId}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: this.getAuthHeader(),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data?.status_message || `Midtrans status check failed with HTTP ${res.status}`,
      );
    }
    return this.mapStatusResponse(data);
  }

  /**
   * Verify the SHA-512 signature from a Midtrans notification.
   * Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
   * Reference: https://docs.midtrans.com/docs/https-notification-webhooks
   */
  verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    receivedSignature: string,
  ): boolean {
    if (!this.serverKey) return false;

    const crypto = require('crypto');
    const raw = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const computed = crypto.createHash('sha512').update(raw).digest('hex');

    // Constant-time comparison to mitigate timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computed, 'hex'),
        Buffer.from(receivedSignature.toLowerCase(), 'hex'),
      );
    } catch {
      // Buffer lengths differ — signature is invalid
      return false;
    }
  }

  // ─── Mappers ────────────────────────────────────────────────────────────

  private mapChargeResponse(raw: any): MidtransQrisChargeResponse {
    // qr_string is the raw QRIS data string for QR code generation (at root level)
    // actions[].url with name 'generate-qr-code' is a Midtrans-hosted image URL
    const qrString: string | null = raw.qr_string ?? null;

    // Extract image URL from actions for optional direct display
    const generateQrAction = (raw.actions ?? []).find(
      (a: any) => a.name === 'generate-qr-code',
    );
    const qrCodeUrl: string | null = generateQrAction?.url ?? null;

    return {
      transactionId: raw.transaction_id ?? '',
      orderId: raw.order_id ?? '',
      grossAmount: raw.gross_amount ?? '0',
      currency: raw.currency ?? 'IDR',
      paymentType: raw.payment_type ?? 'qris',
      transactionStatus: raw.transaction_status ?? 'pending',
      transactionTime: raw.transaction_time ?? '',
      expiryTime: raw.expiry_time ?? null,
      qrString,
      qrCodeUrl,
      actions: raw.actions ?? null,
      statusCode: raw.status_code ?? '',
      statusMessage: raw.status_message ?? '',
    };
  }

  private mapStatusResponse(raw: any): MidtransStatusResponse {
    return {
      transactionId: raw.transaction_id ?? '',
      orderId: raw.order_id ?? '',
      grossAmount: raw.gross_amount ?? '0',
      currency: raw.currency ?? 'IDR',
      paymentType: raw.payment_type ?? 'qris',
      transactionStatus: raw.transaction_status ?? 'unknown',
      fraudStatus: raw.fraud_status,
      transactionTime: raw.transaction_time ?? '',
      settlementTime: raw.settlement_time,
      statusCode: raw.status_code ?? '',
      statusMessage: raw.status_message ?? '',
    };
  }
}
