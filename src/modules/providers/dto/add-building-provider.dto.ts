import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class AddBuildingProviderDto {
  @IsString()
  providerId: string;

  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  contractDetails?: Record<string, any>;
}
