import { IsString, IsEnum, IsOptional } from 'class-validator';
import { AuthMethodType } from '../types/auth.types';

export class AuthCredentialsDto {
  @IsString()
  identifier: string;

  @IsEnum(['EMAIL', 'WHATSAPP'])
  identifierType: AuthMethodType;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  verificationCode?: string;
}
