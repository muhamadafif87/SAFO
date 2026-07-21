import {
  Controller, Get, Post, Patch,
  Body, Param, Request,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderItemDto } from './dto/create-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { OrderStatus } from '../database/entities/order.entity';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ─── Customer ────────────────────────────────────────────────────────────

  @Roles(UserRole.CUSTOMER)
  @Post()
  createOrder(@Request() req, @Body() body: { items: CreateOrderItemDto[] }) {
    return this.orderService.createOrder(req.user.userId, body.items);
  }

  @Roles(UserRole.CUSTOMER)
  @Get('mine')
  getMyOrders(@Request() req) {
    return this.orderService.getCustomerOrders(req.user.userId);
  }

  /** Mock payment endpoint — simulates Midtrans completing the payment */
  @Roles(UserRole.CUSTOMER)
  @Post(':id/pay-mock')
  mockPayment(@Request() req, @Param('id') id: string) {
    return this.orderService.mockPayment(id, req.user.userId);
  }

  // ─── Mitra ────────────────────────────────────────────────────────────────

  @Roles(UserRole.MITRA)
  @Get('mitra')
  getMitraOrders(@Request() req) {
    return this.orderService.getMitraOrders(req.user.userId);
  }

  @Roles(UserRole.MITRA)
  @Patch(':id/status')
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateOrderStatus(id, req.user.userId, status);
  }

  @Roles(UserRole.MITRA)
  @Post(':id/verify-pickup')
  verifyPickup(
    @Request() req,
    @Param('id') id: string,
    @Body('pickupCode') pickupCode: string,
  ) {
    return this.orderService.verifyPickup(id, req.user.userId, pickupCode);
  }
}
