import { IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  paymentMethod?: string;
  note?: string;
}
