import { IsEmail, IsNotEmpty, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BuildingDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  city?: string;

  @IsString()
  state?: string;

  @IsString()
  country?: string;

  @IsString()
  postalCode?: string;

  @IsString()
  @IsNotEmpty()
  schema: string;
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BuildingDto)
  building: BuildingDto;
}
