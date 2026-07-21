import { IsEmail, IsString, MinLength, IsOptional, IsNumber } from 'class-validator';

export class RegisterMitraDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  businessName: string;

  @IsString()
  category: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
