import {
  IsString, IsNumber, IsOptional, IsDateString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  stock: number;

  @IsDateString()
  pickupWindowStart: string;

  @IsDateString()
  pickupWindowEnd: string;
}
