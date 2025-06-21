import { IsString, IsOptional, IsInt, IsUUID, IsArray } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsInt()
  totalUnits?: number;

  @IsOptional()
  @IsInt()
  floors?: number;

  @IsOptional()
  @IsInt()
  constructionYear?: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsUUID()
  planId: string;
}
