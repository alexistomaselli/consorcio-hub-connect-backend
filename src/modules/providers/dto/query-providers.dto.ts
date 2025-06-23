import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProviderStatus } from '../enum/provider-status.enum';

export class QueryProvidersDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsEnum(ProviderStatus)
  @IsOptional()
  status?: ProviderStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return undefined;
  })
  serviceTypeIds?: string[];

  @IsOptional()
  skip?: number;

  @IsOptional()
  take?: number = 10;
}
