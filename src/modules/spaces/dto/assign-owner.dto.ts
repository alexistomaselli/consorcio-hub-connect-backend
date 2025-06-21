import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AssignOwnerDto {
  @IsUUID()
  @IsNotEmpty()
  ownerId: string;

  @IsBoolean()
  @IsOptional()
  isMain?: boolean = false;
}
