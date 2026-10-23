import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Request,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { CreateQrisPaymentDto } from './dto/create-qris-payment.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /api/payments/qris
   * Create a new QRIS payment for an existing order.
   * Returns QR string/URL and expiry for display in the React Native app.
   */
  @Roles(UserRole.CUSTOMER)
  @Post('qris')
  async createQrisPayment(@Request() req, @Body() dto: CreateQrisPaymentDto) {
    return this.paymentService.createQrisPayment(req.user.userId, dto);
  }

  /**
   * GET /api/payments/:id
   * Get payment status by payment ID.
   * Used by React Native polling to check if QRIS has been paid.
   */
  @Roles(UserRole.CUSTOMER)
  @Get(':id')
  async getPaymentStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.getPaymentStatus(id, req.user.userId);
  }

  /**
   * POST /api/payments/midtrans/notification
   * Webhook endpoint for Midtrans HTTP notifications.
   *
   * - No customer authentication required (Midtrans calls this)
   * - Signature is verified inside PaymentService
   * - Always returns 200 OK to prevent unnecessary Midtrans retries
   */
  @Public()
  @Post('midtrans/notification')
  @HttpCode(HttpStatus.OK)
  async handleMidtransNotification(@Body() body: Record<string, any>) {
    return this.paymentService.handleNotification(body);
  }
}
