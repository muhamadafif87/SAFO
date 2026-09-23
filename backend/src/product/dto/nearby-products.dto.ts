import { IsNumber, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export type SortOption = 'nearby' | 'discount' | 'rating';

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

  /** Sort order: 'nearby' (default), 'discount' (biggest discount first), 'rating' (highest rated first) */
  @IsOptional()
  @IsIn(['nearby', 'discount', 'rating'])
  sort?: SortOption = 'nearby';

  /** Keyword search: filter by product name or warung name */
  @IsOptional()
  @IsString()
  search?: string;
}

