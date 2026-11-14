import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GetMessagesQueryDto {
  @IsOptional()
  @IsISO8601()
  cursorCreatedAt?: string;

  @IsOptional()
  @IsUUID()
  cursorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
