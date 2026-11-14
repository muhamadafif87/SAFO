import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  pushToken: string;

  @IsOptional()
  @IsString()
  devicePlatform?: string;
}
