import { IsString, IsOptional, IsArray, IsEmail, IsEnum } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsArray()
  @IsString({ each: true })
  serviceTypeIds: string[];
}
