import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbyProductsDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  /** Radius in km, default 5 */
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(50)
  @IsOptional()
  radiusKm?: number = 5;
}
