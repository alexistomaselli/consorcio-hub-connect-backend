import { IsString, IsNotEmpty, IsEmail, IsUrl, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteProfileDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  buildingName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  floors: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  totalUnits: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  constructionYear: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+54[0-9]{10,11}$/, {
    message: 'El número de WhatsApp debe tener el formato correcto (+54 seguido de 10-11 dígitos)'
  })
  whatsapp: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adminLastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adminPhone: string;
}
