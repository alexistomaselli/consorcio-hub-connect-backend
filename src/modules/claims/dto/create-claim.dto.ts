import { IsString, IsEnum, IsOptional, IsUUID, IsArray } from 'class-validator';

export enum ClaimLocation {
  UNIT = 'UNIT',
  COMMON_AREA = 'COMMON_AREA',
  BUILDING = 'BUILDING',
}

export enum ClaimPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateClaimDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(ClaimLocation)
  location: ClaimLocation;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsOptional()
  @IsString()
  locationDetail?: string;

  @IsOptional()
  @IsEnum(ClaimPriority)
  priority?: ClaimPriority = ClaimPriority.NORMAL;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
