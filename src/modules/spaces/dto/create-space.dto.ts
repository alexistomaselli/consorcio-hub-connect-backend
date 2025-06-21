import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  spaceTypeId: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
