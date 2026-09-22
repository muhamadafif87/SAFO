import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  phone: string;
  //@IsOptional()
  //phone?: string;

  @IsString()
  @MinLength(3)
  name: string;
}
