import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateQrisPaymentDto {
  /**
   * The internal order UUID to create payment for.
   * Must belong to the authenticated customer.
   */
  @IsString()
  orderId: string;

  /**
   * Client-generated idempotency key.
   * Re-submitting the same key returns the existing payment record
   * instead of creating a new charge.
   *
   * Recommended format: UUID v4 generated on the client for each logical attempt.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
