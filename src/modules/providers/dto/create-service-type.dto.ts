import { IsString, IsOptional } from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
