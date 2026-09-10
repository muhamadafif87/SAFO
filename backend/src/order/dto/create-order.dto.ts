import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../../database/entities/order.enums';

export class CreateOrderItemDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  paymentMethod?: PaymentMethod;
  note?: string;
}
