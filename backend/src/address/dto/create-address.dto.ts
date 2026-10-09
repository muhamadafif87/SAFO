import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsString()
  @IsNotEmpty()
  addressDetail: string;

  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  recipientPhone: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
